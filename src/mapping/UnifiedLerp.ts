/**
 * 全通道插值器
 *
 * 对三个映射通道的输出进行统一的平滑插值，
 * 确保所有视觉参数变化的连续性和自然性。
 *
 * 使用帧率无关的指数衰减插值模型。
 */

import type { ColorParams, ShapeParams, DynamicParams } from '../types';
import { lerpColorParams, lerpShapeParams, lerpDynamicParams, timeLerpFactor } from '../utils/lerp';

/** 默认初始颜色参数 */
const DEFAULT_COLOR: ColorParams = {
  primary: { hue: 210, saturation: 30, lightness: 50 },
  secondary: { hue: 220, saturation: 25, lightness: 40 },
  glow: { hue: 210, saturation: 35, lightness: 55 },
};

/** 默认初始形态参数 */
const DEFAULT_SHAPE: ShapeParams = {
  amplitude: 0.3,
  spacing: 5,
  activeCount: 12,
  variance: 0.2,
  spacingMode: 'uniform',
};

/** 默认初始动态参数 */
const DEFAULT_DYNAMIC: DynamicParams = {
  speedMultiplier: 0.8,
  wavePattern: 'breathing',
  glowIntensity: 0.2,
  transitionDuration: 500,
};

export class UnifiedLerp {
  private _currentColor: ColorParams;
  private _currentShape: ShapeParams;
  private _currentDynamic: DynamicParams;
  private _lerpSpeed: number;

  constructor(lerpSpeed: number = 5) {
    this._currentColor = { ...DEFAULT_COLOR };
    this._currentShape = { ...DEFAULT_SHAPE };
    this._currentDynamic = { ...DEFAULT_DYNAMIC };
    this._lerpSpeed = lerpSpeed;
  }

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
  } {
    const t = timeLerpFactor(this._lerpSpeed, dt);

    this._currentColor = lerpColorParams(this._currentColor, targetColor, t);
    this._currentShape = lerpShapeParams(this._currentShape, targetShape, t);
    this._currentDynamic = lerpDynamicParams(this._currentDynamic, targetDynamic, t);

    return {
      color: this._currentColor,
      shape: this._currentShape,
      dynamic: this._currentDynamic,
    };
  }

  /** 设置全局插值速度 */
  setLerpSpeed(speed: number): void {
    this._lerpSpeed = Math.max(0.01, speed);
  }

  /** 立即跳转到目标值（跳过插值） */
  snapTo(color: ColorParams, shape: ShapeParams, dynamic: DynamicParams): void {
    this._currentColor = { ...color };
    this._currentShape = { ...shape };
    this._currentDynamic = { ...dynamic };
  }

  /** 获取当前值 */
  getCurrent(): {
    color: ColorParams;
    shape: ShapeParams;
    dynamic: DynamicParams;
  } {
    return {
      color: this._currentColor,
      shape: this._currentShape,
      dynamic: this._currentDynamic,
    };
  }
}
