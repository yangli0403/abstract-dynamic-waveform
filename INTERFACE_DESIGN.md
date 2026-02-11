# 实用主义流派 — 接口与数据结构设计文档

> **项目**：抽象动态波形（Abstract Dynamic Waveform）  
> **阶段**：第3阶段 — 接口设计  
> **基于**：ARCHITECTURE.md v3 三段式架构  
> **作者**：Manus AI  
> **日期**：2026-02-11

---

## 1. 设计原则

本接口设计遵循以下核心原则，确保系统的可维护性、可扩展性和易用性：

| 原则 | 描述 | 体现 |
|------|------|------|
| **最小暴露** | 仅暴露用户需要的接口，隐藏内部实现细节 | 主入口类仅12个公共方法 |
| **类型安全** | 所有接口使用TypeScript严格类型定义 | 零`any`类型，完整泛型约束 |
| **不可变数据** | 所有输出数据为只读，防止外部意外修改 | `Readonly<T>`和`ReadonlyArray<T>` |
| **零依赖核心** | 核心接口不引用任何第三方类型 | 仅使用Web标准API类型 |
| **渐进式配置** | 所有配置项都有合理默认值 | `Partial<Config>`模式 |

---

## 2. 类图

![类图](diagrams/class-diagram.png)

上图展示了系统中17个核心类的继承和依赖关系。`AbstractDynamicWaveform`作为主入口类，聚合了`AudioAnalyzer`、`StateMachine`、`AnimationLoop`、`UnifiedLerp`和`IRenderer`五个核心组件。四个特征提取器（Volume/Pitch/Speed/Emotion）从`AudioAnalyzer`获取原始数据，三个映射通道（Color/Shape/Dynamic）将特征转化为视觉参数，`UnifiedLerp`统一处理平滑过渡，最终通过`IRenderer`接口的5个实现类进行渲染。

---

## 3. 核心类型定义

### 3.1 基础类型

```typescript
// ==========================================
// 基础枚举类型
// ==========================================

/** AI代理交互状态 */
type AgentState = 'connecting' | 'initializing' | 'listening' | 'thinking' | 'speaking';

/** 状态转换事件 */
type AgentEvent =
  | 'connected'        // WebRTC连接建立
  | 'initialized'      // 代理就绪
  | 'speech_detected'  // 检测到语音活动
  | 'message_sent'     // 用户发送消息
  | 'ai_responding'    // AI开始回复
  | 'speech_ended'     // 语音结束
  | 'disconnected'     // 连接断开
  | 'reconnect';       // 重新连接

/** 情感类型（6种基础情感） */
type EmotionType = 'happy' | 'sad' | 'calm' | 'angry' | 'excited' | 'neutral';

/** 渲染器类型 */
type RendererType = 'classic' | 'ios9' | 'bar' | 'grid' | 'radial';

/** 波动模式 */
type WavePattern = 'steady' | 'active' | 'slow' | 'shaking' | 'pulsing' | 'breathing';

/** 间距模式 */
type SpacingMode = 'uniform' | 'tight' | 'sparse' | 'irregular' | 'jumping';

/** 波形事件类型 */
type WaveformEvent =
  | 'stateChange'       // 状态变更
  | 'emotionChange'     // 情感变更
  | 'frameUpdate'       // 帧更新
  | 'audioStart'        // 音频开始
  | 'audioStop'         // 音频停止
  | 'rendererChange'    // 渲染器切换
  | 'error';            // 错误事件
```

### 3.2 数据结构

