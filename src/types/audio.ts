/**
 * 音频相关类型定义
 *
 * 定义了多维音频输入（第一段）的所有数据结构。
 */

import type { EmotionType } from './base';

/** 音量特征数据 */
export interface VolumeData {
  readonly rms: number;
  readonly peak: number;
  readonly smoothed: number;
}

/** 音调特征数据 */
export interface PitchData {
  readonly frequency: number;
  readonly confidence: number;
  readonly changeRate: number;
}

/** 语速特征数据 */
export interface SpeedData {
  readonly activityRate: number;
  readonly changeRate: number;
  readonly isActive: boolean;
}

/** 情感特征数据 */
export interface EmotionData {
  readonly type: EmotionType;
  readonly confidence: number;
  readonly arousal: number;
  readonly valence: number;
}

/** 四维特征向量（每帧输出） */
export interface AudioFeatures {
  readonly volume: VolumeData;
  readonly pitch: PitchData;
  readonly speed: SpeedData;
  readonly emotion: EmotionData;
  readonly bands: ReadonlyArray<number>;
  readonly timestamp: number;
}

/** 音频配置 */
export interface AudioConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
  bandCount: number;
  pitch: PitchConfig;
  vad: VADConfig;
}

/** 音调检测配置 */
export interface PitchConfig {
  algorithm: 'autocorrelation' | 'yin';
  minFrequency: number;
  maxFrequency: number;
  confidenceThreshold: number;
}

/** 语音活动检测配置 */
export interface VADConfig {
  threshold: number;
  windowSize: number;
}
