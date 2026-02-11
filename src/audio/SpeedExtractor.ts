/**
 * 语速特征提取器
 *
 * 基于VAD（语音活动检测）的滑动窗口分析，
 * 通过语音活动率间接反映语速。
 */

import type { SpeedData, VADConfig } from '../types';
import { clamp } from '../utils/math';

export class SpeedExtractor {
  private _threshold: number;
  private _windowSize: number;
  private _activityHistory: boolean[] = [];
  private _lastActivityRate: number = 0;
  private _lastTimestamp: number = 0;
  private _minDb: number;
  private _maxDb: number;

  constructor(config: VADConfig, minDb: number = -90, maxDb: number = -10) {
    this._threshold = config.threshold;
    this._windowSize = config.windowSize;
    this._minDb = minDb;
    this._maxDb = maxDb;
  }

  /** 从频域数据中提取语速特征 */
  extract(frequencyData: Float32Array): SpeedData {
    if (frequencyData.length === 0) {
      return { activityRate: 0, changeRate: 0, isActive: false };
    }

    // 计算当前帧的能量（归一化）
    let energy = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const normalized = (frequencyData[i] - this._minDb) / (this._maxDb - this._minDb);
      energy += Math.max(0, normalized);
    }
    energy /= frequencyData.length;

    // VAD判定
    const isActive = energy > this._threshold;

    // 更新滑动窗口
    this._activityHistory.push(isActive);
    if (this._activityHistory.length > this._windowSize) {
      this._activityHistory.shift();
    }

    // 计算活动率
    const activeCount = this._activityHistory.filter(Boolean).length;
    const activityRate = activeCount / this._activityHistory.length;

    // 计算变化率
    const now = performance.now();
    const dt = now - this._lastTimestamp;
    let changeRate = 0;
    if (dt > 0) {
      changeRate = (activityRate - this._lastActivityRate) / (dt / 1000);
    }
    this._lastActivityRate = activityRate;
    this._lastTimestamp = now;

    return {
      activityRate: clamp(activityRate, 0, 1),
      changeRate,
      isActive,
    };
  }

  /** 设置VAD能量阈值 */
  setThreshold(threshold: number): void {
    this._threshold = clamp(threshold, 0, 1);
  }

  /** 设置滑动窗口大小 */
  setWindowSize(size: number): void {
    this._windowSize = Math.max(1, Math.floor(size));
  }

  /** 重置内部状态 */
  reset(): void {
    this._activityHistory = [];
    this._lastActivityRate = 0;
    this._lastTimestamp = 0;
  }
}