```typescript
// ==========================================
// 第一段：多维音频输入 — 数据结构
// ==========================================

/** 音量特征数据 */
interface VolumeData {
  readonly rms: number;          // RMS均方根振幅 (0.0~1.0)
  readonly peak: number;         // 峰值振幅 (0.0~1.0)
  readonly smoothed: number;     // 平滑后的振幅 (0.0~1.0)
}

/** 音调特征数据 */
interface PitchData {
  readonly frequency: number;    // 基频F0 (Hz)，无检测时为0
  readonly confidence: number;   // 检测置信度 (0.0~1.0)
  readonly changeRate: number;   // 变化率 (dHz/dt)
}

/** 语速特征数据 */
interface SpeedData {
  readonly activityRate: number; // 语音活动率 (0.0~1.0)
  readonly changeRate: number;   // 变化率 (d/dt)
  readonly isActive: boolean;    // 当前是否有语音活动
}

/** 情感特征数据 */
interface EmotionData {
  readonly type: EmotionType;    // 当前情感类型
  readonly confidence: number;   // 分类置信度 (0.0~1.0)
  readonly arousal: number;      // 能量维度 (0.0~1.0)
  readonly valence: number;      // 效价维度 (-1.0~1.0)
}

/** 四维特征向量（每帧输出） */
interface AudioFeatures {
  readonly volume: VolumeData;
  readonly pitch: PitchData;
  readonly speed: SpeedData;
  readonly emotion: EmotionData;
  readonly bands: ReadonlyArray<number>;  // 多频段音量数据
  readonly timestamp: number;             // 时间戳 (ms)
}

// ==========================================
// 第二段：专利映射核心 — 数据结构
// ==========================================

/** HSL颜色值 */
interface HSLColor {
  readonly hue: number;          // 色相 (0~360)
  readonly saturation: number;   // 饱和度 (0~100)
  readonly lightness: number;    // 亮度 (0~100)
}

/** 通道1输出：颜色参数 */
interface ColorParams {
  readonly primary: HSLColor;    // 主色
  readonly secondary: HSLColor;  // 辅色（用于渐变）
  readonly glow: HSLColor;       // 发光色
}

/** 通道2输出：形态参数 */
interface ShapeParams {
  readonly amplitude: number;    // 振幅 (0.0~1.0)
  readonly spacing: number;      // 间距 (px)
  readonly activeCount: number;  // 活跃条数
  readonly variance: number;     // 高度方差 (0.0~1.0)
  readonly spacingMode: SpacingMode; // 间距模式
}

/** 通道3输出：动态参数 */
interface DynamicParams {
  readonly speedMultiplier: number;    // 速度倍率 (0.4~1.8)
  readonly wavePattern: WavePattern;   // 波动模式
  readonly glowIntensity: number;      // 发光强度 (0.0~1.0)
  readonly transitionDuration: number; // 过渡时长 (ms)
}

// ==========================================
// 第三段：情感可视化输出 — 帧数据
// ==========================================

/** 每帧渲染数据（映射核心→渲染器） */
interface FrameData {
  // 状态信息
  readonly state: AgentState;
  readonly timestamp: number;

  // 通道1输出：颜色
  readonly color: ColorParams;

  // 通道2输出：形态
  readonly shape: ShapeParams;

  // 通道3输出：动态
  readonly dynamic: DynamicParams;

  // 原始音频数据（供渲染器直接使用）
  readonly bands: ReadonlyArray<number>;
  readonly highlightedIndices: ReadonlyArray<number>;

  // 动画相位
  readonly phase: number;
}
```

---

## 4. 核心接口定义

### 4.1 主入口类接口

```typescript
/** 波形配置 */
interface WaveformConfig {
  // 渲染器配置
  renderer: RendererType;
  width: number;                    // 容器宽度 (px)，默认 300
  height: number;                   // 容器高度 (px)，默认 150

  // 音频配置
  audio: AudioConfig;

  // 映射核心配置
  mapping: MappingConfig;

  // 动画配置
  animation: AnimationConfig;

  // 初始状态
  initialState: AgentState;         // 默认 'connecting'
  initialEmotion: EmotionType;      // 默认 'neutral'
}

/** 音频配置 */
interface AudioConfig {
  fftSize: number;                  // FFT窗口大小，默认 2048
  smoothingTimeConstant: number;    // 平滑常数 (0.0~1.0)，默认 0.8
  minDecibels: number;              // 最小分贝，默认 -90
  maxDecibels: number;              // 最大分贝，默认 -10
  bandCount: number;                // 频段数量，默认 24
  pitch: PitchConfig;               // 音调检测配置
  vad: VADConfig;                   // 语音活动检测配置
}

/** 音调检测配置 */
interface PitchConfig {
  algorithm: 'autocorrelation' | 'yin';  // 检测算法，默认 'yin'
  minFrequency: number;                   // 最低检测频率 (Hz)，默认 80
  maxFrequency: number;                   // 最高检测频率 (Hz)，默认 600
  confidenceThreshold: number;            // 置信度阈值，默认 0.8
}

/** 语音活动检测配置 */
interface VADConfig {
  threshold: number;                // 能量阈值 (0.0~1.0)，默认 0.01
  windowSize: number;               // 滑动窗口大小 (帧)，默认 30
}

/** 映射核心配置 */
interface MappingConfig {
  // 通道1：情感→颜色
  emotionPresets: Map<EmotionType, EmotionColorPreset>;

  // 通道2：特征→形态
  amplitudeRange: { min: number; max: number };  // 全局振幅范围约束
  spacingRange: { min: number; max: number };     // 间距范围 (px)

  // 通道3：节奏→动态
  speedRange: { min: number; max: number };       // 速度倍率范围
  transitionRange: { min: number; max: number };  // 过渡时长范围 (ms)
}

/** 情感颜色预设 */
interface EmotionColorPreset {
  primary: HSLColor;
  secondary: HSLColor;
  glow: HSLColor;
  amplitudeRange: { min: number; max: number };
  speedMultiplier: number;
  spacingMode: SpacingMode;
  wavePattern: WavePattern;
  glowIntensity: number;
}

/** 动画配置 */
interface AnimationConfig {
  fps: number;                      // 目标帧率，默认 60
  lerpSpeed: number;                // 插值速度 (0.01~1.0)，默认 0.1
}
```

