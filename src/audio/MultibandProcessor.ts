/**
 * 多频段处理器
 *
 * 将FFT频域数据分组为指定数量的频段，
 * 并进行归一化处理，供渲染器直接使用。
 */

import { normalizeDecibels, clamp } from '../utils/math';

export class MultibandProcessor {
  private _bandCount: number;
  private _minDb: number;
  private _maxDb: number;
  private _smoothingFactor: number;
  private _smoothedBands: number[];

  constructor(
    bandCount: number = 24,
    minDb: number = -90,
    maxDb: number = -10,
    smoothingFactor: number = 0.7
  ) {
    this._bandCount = bandCount;
    this._minDb = minDb;
    this._maxDb = maxDb;
    this._smoothingFactor = smoothingFactor;
    this._smoothedBands = new Array(bandCount).fill(0);
  }

  /** 处理频域数据，返回归一化的频段数组 */
  process(frequencyData: Float32Array): number[] {
    const bands: number[] = new Array(this._bandCount).fill(0);

    if (frequencyData.length === 0) return bands;

    // 使用对数分布的频段划分（低频段更宽，高频段更窄）
    const totalBins = frequencyData.length;

    for (let i = 0; i < this._bandCount; i++) {
      // 对数分布计算每个频段的起止bin
      const startRatio = Math.pow(i / this._bandCount, 1.5);
      const endRatio = Math.pow((i + 1) / this._bandCount, 1.5);
      const startBin = Math.floor(startRatio * totalBins);
      const endBin = Math.min(Math.floor(endRatio * totalBins), totalBins);

      if (startBin >= endBin) {
        bands[i] = 0;
        continue;
      }

      // 取频段内的平均值
      let sum = 0;
      for (let j = startBin; j < endBin; j++) {
        sum += normalizeDecibels(frequencyData[j], this._minDb, this._maxDb);
      }
      bands[i] = sum / (endBin - startBin);
    }

    // 平滑处理
    for (let i = 0; i < this._bandCount; i++) {
      this._smoothedBands[i] = this._smoothingFactor * this._smoothedBands[i] +
                                (1 - this._smoothingFactor) * bands[i];
      bands[i] = clamp(this._smoothedBands[i], 0, 1);
    }

    return bands;
  }

  /** 设置频段数量 */
  setBandCount(count: number): void {
    this._bandCount = Math.max(1, count);
    this._smoothedBands = new Array(this._bandCount).fill(0);
  }

  /** 重置内部状态 */
  reset(): void {
    this._smoothedBands = new Array(this._bandCount).fill(0);
  }
}
