/**
 * 映射相关类型定义
 *
 * 定义了专利映射核心（第二段）的所有数据结构。
 * 三通道映射：情感→颜色、特征→形态、节奏→动态
 */

import type { EmotionType, SpacingMode, WavePattern } from './base';

/** HSL颜色值 */
export interface HSLColor {
  readonly hue: number;
  readonly saturation: number;
  readonly lightness: number;
}

/** 通道1输出：颜色参数 */
export interface ColorParams {
  readonly primary: HSLColor;
  readonly secondary: HSLColor;
  readonly glow: HSLColor;
}

/** 通道2输出：形态参数 */
export interface ShapeParams {
  readonly amplitude: number;
  readonly spacing: number;
  readonly activeCount: number;
  readonly variance: number;
  readonly spacingMode: SpacingMode;
}

/** 通道3输出：动态参数 */
export interface DynamicParams {
  readonly speedMultiplier: number;
  readonly wavePattern: WavePattern;
  readonly glowIntensity: number;
  readonly transitionDuration: number;
}

/** 情感颜色预设 */
export interface EmotionColorPreset {
  primary: HSLColor;
  secondary: HSLColor;
  glow: HSLColor;
  amplitudeRange: { min: number; max: number };
  speedMultiplier: number;
  spacingMode: SpacingMode;
  wavePattern: WavePattern;
  glowIntensity: number;
}

/** 映射核心配置 */
export interface MappingConfig {
  emotionPresets: Map<EmotionType, EmotionColorPreset>;
  amplitudeRange: { min: number; max: number };
  spacingRange: { min: number; max: number };
  speedRange: { min: number; max: number };
  transitionRange: { min: number; max: number };
}

/** 波动模式定义 */
export interface WavePatternDefinition {
  modulate(phase: number, baseAmplitude: number): number;
  description: string;
}