### 4.2 主入口类 API

```typescript
/**
 * AbstractDynamicWaveform — 系统主入口
 *
 * 使用示例：
 * ```typescript
 * const waveform = new AbstractDynamicWaveform(
 *   document.getElementById('container'),
 *   { renderer: 'bar', initialEmotion: 'happy' }
 * );
 * await waveform.start();
 * ```
 */
class AbstractDynamicWaveform {
  /**
   * 构造函数
   * @param container - 挂载的DOM容器元素
   * @param config - 可选配置，所有字段都有默认值
   */
  constructor(container: HTMLElement, config?: Partial<WaveformConfig>);

  // ========== 生命周期 ==========

  /** 启动波形可视化（请求麦克风权限并开始渲染） */
  start(): Promise<void>;

  /** 停止波形可视化（释放麦克风并停止渲染） */
  stop(): void;

  /** 销毁实例，释放所有资源 */
  dispose(): void;

  // ========== 情感控制 ==========

  /** 设置单一情感（通过插值平滑过渡） */
  setEmotion(emotion: EmotionType): void;

  /** 设置混合情感（如 new Map([['happy', 0.7], ['excited', 0.3]])) */
  setBlendedEmotion(emotions: Map<EmotionType, number>): void;

  // ========== 状态控制 ==========

  /** 手动设置代理状态 */
  setState(state: AgentState): void;

  // ========== 渲染器控制 ==========

  /** 切换渲染器类型（运行时热切换） */
  setRenderer(type: RendererType): void;

  // ========== 数据访问 ==========

  /** 获取当前帧数据（只读快照） */
  getFrameData(): Readonly<FrameData>;

  /** 获取当前音频特征（只读快照） */
  getAudioFeatures(): Readonly<AudioFeatures>;

  // ========== 事件系统 ==========

  /** 注册事件监听器 */
  on<E extends WaveformEvent>(event: E, callback: WaveformEventCallback<E>): void;

  /** 移除事件监听器 */
  off<E extends WaveformEvent>(event: E, callback: WaveformEventCallback<E>): void;
}
```

### 4.3 事件回调类型

```typescript
/** 事件回调类型映射 */
type WaveformEventCallback<E extends WaveformEvent> =
  E extends 'stateChange' ? (from: AgentState, to: AgentState) => void :
  E extends 'emotionChange' ? (from: EmotionType, to: EmotionType) => void :
  E extends 'frameUpdate' ? (frame: Readonly<FrameData>) => void :
  E extends 'audioStart' ? () => void :
  E extends 'audioStop' ? () => void :
  E extends 'rendererChange' ? (from: RendererType, to: RendererType) => void :
  E extends 'error' ? (error: WaveformError) => void :
  never;

/** 错误类型 */
interface WaveformError {
  readonly code: WaveformErrorCode;
  readonly message: string;
  readonly cause?: Error;
}

type WaveformErrorCode =
  | 'AUDIO_PERMISSION_DENIED'   // 麦克风权限被拒绝
  | 'AUDIO_NOT_SUPPORTED'       // 浏览器不支持Web Audio API
  | 'RENDERER_MOUNT_FAILED'     // 渲染器挂载失败
  | 'INVALID_CONFIG'            // 配置参数无效
  | 'STATE_TRANSITION_INVALID'; // 无效的状态转换
```

---

## 5. 渲染器接口

### 5.1 IRenderer 接口

```typescript
/**
 * 渲染器接口 — 所有渲染器必须实现
 *
 * 渲染器负责将FrameData转化为可视化输出。
 * 系统通过此接口统一调度，上层代码无需关心底层渲染实现。
 */
interface IRenderer {
  /** 渲染器类型标识 */
  readonly type: RendererType;

  /**
   * 挂载渲染器到指定容器
   * Canvas渲染器创建<canvas>元素，DOM渲染器创建<div>元素树
   */
  mount(container: HTMLElement): void;

  /**
   * 每帧绘制调用（由AnimationLoop在60fps频率下调用）
   * @param frame - 当前帧的完整渲染数据
   */
  draw(frame: Readonly<FrameData>): void;

  /**
   * 状态变更回调
   * 渲染器可根据状态切换动画行为（如thinking状态的扫描动画）
   */
  onStateChange(state: AgentState): void;

  /** 响应容器尺寸变化 */
  resize(): void;

  /** 销毁渲染器，释放DOM元素和事件监听 */
  dispose(): void;
}
```

