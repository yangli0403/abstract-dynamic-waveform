/**
 * 颜色映射通道（通道1）
 *
 * 职责：将EmotionData映射为HSL色彩参数。
 * 映射规则：情感 → 颜色 (Color)
 *
 * 支持6种预设情感颜色和自定义扩展。
 * 支持混合情感的颜色融合。
 */

import type { EmotionType, EmotionData, ColorParams, EmotionColorPreset, HSLColor } from '../types';
import { blendHSL, lerpHSL } from '../utils/hsl';
import { clamp } from '../utils/math';

export class ColorChannel {
  private _presets: Map<EmotionType | string, EmotionColorPreset>;

  constructor(presets: Map<EmotionType, EmotionColorPreset>) {
    this._presets = new Map(presets);
  }

  /** 根据情感数据映射颜色 */
  map(emotion: EmotionData): ColorParams {
    const preset = this._presets.get(emotion.type);
    if (!preset) {
      // 回退到neutral
      const neutral = this._presets.get('neutral');
      if (neutral) return { primary: neutral.primary, secondary: neutral.secondary, glow: neutral.glow };
      return {
        primary: { hue: 210, saturation: 30, lightness: 50 },
        secondary: { hue: 220, saturation: 25, lightness: 40 },
        glow: { hue: 210, saturation: 35, lightness: 55 },
      };
    }

    // 根据arousal调整亮度和饱和度
    const arousalFactor = emotion.arousal;
    const primary: HSLColor = {
      hue: preset.primary.hue,
      saturation: clamp(preset.primary.saturation + arousalFactor * 10, 0, 100),
      lightness: clamp(preset.primary.lightness + arousalFactor * 5, 0, 100),
    };

    const secondary: HSLColor = {
      hue: preset.secondary.hue,
      saturation: clamp(preset.secondary.saturation + arousalFactor * 8, 0, 100),
      lightness: clamp(preset.secondary.lightness + arousalFactor * 5, 0, 100),
    };

    const glow: HSLColor = {
      hue: preset.glow.hue,
      saturation: clamp(preset.glow.saturation + arousalFactor * 5, 0, 100),
      lightness: clamp(preset.glow.lightness + arousalFactor * 5, 0, 100),
    };

    return { primary, secondary, glow };
  }

  /** 根据混合情感映射颜色 */
  mapBlended(emotions: Map<EmotionType, number>): ColorParams {
    const primaryColors: Array<{ color: HSLColor; weight: number }> = [];
    const secondaryColors: Array<{ color: HSLColor; weight: number }> = [];
    const glowColors: Array<{ color: HSLColor; weight: number }> = [];

    for (const [emotion, weight] of emotions) {
      const preset = this._presets.get(emotion);
      if (preset && weight > 0) {
        primaryColors.push({ color: preset.primary, weight });
        secondaryColors.push({ color: preset.secondary, weight });
        glowColors.push({ color: preset.glow, weight });
      }
    }

    return {
      primary: blendHSL(primaryColors),
      secondary: blendHSL(secondaryColors),
      glow: blendHSL(glowColors),
    };
  }

  /** 注册自定义情感颜色预设 */
  registerPreset(name: string, preset: EmotionColorPreset): void {
    this._presets.set(name, preset);
  }

  /** 获取所有已注册的预设 */
  getPresets(): ReadonlyMap<string, EmotionColorPreset> {
    return this._presets;
  }
}
