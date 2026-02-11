/**
 * 音量特征提取器
 *
 * 从频域数据中提取RMS振幅、峰值振幅和平滑振幅。
 * 使用指数移动平均(EMA)进行平滑处理。
 */

import type { VolumeData } from '../types';
import { normalizeDecibels, clamp } from '../utils/math';

export class VolumeExtractor {
  private _smoothingFactor: number;
  private _currentVolume: number = 0;
  private _peakVolume: number = 0;
  private _peakDecay: number = 0.995;
  private _minDb: number;
  private _maxDb: number;

  constructor(smoothingFactor: number = 0.8, minDb: number = -90, maxDb: number = -10) {
    this._smoothingFactor = smoothingFactor;
    this._minDb = minDb;
    this._maxDb = maxDb;
  }

  /** 从频域数据中提取音量特征 */
  extract(frequencyData: Float32Array): VolumeData {
    if (frequencyData.length === 0) {
      return { rms: 0, peak: 0, smoothed: 0 };
    }

    // 计算RMS（在分贝域中）
    let sumSquares = 0;
    let maxDb = -Infinity;

    for (let i = 0; i < frequencyData.length; i++) {
      const db = frequencyData[i];
      const normalized = normalizeDecibels(db, this._minDb, this._maxDb);
      sumSquares += normalized * normalized;
      if (db > maxDb) maxDb = db;
    }

    const rms = Math.sqrt(sumSquares / frequencyData.length);
    const peak = normalizeDecibels(maxDb, this._minDb, this._maxDb);

    // 指数移动平均平滑
    this._currentVolume = this._smoothingFactor * this._currentVolume +
                          (1 - this._smoothingFactor) * rms;

    // 峰值衰减
    this._peakVolume = Math.max(peak, this._peakVolume * this._peakDecay);

    return {
      rms: clamp(rms, 0, 1),
      peak: clamp(this._peakVolume, 0, 1),
      smoothed: clamp(this._currentVolume, 0, 1),
    };
  }

  /** 设置平滑因子 */
  setSmoothingFactor(factor: number): void {
    this._smoothingFactor = clamp(factor, 0, 1);
  }

  /** 重置内部状态 */
  reset(): void {
    this._currentVolume = 0;
    this._peakVolume = 0;
  }
}