### 5.2 各渲染器的特有配置

```typescript
/** Canvas渲染器通用配置 */
interface CanvasRendererConfig {
  pixelRatio: number;              // 设备像素比，默认 window.devicePixelRatio
  antialias: boolean;              // 抗锯齿，默认 true
}

/** 经典波形渲染器配置 */
interface ClassicWaveConfig extends CanvasRendererConfig {
  curveCount: number;              // 曲线数量，默认 4
  frequency: number;               // 基础频率，默认 6
  phaseShift: number;              // 相位偏移，默认 -0.1
  lineWidth: number;               // 线宽 (px)，默认 1
}

/** iOS9波形渲染器配置 */
interface iOS9WaveConfig extends CanvasRendererConfig {
  curveCount: number;              // 曲线数量，默认 4
  supportLineCount: number;        // 辅助线数量，默认 2
  globalCompositeOperation: GlobalCompositeOperation; // 混合模式，默认 'lighter'
}

/** 条形渲染器配置 */
interface BarRendererConfig {
  barCount: number;                // 条形数量，默认 24
  barWidth: number;                // 条形宽度 (px)，默认 3
  barRadius: number;               // 条形圆角 (px)，默认 2
  minBarHeight: number;            // 最小高度 (px)，默认 4
  maxBarHeight: number;            // 最大高度 (px)，默认 48
  gap: number;                     // 默认间距 (px)，默认 3
  transitionDuration: string;      // CSS过渡时长，默认 '100ms'
}

/** 网格渲染器配置 */
interface GridRendererConfig {
  rows: number;                    // 行数，默认 5
  cols: number;                    // 列数，默认 10
  cellSize: number;                // 单元格大小 (px)，默认 8
  cellGap: number;                 // 单元格间距 (px)，默认 3
  cellRadius: number;              // 单元格圆角 (px)，默认 2
}

/** 径向渲染器配置 */
interface RadialRendererConfig {
  segmentCount: number;            // 段数，默认 24
  innerRadius: number;             // 内半径 (px)，默认 20
  outerRadius: number;             // 外半径 (px)，默认 60
  rotationSpeed: number;           // 旋转速度 (deg/frame)，默认 0.5
}
```

---

## 6. 映射通道接口

### 6.1 通道1：情感 → 颜色

```typescript
/**
 * 颜色映射通道接口
 *
 * 职责：将EmotionData映射为HSL色彩参数
 * 输入：EmotionData（来自EmotionExtractor）
 * 输出：ColorParams（主色、辅色、发光色）
 */
interface IColorChannel {
  /** 执行映射 */
  map(emotion: EmotionData): ColorParams;

  /** 注册自定义情感颜色预设 */
  registerPreset(emotion: string, preset: EmotionColorPreset): void;

  /** 获取所有已注册的预设 */
  getPresets(): ReadonlyMap<string, EmotionColorPreset>;
}
```

### 6.2 通道2：特征 → 形态

```typescript
/**
 * 形态映射通道接口
 *
 * 职责：将Volume和Pitch映射为波形的静态形态参数
 * 输入：VolumeData + PitchData
 * 输出：ShapeParams（振幅、间距、活跃条数、形变）
 */
interface IShapeChannel {
  /** 执行映射 */
  map(volume: VolumeData, pitch: PitchData): ShapeParams;

  /** 设置振幅范围约束（受情感预设影响） */
  setAmplitudeRange(range: { min: number; max: number }): void;

  /** 设置间距范围约束 */
  setSpacingRange(range: { min: number; max: number }): void;
}
```

### 6.3 通道3：节奏 → 动态

```typescript
/**
 * 动态映射通道接口
 *
 * 职责：将Speed和Volume映射为波形的动态行为参数
 * 输入：SpeedData + VolumeData
 * 输出：DynamicParams（速度倍率、波动模式、发光强度、过渡时长）
 */
interface IDynamicChannel {
  /** 执行映射 */
  map(speed: SpeedData, volume: VolumeData): DynamicParams;

  /** 设置速度倍率范围 */
  setSpeedRange(range: { min: number; max: number }): void;

  /** 注册自定义波动模式 */
  registerPattern(name: string, pattern: WavePatternDefinition): void;
}

/** 波动模式定义 */
interface WavePatternDefinition {
  /** 每帧的振幅调制函数 */
  modulate(phase: number, baseAmplitude: number): number;
  /** 模式描述 */
  description: string;
}
```

### 6.4 全通道插值器

