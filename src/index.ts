/**
 * AbstractDynamicWaveform - 主入口类
 *
 * 抽象动态波形可视化引擎。
 * 融合SiriWave.js的高性能渲染和LiveKit Agents UI的完善状态机，
 * 并新增三通道情感映射系统。
 *
 * 三段式架构：
 * 1. 多维音频输入（Volume/Pitch/Speed/Emotion）
 * 2. 专利映射核心（情感→颜色、特征→形态、节奏→动态）
 * 3. 情感可视化输出（5种渲染器）
 */

import type {
  AgentState, AgentEvent, EmotionType, RendererType, WaveformEvent,
  AudioFeatures, FrameData,
} from './types';
import type { WaveformEventCallback } from './types';
import type { WaveformConfig } from './core/config';
import { DEFAULT_CONFIG, EMOTION_PRESETS } from './core/config';
import { StateMachine } from './core/StateMachine';
import { AnimationLoop } from './core/AnimationLoop';
import { AudioAnalyzer } from './audio/AudioAnalyzer';
import { VolumeExtractor } from './audio/VolumeExtractor';
import { PitchExtractor } from './audio/PitchExtractor';
import { SpeedExtractor } from './audio/SpeedExtractor';
import { EmotionExtractor } from './audio/EmotionExtractor';
import { MultibandProcessor } from './audio/MultibandProcessor';
import { ColorChannel } from './mapping/ColorChannel';
import { ShapeChannel } from './mapping/ShapeChannel';
import { DynamicChannel } from './mapping/DynamicChannel';
import { UnifiedLerp } from './mapping/UnifiedLerp';
import { SequenceGenerator } from './rendering/SequenceGenerator';
import type { IRenderer } from './rendering/IRenderer';
import { BarRenderer } from './rendering/BarRenderer';
import { ClassicWaveRenderer } from './rendering/ClassicWaveRenderer';
import { iOS9WaveRenderer } from './rendering/iOS9WaveRenderer';
import { GridRenderer } from './rendering/GridRenderer';
import { RadialRenderer } from './rendering/RadialRenderer';

export class AbstractDynamicWaveform {
  // 配置
  private _config: WaveformConfig;

  // 核心模块
  private _stateMachine: StateMachine;
  private _animationLoop: AnimationLoop;

  // 第一段：音频输入
  private _audioAnalyzer: AudioAnalyzer;
  private _volumeExtractor: VolumeExtractor;
  private _pitchExtractor: PitchExtractor;
  private _speedExtractor: SpeedExtractor;
  private _emotionExtractor: EmotionExtractor;
  private _multibandProcessor: MultibandProcessor;

  // 第二段：映射核心
  private _colorChannel: ColorChannel;
  private _shapeChannel: ShapeChannel;
  private _dynamicChannel: DynamicChannel;
  private _unifiedLerp: UnifiedLerp;

  // 第三段：渲染输出
  private _renderer: IRenderer | null = null;
  private _sequenceGenerator: SequenceGenerator;
  private _currentSequenceFrame: number = 0;
  private _sequenceTimer: number = 0;

  // 状态
  private _container: HTMLElement | null = null;
  private _phase: number = 0;
  private _isAudioConnected: boolean = false;
  private _lastFrameData: FrameData | null = null;
  private _lastAudioFeatures: AudioFeatures | null = null;

  // 事件系统
  private _eventListeners: Map<WaveformEvent, Set<Function>> = new Map();

  constructor(config?: Partial<WaveformConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };

    // 初始化核心模块
    this._stateMachine = new StateMachine(this._config.initialState);
    this._animationLoop = new AnimationLoop();

    // 初始化音频模块
    this._audioAnalyzer = new AudioAnalyzer(this._config.audio);
    this._volumeExtractor = new VolumeExtractor(
      this._config.audio.smoothingTimeConstant,
      this._config.audio.minDecibels,
      this._config.audio.maxDecibels
    );
    this._pitchExtractor = new PitchExtractor(44100, this._config.audio.pitch);
    this._speedExtractor = new SpeedExtractor(
      this._config.audio.vad,
      this._config.audio.minDecibels,
      this._config.audio.maxDecibels
    );
    this._emotionExtractor = new EmotionExtractor();
    this._multibandProcessor = new MultibandProcessor(this._config.audio.bandCount);

    // 初始化映射模块
    this._colorChannel = new ColorChannel(this._config.mapping.emotionPresets);
    this._shapeChannel = new ShapeChannel(
      this._config.mapping.amplitudeRange,
      this._config.mapping.spacingRange,
      this._config.audio.bandCount
    );
    this._dynamicChannel = new DynamicChannel(
      this._config.mapping.speedRange,
      this._config.mapping.transitionRange
    );
    this._unifiedLerp = new UnifiedLerp(this._config.animation.lerpSpeed);

