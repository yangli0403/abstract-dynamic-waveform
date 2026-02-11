/**
 * 形态映射通道（通道2）
 *
 * 职责：将Volume和Pitch映射为波形的静态形态参数。
 * 映射规则：特征 → 形态 (Shape)
 *
 * 音量决定振幅和活跃条数，音调决定间距和方差。
 */

import type { VolumeData, PitchData, ShapeParams, SpacingMode, EmotionColorPreset } from '../types';
import { clamp, mapRange } from '../utils/math';

export class ShapeChannel {
  private _amplitudeRange: { min: number; max: number };
  private _spacingRange: { min: number; max: number };
  private _barCount: number;
  private _currentSpacingMode: SpacingMode = 'uniform';

  constructor(
    amplitudeRange: { min: number; max: number } = { min: 0.0, max: 1.0 },
    spacingRange: { min: number; max: number } = { min: 1, max: 10 },
    barCount: number = 24
  ) {
    this._amplitudeRange = amplitudeRange;
    this._spacingRange = spacingRange;
    this._barCount = barCount;
  }

  /** 根据音量和音调映射形态参数 */
  map(volume: VolumeData, pitch: PitchData): ShapeParams {
    // 振幅：直接由音量RMS驱动，受范围约束
    const amplitude = clamp(
      mapRange(volume.smoothed, 0, 1, this._amplitudeRange.min, this._amplitudeRange.max),
      0, 1
    );

    // 间距：由音调频率影响（高音调→紧密，低音调→稀疏）
    let spacing: number;
    if (pitch.frequency > 0 && pitch.confidence > 0.5) {
      // 频率越高，间距越小
      spacing = mapRange(
        clamp(pitch.frequency, 80, 600),
        80, 600,
        this._spacingRange.max, this._spacingRange.min
      );
    } else {
      // 无有效音调时使用中间值
      spacing = (this._spacingRange.min + this._spacingRange.max) / 2;
    }

    // 活跃条数：由音量峰值决定
    const activeCount = Math.round(
      mapRange(volume.peak, 0, 1, Math.floor(this._barCount * 0.3), this._barCount)
    );

    // 方差：由音调变化率决定（变化越大，高度差异越大）
    const variance = pitch.confidence > 0.5
      ? clamp(Math.abs(pitch.changeRate) / 200, 0, 1)
      : 0.2;

    return {
      amplitude,
      spacing,
      activeCount,
      variance,
      spacingMode: this._currentSpacingMode,
    };
  }

  /** 应用情感预设的形态约束 */
  applyEmotionPreset(preset: EmotionColorPreset): void {
    this._amplitudeRange = preset.amplitudeRange;
    this._currentSpacingMode = preset.spacingMode;
  }

  /** 设置振幅范围约束 */
  setAmplitudeRange(range: { min: number; max: number }): void {
    this._amplitudeRange = range;
  }

  /** 设置间距范围约束 */
  setSpacingRange(range: { min: number; max: number }): void {
    this._spacingRange = range;
  }

  /** 设置条形数量 */
  setBarCount(count: number): void {
    this._barCount = Math.max(1, count);
  }
}