```typescript
/**
 * 全通道插值器接口
 *
 * 职责：对三个通道的输出进行统一的平滑插值
 * 确保所有视觉参数变化的连续性和自然性
 */
interface IUnifiedLerp {
  /**
   * 执行插值
   * @param targetColor - 通道1目标颜色
   * @param targetShape - 通道2目标形态
   * @param targetDynamic - 通道3目标动态
   * @param dt - 距上一帧的时间差 (ms)
   * @returns 插值后的视觉参数
   */
  lerp(
    targetColor: ColorParams,
    targetShape: ShapeParams,
    targetDynamic: DynamicParams,
    dt: number
  ): {
    color: ColorParams;
    shape: ShapeParams;
    dynamic: DynamicParams;
  };

  /** 设置全局插值速度 */
  setLerpSpeed(speed: number): void;

  /** 立即跳转到目标值（跳过插值） */
  snapTo(color: ColorParams, shape: ShapeParams, dynamic: DynamicParams): void;
}
```

---

## 7. 特征提取器接口

### 7.1 音频分析器

```typescript
/**
 * 音频分析器接口
 *
 * 职责：管理Web Audio API连接，提供原始频谱和时域数据
 */
interface IAudioAnalyzer {
  /** 连接麦克风音频流 */
  connect(stream: MediaStream): void;

  /** 获取频域数据（FFT结果） */
  getFrequencyData(): Float32Array;

  /** 获取时域数据（PCM波形） */
  getTimeDomainData(): Float32Array;

  /** 断开音频流 */
  disconnect(): void;

  /** 释放所有资源 */
  dispose(): void;
}
```

### 7.2 四维特征提取器

```typescript
/**
 * 特征提取器通用接口
 */
interface IFeatureExtractor<T> {
  /** 从原始音频数据中提取特征 */
  extract(data: Float32Array): T;

  /** 重置内部状态 */
  reset(): void;
}

/** 音量提取器 */
interface IVolumeExtractor extends IFeatureExtractor<VolumeData> {
  /** 设置平滑因子 */
  setSmoothingFactor(factor: number): void;
}

/** 音调提取器 */
interface IPitchExtractor extends IFeatureExtractor<PitchData> {
  /** 设置检测频率范围 */
  setFrequencyRange(min: number, max: number): void;

  /** 设置置信度阈值 */
  setConfidenceThreshold(threshold: number): void;
}

/** 语速提取器 */
interface ISpeedExtractor extends IFeatureExtractor<SpeedData> {
  /** 设置VAD能量阈值 */
  setThreshold(threshold: number): void;

  /** 设置滑动窗口大小 */
  setWindowSize(size: number): void;
}

/** 情感提取器 */
interface IEmotionExtractor {
  /** 从三维特征中提取情感 */
  extract(volume: VolumeData, pitch: PitchData, speed: SpeedData): EmotionData;

  /** 手动设置情感（覆盖自动检测） */
  setManualEmotion(emotion: EmotionType): void;

  /** 清除手动设置，恢复自动检测 */
  clearManualEmotion(): void;

  /** 重置内部状态 */
  reset(): void;
}
```

---

## 8. 状态机接口

```typescript
/**
 * 状态机接口
 *
 * 职责：管理AI代理的交互状态生命周期
 */
interface IStateMachine {
  /** 获取当前状态 */
  getState(): AgentState;

  /**
   * 触发状态转换
   * @throws 如果事件在当前状态下无效
   */
  transition(event: AgentEvent): void;

  /** 注册状态变更监听器 */
  onStateChange(callback: StateChangeCallback): void;

  /** 移除状态变更监听器 */
  offStateChange(callback: StateChangeCallback): void;

  /** 获取当前状态下允许的事件列表 */
  getAllowedEvents(): ReadonlyArray<AgentEvent>;
}

type StateChangeCallback = (from: AgentState, to: AgentState) => void;

/** 状态转换规则表 */
const STATE_TRANSITIONS: Record<AgentState, Partial<Record<AgentEvent, AgentState>>> = {
  connecting: {
    connected: 'initializing',
    disconnected: 'connecting',  // 重试
  },
  initializing: {
    initialized: 'listening',
    disconnected: 'connecting',
  },
  listening: {
    speech_detected: 'listening',  // 保持
    message_sent: 'thinking',
    disconnected: 'connecting',
  },
  thinking: {
    ai_responding: 'speaking',
    disconnected: 'connecting',
  },
  speaking: {
    speech_ended: 'listening',
    message_sent: 'thinking',     // 用户打断
    disconnected: 'connecting',
  },
};
```

---

## 9. 序列生成器接口