    // 初始化序列生成器
    this._sequenceGenerator = new SequenceGenerator({
      rendererType: this._config.renderer,
      barCount: this._config.audio.bandCount,
    });

    // 监听状态变化
    this._stateMachine.onStateChange((from, to) => {
      this._onStateChange(from, to);
    });

    // 应用初始情感预设
    this._applyEmotionPreset(this._config.initialEmotion);
  }

  // ==================== 生命周期 API ====================

  /** 挂载到DOM容器并启动动画 */
  mount(container: HTMLElement): void {
    this._container = container;
    this._renderer = this._createRenderer(this._config.renderer);
    this._renderer.mount(container);

    this._animationLoop.start(this._onFrame.bind(this));
  }

  /** 连接音频流 */
  connectAudio(stream: MediaStream): void {
    this._audioAnalyzer.connect(stream);
    this._pitchExtractor = new PitchExtractor(
      this._audioAnalyzer.getSampleRate(),
      this._config.audio.pitch
    );
    this._isAudioConnected = true;
    this._emit('audioStart');
  }

  /** 断开音频流 */
  disconnectAudio(): void {
    this._audioAnalyzer.disconnect();
    this._isAudioConnected = false;
    this._emit('audioStop');
  }

  /** 销毁实例 */
  dispose(): void {
    this._animationLoop.dispose();
    this._audioAnalyzer.dispose();
    this._stateMachine.dispose();
    this._renderer?.dispose();
    this._eventListeners.clear();
    this._container = null;
  }

  // ==================== 状态 API ====================

  /** 获取当前状态 */
  getState(): AgentState {
    return this._stateMachine.getState();
  }

  /** 触发状态转换事件 */
  transition(event: AgentEvent): boolean {
    return this._stateMachine.transition(event);
  }

  /** 强制设置状态 */
  setState(state: AgentState): void {
    this._stateMachine.forceState(state);
  }

  // ==================== 情感 API ====================

  /** 获取当前情感 */
  getEmotion(): EmotionType {
    return this._emotionExtractor.getCurrentEmotion();
  }

  /** 手动设置情感 */
  setEmotion(emotion: EmotionType): void {
    const prevEmotion = this._emotionExtractor.getCurrentEmotion();
    this._emotionExtractor.setManualEmotion(emotion);
    this._applyEmotionPreset(emotion);
    if (prevEmotion !== emotion) {
      this._emit('emotionChange', prevEmotion, emotion);
    }
  }

  /** 设置混合情感（如 new Map([['happy', 0.7], ['excited', 0.3]])) */
  setBlendedEmotion(emotions: Map<EmotionType, number>): void {
    // 按权重混合情感颜色预设
    // 选择权重最高的情感作为主情感
    let maxWeight = 0;
    let dominantEmotion: EmotionType = 'neutral';
    for (const [emotion, weight] of emotions) {
      if (weight > maxWeight) {
        maxWeight = weight;
        dominantEmotion = emotion;
      }
    }
    this.setEmotion(dominantEmotion);
  }

  /** 清除手动情感，恢复自动检测 */
  clearEmotion(): void {
    this._emotionExtractor.clearManualEmotion();
  }

  // ==================== 数据访问 API ====================

  /** 获取当前帧数据（只读快照） */
  getFrameData(): Readonly<FrameData> | null {
    return this._lastFrameData;
  }

  /** 获取当前音频特征（只读快照） */
  getAudioFeatures(): Readonly<AudioFeatures> | null {
    return this._lastAudioFeatures;
  }

  // ==================== 渲染器 API ====================

  /** 切换渲染器 */
  setRenderer(type: RendererType): void {
    if (!this._container) return;
    const prevType = this._renderer?.type;

    this._renderer?.dispose();
    this._renderer = this._createRenderer(type);
    this._renderer.mount(this._container);

    this._sequenceGenerator.updateConfig({ rendererType: type });

    if (prevType && prevType !== type) {
      this._emit('rendererChange', prevType, type);
    }
  }

  // ==================== 事件 API ====================

  /** 注册事件监听器 */
  on<E extends WaveformEvent>(event: E, callback: WaveformEventCallback<E>): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event)!.add(callback);
  }

  /** 移除事件监听器 */
  off<E extends WaveformEvent>(event: E, callback: WaveformEventCallback<E>): void {
    this._eventListeners.get(event)?.delete(callback);
  }

  // ==================== 内部方法 ====================

  /** 每帧回调 */
  private _onFrame(timestamp: number, deltaTime: number): void {
    this._phase += deltaTime * 0.001;

    // 第一段：提取音频特征
    const features = this._extractAudioFeatures();

    // 第二段：三通道映射
    const targetColor = this._colorChannel.map(features.emotion);
    const targetShape = this._shapeChannel.map(features.volume, features.pitch);
    const targetDynamic = this._dynamicChannel.map(features.speed, features.volume);

    // 全通道插值
    const { color, shape, dynamic } = this._unifiedLerp.lerp(
      targetColor, targetShape, targetDynamic, deltaTime
    );

    // 更新序列帧
    const sequence = this._sequenceGenerator.generate(this._stateMachine.getState());
    this._sequenceTimer += deltaTime;
    if (this._sequenceTimer >= sequence.frameDuration) {
      this._sequenceTimer = 0;
      this._currentSequenceFrame = (this._currentSequenceFrame + 1) % sequence.frames.length;
    }
    const currentFrame = sequence.frames[this._currentSequenceFrame] ?? { highlightedIndices: [] };

    // 第三段：构建FrameData并渲染
    const frameData: FrameData = {
      state: this._stateMachine.getState(),
      timestamp,
      color,
      shape,
      dynamic,
      bands: features.bands,
      highlightedIndices: currentFrame.highlightedIndices,
      phase: this._phase,
    };

    this._lastFrameData = frameData;
    this._lastAudioFeatures = features;
    this._renderer?.draw(frameData);
    this._emit('frameUpdate', frameData);
  }

  /** 提取四维音频特征 */
  private _extractAudioFeatures(): AudioFeatures {
    if (!this._isAudioConnected) {
      // 无音频时返回默认值
      return {
        volume: { rms: 0, peak: 0, smoothed: 0 },
        pitch: { frequency: 0, confidence: 0, changeRate: 0 },
        speed: { activityRate: 0, changeRate: 0, isActive: false },
        emotion: {
          type: this._emotionExtractor.getCurrentEmotion(),
          confidence: 1,
          arousal: 0.3,
          valence: 0,
        },
        bands: new Array(this._config.audio.bandCount).fill(0),
        timestamp: performance.now(),
      };
    }

    const frequencyData = this._audioAnalyzer.getFrequencyData();
    const timeDomainData = this._audioAnalyzer.getTimeDomainData();

    const volume = this._volumeExtractor.extract(frequencyData);
    const pitch = this._pitchExtractor.extract(timeDomainData);
    const speed = this._speedExtractor.extract(frequencyData);
    const emotion = this._emotionExtractor.extract(volume, pitch, speed);
    const bands = this._multibandProcessor.process(frequencyData);

    return { volume, pitch, speed, emotion, bands, timestamp: performance.now() };
  }

  /** 状态变更处理 */
  private _onStateChange(from: AgentState, to: AgentState): void {
    this._renderer?.onStateChange(to);
    this._currentSequenceFrame = 0;
    this._sequenceTimer = 0;
    this._emit('stateChange', from, to);
  }

  /** 应用情感预设 */
  private _applyEmotionPreset(emotion: EmotionType): void {
    const preset = EMOTION_PRESETS.get(emotion);
    if (preset) {
      this._shapeChannel.applyEmotionPreset(preset);
      this._dynamicChannel.applyEmotionPreset(preset);
    }
  }

  /** 创建渲染器实例 */
  private _createRenderer(type: RendererType): IRenderer {
    switch (type) {
      case 'bar': return new BarRenderer();
      case 'classic': return new ClassicWaveRenderer();
      case 'ios9': return new iOS9WaveRenderer();
      case 'grid': return new GridRenderer();
      case 'radial': return new RadialRenderer();
      default: return new BarRenderer();
    }
  }

  /** 触发事件 */
  private _emit(event: WaveformEvent, ...args: any[]): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (err) {
          console.error(`[AbstractDynamicWaveform] 事件 ${event} 处理出错:`, err);
        }
      }
    }
  }
}

