/**
 * 默认配置
 *
 * 所有配置项的默认值，包含6种情感预设的完整参数。
 * 用户只需覆盖需要修改的部分。
 */

import type { EmotionType, WaveformConfig } from '../types';
import type { EmotionColorPreset } from '../types';

/** 6种情感颜色预设 */
export const EMOTION_PRESETS: Map<EmotionType, EmotionColorPreset> = new Map([
  ['happy', {
    primary: { hue: 180, saturation: 90, lightness: 85 },
    secondary: { hue: 170, saturation: 80, lightness: 75 },
    glow: { hue: 180, saturation: 100, lightness: 90 },
    amplitudeRange: { min: 0.8, max: 1.0 },
    speedMultiplier: 1.2,
    spacingMode: 'tight' as const,
    wavePattern: 'active' as const,
    glowIntensity: 0.8,
  }],
  ['sad', {
    primary: { hue: 270, saturation: 60, lightness: 55 },
    secondary: { hue: 280, saturation: 50, lightness: 45 },
    glow: { hue: 270, saturation: 70, lightness: 60 },
    amplitudeRange: { min: 0.3, max: 0.6 },
    speedMultiplier: 0.6,
    spacingMode: 'sparse' as const,
    wavePattern: 'slow' as const,
    glowIntensity: 0.3,
  }],
  ['calm', {
    primary: { hue: 0, saturation: 10, lightness: 70 },
    secondary: { hue: 0, saturation: 5, lightness: 60 },
    glow: { hue: 0, saturation: 15, lightness: 80 },
    amplitudeRange: { min: 0.1, max: 0.3 },
    speedMultiplier: 0.4,
    spacingMode: 'uniform' as const,
    wavePattern: 'breathing' as const,
    glowIntensity: 0.1,
  }],
  ['angry', {
    primary: { hue: 0, saturation: 95, lightness: 60 },
    secondary: { hue: 10, saturation: 90, lightness: 50 },
    glow: { hue: 0, saturation: 100, lightness: 70 },
    amplitudeRange: { min: 0.9, max: 1.0 },
    speedMultiplier: 1.5,
    spacingMode: 'irregular' as const,
    wavePattern: 'shaking' as const,
    glowIntensity: 1.0,
  }],
  ['excited', {
    primary: { hue: 60, saturation: 85, lightness: 80 },
    secondary: { hue: 50, saturation: 80, lightness: 70 },
    glow: { hue: 60, saturation: 90, lightness: 85 },
    amplitudeRange: { min: 0.7, max: 1.0 },
    speedMultiplier: 1.8,
    spacingMode: 'jumping' as const,
    wavePattern: 'pulsing' as const,
    glowIntensity: 0.9,
  }],
  ['neutral', {
    primary: { hue: 210, saturation: 30, lightness: 50 },
    secondary: { hue: 220, saturation: 25, lightness: 40 },
    glow: { hue: 210, saturation: 35, lightness: 55 },
    amplitudeRange: { min: 0.2, max: 0.4 },
    speedMultiplier: 0.8,
    spacingMode: 'uniform' as const,
    wavePattern: 'breathing' as const,
    glowIntensity: 0.2,
  }],
]);

/** 完整的默认配置 */
export const DEFAULT_CONFIG: WaveformConfig = {
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
    emotionPresets: EMOTION_PRESETS,
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

/** 波形配置类型（需要在types中补充） */
export interface WaveformConfig {
  renderer: import('../types').RendererType;
  width: number;
  height: number;
  audio: import('../types').AudioConfig;
  mapping: import('../types').MappingConfig;
  animation: import('../types').AnimationConfig;
  initialState: import('../types').AgentState;
  initialEmotion: import('../types').EmotionType;
}