```typescript
/**
 * 序列生成器接口
 *
 * 职责：根据当前状态和渲染器类型生成动画序列
 */
interface ISequenceGenerator {
  /**
   * 生成动画序列
   * @param state - 当前代理状态
   * @param config - 序列配置
   * @returns 动画序列
   */
  generate(state: AgentState, config: SequenceConfig): AnimationSequence;

  /** 获取序列的下一帧 */
  next(): SequenceFrame;

  /** 重置序列到起始位置 */
  reset(): void;
}

interface SequenceConfig {
  rendererType: RendererType;
  barCount?: number;              // 条形渲染器的条数
  gridRows?: number;              // 网格渲染器的行数
  gridCols?: number;              // 网格渲染器的列数
  segmentCount?: number;          // 径向渲染器的段数
}

interface AnimationSequence {
  readonly frames: ReadonlyArray<SequenceFrame>;
  readonly loop: boolean;         // 是否循环
  readonly frameDuration: number; // 每帧持续时间 (ms)
}

interface SequenceFrame {
  readonly highlightedIndices: ReadonlyArray<number>;
  readonly highlightedCoords?: ReadonlyArray<{ x: number; y: number }>;  // 网格渲染器用
}
```

---

## 10. 动画循环接口

```typescript
/**
 * 动画循环接口
 *
 * 职责：以requestAnimationFrame驱动的帧循环
 */
interface IAnimationLoop {
  /** 启动动画循环 */
  start(callback: FrameCallback): void;

  /** 停止动画循环 */
  stop(): void;

  /** 是否正在运行 */
  isRunning(): boolean;

  /** 获取当前FPS */
  getFPS(): number;
}

type FrameCallback = (timestamp: number, deltaTime: number) => void;
```

---

## 11. 框架适配层接口

### 11.1 React Wrapper

```typescript
/**
 * React组件 — 声明式API
 *
 * 使用示例：
 * ```tsx
 * <DynamicWaveform
 *   renderer="bar"
 *   emotion="happy"
 *   state="speaking"
 *   width={300}
 *   height={150}
 *   onStateChange={(from, to) => console.log(`${from} → ${to}`)}
 * />
 * ```
 */
interface DynamicWaveformProps {
  // 渲染配置
  renderer?: RendererType;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;

  // 状态控制
  emotion?: EmotionType;
  blendedEmotions?: Map<EmotionType, number>;
  state?: AgentState;

  // 音频配置
  audioConfig?: Partial<AudioConfig>;
  mappingConfig?: Partial<MappingConfig>;
  animationConfig?: Partial<AnimationConfig>;

  // 事件回调
  onStateChange?: (from: AgentState, to: AgentState) => void;
  onEmotionChange?: (from: EmotionType, to: EmotionType) => void;
  onFrameUpdate?: (frame: Readonly<FrameData>) => void;
  onError?: (error: WaveformError) => void;

  // 引用
  ref?: React.Ref<AbstractDynamicWaveform>;
}

/** React Hook — 命令式API */
function useDynamicWaveform(
  containerRef: React.RefObject<HTMLElement>,
  config?: Partial<WaveformConfig>
): {
  waveform: AbstractDynamicWaveform | null;
  isRunning: boolean;
  currentState: AgentState;
  currentEmotion: EmotionType;
  frameData: Readonly<FrameData> | null;
  start: () => Promise<void>;
  stop: () => void;
};
```

### 11.2 Vue Wrapper

```typescript
/**
 * Vue组件 — 声明式API
 *
 * 使用示例：
 * ```vue
 * <DynamicWaveform
 *   renderer="bar"
 *   :emotion="currentEmotion"
 *   :state="agentState"
 *   @state-change="onStateChange"
 * />
 * ```
 */
interface DynamicWaveformVueProps {
  renderer?: RendererType;
  width?: number;
  height?: number;
  emotion?: EmotionType;
  state?: AgentState;
  audioConfig?: Partial<AudioConfig>;
  mappingConfig?: Partial<MappingConfig>;
}

/** Vue Composable — 命令式API */
function useDynamicWaveform(
  containerRef: Ref<HTMLElement | null>,
  config?: Partial<WaveformConfig>
): {
  waveform: Ref<AbstractDynamicWaveform | null>;
  isRunning: Ref<boolean>;
  currentState: Ref<AgentState>;
  currentEmotion: Ref<EmotionType>;
  frameData: Ref<Readonly<FrameData> | null>;
  start: () => Promise<void>;
  stop: () => void;
};
```

---

## 12. 错误处理规范

系统采用统一的错误处理策略，所有错误通过事件系统传播，不抛出未捕获异常：

| 错误码 | 触发场景 | 恢复策略 |
|--------|---------|---------|
| `AUDIO_PERMISSION_DENIED` | 用户拒绝麦克风权限 | 提示用户授权，提供静默模式降级 |
| `AUDIO_NOT_SUPPORTED` | 浏览器不支持Web Audio API | 显示静态波形作为降级方案 |
| `RENDERER_MOUNT_FAILED` | 容器元素不存在或不可用 | 抛出错误事件，停止渲染 |
| `INVALID_CONFIG` | 配置参数超出有效范围 | 使用默认值替代，发出警告事件 |
| `STATE_TRANSITION_INVALID` | 当前状态不允许该事件 | 忽略事件，发出警告日志 |

