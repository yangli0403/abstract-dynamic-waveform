/**
 * 情感特征提取器
 *
 * 综合分析音量、音调、语速三维特征，推断当前情感状态。
 * 支持手动覆盖（由外部NLP或情感分析API驱动）。
 *
 * 情感模型基于Russell的环形情感模型（Circumplex Model），
 * 使用Arousal（能量/唤醒度）和Valence（效价/愉悦度）两个维度。
 */

import type { EmotionType, EmotionData, VolumeData, PitchData, SpeedData } from '../types';
import { clamp } from '../utils/math';

/** 情感区域定义（Arousal-Valence空间） */
interface EmotionRegion {
  arousalRange: { min: number; max: number };
  valenceRange: { min: number; max: number };
}

/** 6种情感在A-V空间中的区域 */
const EMOTION_REGIONS: Record<EmotionType, EmotionRegion> = {
  happy:   { arousalRange: { min: 0.4, max: 0.8 }, valenceRange: { min: 0.3, max: 0.8 } },
  excited: { arousalRange: { min: 0.7, max: 1.0 }, valenceRange: { min: 0.2, max: 1.0 } },
  angry:   { arousalRange: { min: 0.7, max: 1.0 }, valenceRange: { min: -1.0, max: -0.3 } },
  sad:     { arousalRange: { min: 0.0, max: 0.4 }, valenceRange: { min: -1.0, max: -0.2 } },
  calm:    { arousalRange: { min: 0.0, max: 0.3 }, valenceRange: { min: -0.2, max: 0.5 } },
  neutral: { arousalRange: { min: 0.2, max: 0.5 }, valenceRange: { min: -0.2, max: 0.2 } },
};

export class EmotionExtractor {
  private _manualEmotion: EmotionType | null = null;
  private _currentEmotion: EmotionType = 'neutral';
  private _smoothingFactor: number = 0.9;
  private _currentArousal: number = 0.3;
  private _currentValence: number = 0;

  /** 从三维特征中提取情感 */
  extract(volume: VolumeData, pitch: PitchData, speed: SpeedData): EmotionData {
    // 如果有手动覆盖，直接返回
    if (this._manualEmotion) {
      const region = EMOTION_REGIONS[this._manualEmotion];
      return {
        type: this._manualEmotion,
        confidence: 1.0,
        arousal: (region.arousalRange.min + region.arousalRange.max) / 2,
        valence: (region.valenceRange.min + region.valenceRange.max) / 2,
      };
    }

    // 从音频特征推断Arousal和Valence
    // Arousal（唤醒度）：主要由音量和语速决定
    const rawArousal = clamp(
      volume.smoothed * 0.5 + speed.activityRate * 0.3 + (pitch.confidence > 0.5 ? 0.2 : 0),
      0, 1
    );

    // Valence（效价）：主要由音调高低和变化率决定
    // 高音调+快速变化 → 正面；低音调+缓慢 → 负面
    let rawValence = 0;
    if (pitch.frequency > 0 && pitch.confidence > 0.5) {
      // 将频率映射到-1~1（以200Hz为中点）
      rawValence = clamp((pitch.frequency - 200) / 200, -1, 1) * 0.6;
      // 变化率的贡献
      rawValence += clamp(pitch.changeRate / 100, -0.4, 0.4);
    }

    // 平滑处理
    this._currentArousal = this._smoothingFactor * this._currentArousal +
                           (1 - this._smoothingFactor) * rawArousal;
    this._currentValence = this._smoothingFactor * this._currentValence +
                           (1 - this._smoothingFactor) * rawValence;

    // 在A-V空间中找到最近的情感区域
    const { emotion, confidence } = this._classifyEmotion(
      this._currentArousal,
      this._currentValence
    );

    this._currentEmotion = emotion;

    return {
      type: emotion,
      confidence,
      arousal: this._currentArousal,
      valence: this._currentValence,
    };
  }

  /** 在A-V空间中分类情感 */
  private _classifyEmotion(arousal: number, valence: number): {
    emotion: EmotionType;
    confidence: number;
  } {
    let bestEmotion: EmotionType = 'neutral';
    let bestDistance = Infinity;

    for (const [emotion, region] of Object.entries(EMOTION_REGIONS) as [EmotionType, EmotionRegion][]) {
      // 计算到区域中心的距离
      const centerA = (region.arousalRange.min + region.arousalRange.max) / 2;
      const centerV = (region.valenceRange.min + region.valenceRange.max) / 2;
      const distance = Math.sqrt(
        Math.pow(arousal - centerA, 2) + Math.pow(valence - centerV, 2)
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestEmotion = emotion;
      }
    }

    // 置信度：距离越近越高
    const confidence = clamp(1 - bestDistance, 0, 1);

    return { emotion: bestEmotion, confidence };
  }

  /** 手动设置情感（覆盖自动检测） */
  setManualEmotion(emotion: EmotionType): void {
    this._manualEmotion = emotion;
    this._currentEmotion = emotion;
  }

  /** 清除手动设置，恢复自动检测 */
  clearManualEmotion(): void {
    this._manualEmotion = null;
  }

  /** 获取当前情感 */
  getCurrentEmotion(): EmotionType {
    return this._currentEmotion;
  }

  /** 重置内部状态 */
  reset(): void {
    this._manualEmotion = null;
    this._currentEmotion = 'neutral';
    this._currentArousal = 0.3;
    this._currentValence = 0;
  }
}
