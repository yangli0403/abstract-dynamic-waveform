/**
 * HSL色彩工具函数
 *
 * 提供HSL色彩空间的计算和转换工具。
 */

import type { HSLColor } from '../types';
import { lerp, clamp } from './math';

/** 创建HSL颜色 */
export function hsl(hue: number, saturation: number, lightness: number): HSLColor {
  return {
    hue: ((hue % 360) + 360) % 360,
    saturation: clamp(saturation, 0, 100),
    lightness: clamp(lightness, 0, 100),
  };
}

/** 将HSL颜色转换为CSS字符串 */
export function hslToString(color: HSLColor): string {
  return `hsl(${color.hue}, ${color.saturation}%, ${color.lightness}%)`;
}

/** 将HSL颜色转换为带透明度的CSS字符串 */
export function hslaToString(color: HSLColor, alpha: number): string {
  return `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${clamp(alpha, 0, 1)})`;
}

/** 在两个HSL颜色之间进行插值 */
export function lerpHSL(a: HSLColor, b: HSLColor, t: number): HSLColor {
  // 色相需要沿最短路径插值
  let hueDiff = b.hue - a.hue;
  if (hueDiff > 180) hueDiff -= 360;
  if (hueDiff < -180) hueDiff += 360;

  return {
    hue: ((a.hue + hueDiff * t) % 360 + 360) % 360,
    saturation: lerp(a.saturation, b.saturation, t),
    lightness: lerp(a.lightness, b.lightness, t),
  };
}

/** 调整HSL颜色的亮度 */
export function adjustLightness(color: HSLColor, delta: number): HSLColor {
  return {
    ...color,
    lightness: clamp(color.lightness + delta, 0, 100),
  };
}

/** 调整HSL颜色的饱和度 */
export function adjustSaturation(color: HSLColor, delta: number): HSLColor {
  return {
    ...color,
    saturation: clamp(color.saturation + delta, 0, 100),
  };
}

/** 混合多个HSL颜色（加权平均） */
export function blendHSL(colors: Array<{ color: HSLColor; weight: number }>): HSLColor {
  if (colors.length === 0) {
    return hsl(0, 0, 50);
  }

  let totalWeight = 0;
  let hueX = 0;
  let hueY = 0;
  let saturation = 0;
  let lightness = 0;

  for (const { color, weight } of colors) {
    totalWeight += weight;
    // 使用向量平均法处理色相的循环性
    const hueRad = (color.hue * Math.PI) / 180;
    hueX += Math.cos(hueRad) * weight;
    hueY += Math.sin(hueRad) * weight;
    saturation += color.saturation * weight;
    lightness += color.lightness * weight;
  }

  if (totalWeight === 0) return hsl(0, 0, 50);

  const avgHue = ((Math.atan2(hueY / totalWeight, hueX / totalWeight) * 180) / Math.PI + 360) % 360;

  return {
    hue: avgHue,
    saturation: clamp(saturation / totalWeight, 0, 100),
    lightness: clamp(lightness / totalWeight, 0, 100),
  };
}