---

## 13. 默认配置值

以下是所有配置项的默认值，用户只需覆盖需要修改的部分：

```typescript
const DEFAULT_CONFIG: WaveformConfig = {
  renderer: 'bar',
  width: 300,
  height: 150,
  audio: {
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    minDecibels: -90,
    maxDecibels: -10,
    bandCount: 24,
    pitch: {
      algorithm: 'yin',
      minFrequency: 80,
      maxFrequency: 600,
      confidenceThreshold: 0.8,
    },
    vad: {
      threshold: 0.01,
      windowSize: 30,
    },
  },
  mapping: {
    emotionPresets: new Map([
      ['happy',   { primary: { hue: 180, saturation: 90, lightness: 85 },
                    secondary: { hue: 170, saturation: 80, lightness: 75 },
                    glow: { hue: 180, saturation: 100, lightness: 90 },
                    amplitudeRange: { min: 0.8, max: 1.0 },
                    speedMultiplier: 1.2, spacingMode: 'tight',
                    wavePattern: 'active', glowIntensity: 0.8 }],
      ['sad',     { primary: { hue: 270, saturation: 60, lightness: 55 },
                    secondary: { hue: 280, saturation: 50, lightness: 45 },
                    glow: { hue: 270, saturation: 70, lightness: 60 },
                    amplitudeRange: { min: 0.3, max: 0.6 },
                    speedMultiplier: 0.6, spacingMode: 'sparse',
                    wavePattern: 'slow', glowIntensity: 0.3 }],
      ['calm',    { primary: { hue: 0, saturation: 10, lightness: 70 },
                    secondary: { hue: 0, saturation: 5, lightness: 60 },
                    glow: { hue: 0, saturation: 15, lightness: 80 },
                    amplitudeRange: { min: 0.1, max: 0.3 },
                    speedMultiplier: 0.4, spacingMode: 'uniform',
                    wavePattern: 'breathing', glowIntensity: 0.1 }],
      ['angry',   { primary: { hue: 0, saturation: 95, lightness: 60 },
                    secondary: { hue: 10, saturation: 90, lightness: 50 },
                    glow: { hue: 0, saturation: 100, lightness: 70 },
                    amplitudeRange: { min: 0.9, max: 1.0 },
                    speedMultiplier: 1.5, spacingMode: 'irregular',
                    wavePattern: 'shaking', glowIntensity: 1.0 }],
      ['excited', { primary: { hue: 60, saturation: 85, lightness: 80 },
                    secondary: { hue: 50, saturation: 80, lightness: 70 },
                    glow: { hue: 60, saturation: 90, lightness: 85 },
                    amplitudeRange: { min: 0.7, max: 1.0 },
                    speedMultiplier: 1.8, spacingMode: 'jumping',
                    wavePattern: 'pulsing', glowIntensity: 0.9 }],
      ['neutral', { primary: { hue: 210, saturation: 30, lightness: 50 },
                    secondary: { hue: 220, saturation: 25, lightness: 40 },
                    glow: { hue: 210, saturation: 35, lightness: 55 },
                    amplitudeRange: { min: 0.2, max: 0.4 },
                    speedMultiplier: 0.8, spacingMode: 'uniform',
                    wavePattern: 'breathing', glowIntensity: 0.2 }],
    ]),
    amplitudeRange: { min: 0.0, max: 1.0 },
    spacingRange: { min: 1, max: 10 },
    speedRange: { min: 0.4, max: 1.8 },
    transitionRange: { min: 200, max: 800 },
  },
  animation: {
    fps: 60,
    lerpSpeed: 0.1,
  },
  initialState: 'connecting',
  initialEmotion: 'neutral',
};
```

---

## 14. 代码框架结构

基于以上接口设计，项目的源代码目录结构如下：