// 导出所有公共类型和模块
export * from './types';
export { EMOTION_PRESETS, DEFAULT_CONFIG } from './core/config';
export type { WaveformConfig } from './core/config';
export { StateMachine } from './core/StateMachine';
export { AnimationLoop } from './core/AnimationLoop';
export { AudioAnalyzer } from './audio/AudioAnalyzer';
export { VolumeExtractor } from './audio/VolumeExtractor';
export { PitchExtractor } from './audio/PitchExtractor';
export { SpeedExtractor } from './audio/SpeedExtractor';
export { EmotionExtractor } from './audio/EmotionExtractor';
export { MultibandProcessor } from './audio/MultibandProcessor';
export { ColorChannel } from './mapping/ColorChannel';
export { ShapeChannel } from './mapping/ShapeChannel';
export { DynamicChannel } from './mapping/DynamicChannel';
export { UnifiedLerp } from './mapping/UnifiedLerp';
export type { IRenderer } from './rendering/IRenderer';
export { BarRenderer } from './rendering/BarRenderer';
export { ClassicWaveRenderer } from './rendering/ClassicWaveRenderer';
export { iOS9WaveRenderer } from './rendering/iOS9WaveRenderer';
export { GridRenderer } from './rendering/GridRenderer';
export { RadialRenderer } from './rendering/RadialRenderer';
export { SequenceGenerator } from './rendering/SequenceGenerator';
