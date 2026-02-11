/**
 * 插值工具函数
 *
 * 提供各种插值算法，用于实现平滑的视觉参数过渡。
 */

import type { ColorParams, ShapeParams, DynamicParams } from '../types';
import { lerp as lerpNum, clamp } from './math';
import { lerpHSL } from './hsl';

/** 对ColorParams进行插值 */
export function lerpColorParams(a: ColorParams, b: ColorParams, t: number): ColorParams {
  return {
    primary: lerpHSL(a.primary, b.primary, t),
    secondary: lerpHSL(a.secondary, b.secondary, t),
    glow: lerpHSL(a.glow, b.glow, t),
  };
}

/** 对ShapeParams进行插值 */
export function lerpShapeParams(a: ShapeParams, b: ShapeParams, t: number): ShapeParams {
  return {
    amplitude: lerpNum(a.amplitude, b.amplitude, t),
    spacing: lerpNum(a.spacing, b.spacing, t),
    activeCount: Math.round(lerpNum(a.activeCount, b.activeCount, t)),
    variance: lerpNum(a.variance, b.variance, t),
    // 间距模式不插值，当t > 0.5时切换
    spacingMode: t > 0.5 ? b.spacingMode : a.spacingMode,
  };
}

/** 对DynamicParams进行插值 */
export function lerpDynamicParams(a: DynamicParams, b: DynamicParams, t: number): DynamicParams {
  return {
    speedMultiplier: lerpNum(a.speedMultiplier, b.speedMultiplier, t),
    // 波动模式不插值，当t > 0.5时切换
    wavePattern: t > 0.5 ? b.wavePattern : a.wavePattern,
    glowIntensity: lerpNum(a.glowIntensity, b.glowIntensity, t),
    transitionDuration: lerpNum(a.transitionDuration, b.transitionDuration, t),
  };
}

/** 计算基于时间的插值因子 */
export function timeLerpFactor(lerpSpeed: number, deltaTime: number): number {
  // 使用指数衰减模型：factor = 1 - e^(-speed * dt)
  // 这确保了帧率无关的平滑插值
  return clamp(1 - Math.exp(-lerpSpeed * deltaTime / 1000), 0, 1);
}