```
src/
├── index.ts                          # 主入口，导出AbstractDynamicWaveform
├── types/
│   ├── index.ts                      # 所有类型定义的统一导出
│   ├── base.ts                       # 基础枚举和类型
│   ├── audio.ts                      # 音频相关类型
│   ├── mapping.ts                    # 映射相关类型
│   ├── rendering.ts                  # 渲染相关类型
│   └── events.ts                     # 事件相关类型
├── core/
│   ├── AbstractDynamicWaveform.ts    # 主入口类实现
│   ├── StateMachine.ts              # 状态机实现
│   ├── AnimationLoop.ts             # 动画循环实现
│   └── config.ts                    # 默认配置
├── audio/
│   ├── AudioAnalyzer.ts             # 音频分析器
│   ├── VolumeExtractor.ts           # 音量特征提取
│   ├── PitchExtractor.ts            # 音调特征提取
│   ├── SpeedExtractor.ts            # 语速特征提取
│   ├── EmotionExtractor.ts          # 情感特征提取
│   └── MultibandProcessor.ts        # 多频段处理器
├── mapping/
│   ├── ColorChannel.ts              # 通道1：情感→颜色
│   ├── ShapeChannel.ts              # 通道2：特征→形态
│   ├── DynamicChannel.ts            # 通道3：节奏→动态
│   └── UnifiedLerp.ts              # 全通道插值器
├── rendering/
│   ├── IRenderer.ts                 # 渲染器接口
│   ├── ClassicWaveRenderer.ts       # 经典波形渲染器
│   ├── iOS9WaveRenderer.ts          # iOS9波形渲染器
│   ├── BarRenderer.ts               # 条形渲染器
│   ├── GridRenderer.ts              # 网格渲染器
│   ├── RadialRenderer.ts            # 径向渲染器
│   └── SequenceGenerator.ts         # 序列生成器
├── adapters/
│   ├── react/
│   │   ├── DynamicWaveform.tsx      # React组件
│   │   └── useDynamicWaveform.ts    # React Hook
│   └── vue/
│       ├── DynamicWaveform.vue      # Vue组件
│       └── useDynamicWaveform.ts    # Vue Composable
└── utils/
    ├── lerp.ts                      # 插值工具函数
    ├── hsl.ts                       # HSL色彩工具函数
    └── math.ts                      # 数学工具函数
```

---

## 15. 使用示例

### 15.1 最简用法（5行代码）

```typescript
import { AbstractDynamicWaveform } from 'abstract-dynamic-waveform';

const waveform = new AbstractDynamicWaveform(
  document.getElementById('container')!
);
await waveform.start();
```

### 15.2 完整配置用法

```typescript
import { AbstractDynamicWaveform } from 'abstract-dynamic-waveform';

const waveform = new AbstractDynamicWaveform(
  document.getElementById('container')!,
  {
    renderer: 'bar',
    width: 400,
    height: 200,
    initialEmotion: 'happy',
    mapping: {
      amplitudeRange: { min: 0.0, max: 1.0 },
      speedRange: { min: 0.5, max: 1.5 },
    },
    animation: {
      fps: 60,
      lerpSpeed: 0.15,
    },
  }
);

// 注册事件
waveform.on('stateChange', (from, to) => {
  console.log(`状态变更: ${from} → ${to}`);
});

waveform.on('emotionChange', (from, to) => {
  console.log(`情感变更: ${from} → ${to}`);
});

// 启动
await waveform.start();

// 运行时控制
waveform.setEmotion('happy');
waveform.setState('speaking');
waveform.setRenderer('grid');

// 混合情感
waveform.setBlendedEmotion(new Map([
  ['happy', 0.7],
  ['excited', 0.3],
]));

// 清理
waveform.dispose();
```

### 15.3 React用法

```tsx
import { DynamicWaveform } from 'abstract-dynamic-waveform/react';

function VoiceAssistant() {
  const [emotion, setEmotion] = useState<EmotionType>('neutral');
  const [state, setState] = useState<AgentState>('connecting');

  return (
    <DynamicWaveform
      renderer="bar"
      emotion={emotion}
      state={state}
      width={300}
      height={150}
      onStateChange={(from, to) => setState(to)}
      onEmotionChange={(from, to) => setEmotion(to)}
    />
  );
}
```

---

## 16. 下一步计划

第3阶段的接口设计为后续实现提供了完整的代码契约。第4阶段（实现）将按以下优先级开发：

第一优先级为核心引擎模块，包括AudioAnalyzer、四维特征提取器、StateMachine和AnimationLoop。第二优先级为映射核心模块，包括三个映射通道（ColorChannel、ShapeChannel、DynamicChannel）和UnifiedLerp。第三优先级为渲染器实现，首先实现BarRenderer（对应用户截图效果），然后依次实现ClassicWaveRenderer、iOS9WaveRenderer、GridRenderer和RadialRenderer。第四优先级为框架适配层，包括React Wrapper和Vue Wrapper。

---

## 参考文献

[1] SiriWave.js 源代码: https://github.com/kopiro/siriwave
[2] LiveKit Agents UI 源代码: https://github.com/livekit-examples/agent-starter-react
[3] Web Audio API 规范: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
[4] TypeScript 官方文档: https://www.typescriptlang.org/docs/
[5] YIN 音调检测算法: https://en.wikipedia.org/wiki/Yin_(algorithm)
