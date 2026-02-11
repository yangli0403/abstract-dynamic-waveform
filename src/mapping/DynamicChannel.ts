/**
 * 动态映射通道（通道3）
 *
 * 职责：将Speed和Volume映射为波形的动态行为参数。
 * 映射规则：节奏 → 动态 (Dynamic)
 *
 * 语速决定速度倍率和波动模式，音量决定发光强度。
 */

import type { SpeedData, VolumeData, DynamicParams, WavePattern, EmotionColorPreset } from '../types';
import type { WavePatternDefinition } from '../types';
import { clamp, mapRange } from '../utils/math';

/** 内置波动模式定义 */
const BUILT_IN_PATTERNS: Record<WavePattern, WavePatternDefinition> = {
  steady: {
    modulate: (_phase: number, baseAmplitude: number) => baseAmplitude,
    description: '稳定不变',
  },
  active: {
    modulate: (phase: number, baseAmplitude: number) =>
      baseAmplitude * (0.8 + 0.2 * Math.sin(phase * 8)),
    description: '活跃跳动',
  },
  slow: {
    modulate: (phase: number, baseAmplitude: number) =>
      baseAmplitude * (0.7 + 0.3 * Math.sin(phase * 2)),
    description: '缓慢起伏',
  },
  shaking: {
    modulate: (phase: number, baseAmplitude: number) =>
      baseAmplitude * (0.6 + 0.4 * Math.sin(phase * 15 + Math.random() * 0.5)),
    description: '剧烈抖动',
  },
  pulsing: {
    modulate: (phase: number, baseAmplitude: number) =>
      baseAmplitude * (0.5 + 0.5 * Math.abs(Math.sin(phase * 6))),
    description: '快速脉冲',
  },
  breathing: {
    modulate: (phase: number, baseAmplitude: number) =>
      baseAmplitude * (0.8 + 0.2 * Math.sin(phase * 1.5)),
    description: '平稳呼吸',
  },
};

export class DynamicChannel {
  private _speedRange: { min: number; max: number };
  private _transitionRange: { min: number; max: number };
  private _patterns: Map<string, WavePatternDefinition>;
  private _currentPattern: WavePattern = 'breathing';
  private _currentSpeedMultiplier: number = 0.8;

  constructor(
    speedRange: { min: number; max: number } = { min: 0.4, max: 1.8 },
    transitionRange: { min: number; max: number } = { min: 200, max: 800 }
  ) {
    this._speedRange = speedRange;
    this._transitionRange = transitionRange;
    this._patterns = new Map(Object.entries(BUILT_IN_PATTERNS));
  }

  /** 根据语速和音量映射动态参数 */
  map(speed: SpeedData, volume: VolumeData): DynamicParams {
    // 速度倍率：由语速活动率驱动
    const speedMultiplier = mapRange(
      speed.activityRate,
      0, 1,
      this._speedRange.min, this._speedRange.max
    );

    // 发光强度：由音量峰值驱动
    const glowIntensity = clamp(volume.peak * 1.2, 0, 1);

    // 过渡时长：语速越快，过渡越短
    const transitionDuration = mapRange(
      speed.activityRate,
      0, 1,
      this._transitionRange.max, this._transitionRange.min
    );

    return {
      speedMultiplier: clamp(speedMultiplier, this._speedRange.min, this._speedRange.max),
      wavePattern: this._currentPattern,
      glowIntensity,
      transitionDuration,
    };
  }

  /** 获取波动模式的调制函数 */
  getPatternModulator(pattern: WavePattern): WavePatternDefinition {
    return this._patterns.get(pattern) ?? BUILT_IN_PATTERNS.breathing;
  }

  /** 应用情感预设的动态约束 */
  applyEmotionPreset(preset: EmotionColorPreset): void {
    this._currentPattern = preset.wavePattern;
    this._currentSpeedMultiplier = preset.speedMultiplier;
  }

  /** 设置速度倍率范围 */
  setSpeedRange(range: { min: number; max: number }): void {
    this._speedRange = range;
  }

  /** 注册自定义波动模式 */
  registerPattern(name: string, pattern: WavePatternDefinition): void {
    this._patterns.set(name, pattern);
  }
}
