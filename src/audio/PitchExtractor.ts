/**
 * 音调特征提取器
 *
 * 使用自相关法从时域数据中检测基频(F0)。
 * 支持YIN和自相关两种算法。
 */

import type { PitchData, PitchConfig } from '../types';
import { clamp } from '../utils/math';

export class PitchExtractor {
  private _sampleRate: number;
  private _minFrequency: number;
  private _maxFrequency: number;
  private _confidenceThreshold: number;
  private _algorithm: 'autocorrelation' | 'yin';
  private _lastFrequency: number = 0;
  private _lastChangeRate: number = 0;
  private _lastTimestamp: number = 0;

  constructor(sampleRate: number, config: PitchConfig) {
    this._sampleRate = sampleRate;
    this._minFrequency = config.minFrequency;
    this._maxFrequency = config.maxFrequency;
    this._confidenceThreshold = config.confidenceThreshold;
    this._algorithm = config.algorithm;
  }

  /** 从时域数据中提取音调特征 */
  extract(timeDomainData: Float32Array): PitchData {
    if (timeDomainData.length === 0) {
      return { frequency: 0, confidence: 0, changeRate: 0 };
    }

    const result = this._algorithm === 'yin'
      ? this._yinDetect(timeDomainData)
      : this._autocorrelationDetect(timeDomainData);

    // 计算变化率
    const now = performance.now();
    const dt = now - this._lastTimestamp;
    if (dt > 0 && this._lastFrequency > 0 && result.frequency > 0) {
      this._lastChangeRate = (result.frequency - this._lastFrequency) / (dt / 1000);
    } else {
      this._lastChangeRate = 0;
    }
    this._lastFrequency = result.frequency;
    this._lastTimestamp = now;

    return {
      frequency: result.frequency,
      confidence: result.confidence,
      changeRate: this._lastChangeRate,
    };
  }

  /** YIN音调检测算法 */
  private _yinDetect(data: Float32Array): { frequency: number; confidence: number } {
    const bufferSize = data.length;
    const halfSize = Math.floor(bufferSize / 2);
    const yinBuffer = new Float32Array(halfSize);

    // 步骤1：差分函数
    for (let tau = 0; tau < halfSize; tau++) {
      yinBuffer[tau] = 0;
      for (let i = 0; i < halfSize; i++) {
        const delta = data[i] - data[i + tau];
        yinBuffer[tau] += delta * delta;
      }
    }

    // 步骤2：累积均值归一化差分函数
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < halfSize; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    // 步骤3：绝对阈值
    const minPeriod = Math.floor(this._sampleRate / this._maxFrequency);
    const maxPeriod = Math.floor(this._sampleRate / this._minFrequency);
    let bestTau = -1;
    let bestConfidence = 0;

    for (let tau = Math.max(2, minPeriod); tau < Math.min(halfSize, maxPeriod); tau++) {
      if (yinBuffer[tau] < this._confidenceThreshold) {
        // 找到第一个低于阈值的谷
        while (tau + 1 < halfSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        bestTau = tau;
        bestConfidence = 1 - yinBuffer[tau];
        break;
      }
    }

    if (bestTau === -1) {
      return { frequency: 0, confidence: 0 };
    }

    // 步骤4：抛物线插值
    const s0 = bestTau > 0 ? yinBuffer[bestTau - 1] : yinBuffer[bestTau];
    const s1 = yinBuffer[bestTau];
    const s2 = bestTau + 1 < halfSize ? yinBuffer[bestTau + 1] : yinBuffer[bestTau];
    const betterTau = bestTau + (s0 - s2) / (2 * (s0 - 2 * s1 + s2) || 1);

    const frequency = this._sampleRate / betterTau;

    return {
      frequency: clamp(frequency, this._minFrequency, this._maxFrequency),
      confidence: clamp(bestConfidence, 0, 1),
    };
  }

  /** 自相关音调检测 */
  private _autocorrelationDetect(data: Float32Array): { frequency: number; confidence: number } {
    const bufferSize = data.length;
    const minPeriod = Math.floor(this._sampleRate / this._maxFrequency);
    const maxPeriod = Math.min(
      Math.floor(this._sampleRate / this._minFrequency),
      Math.floor(bufferSize / 2)
    );

    let bestCorrelation = -1;
    let bestPeriod = 0;

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < bufferSize - period; i++) {
        correlation += data[i] * data[i + period];
        norm1 += data[i] * data[i];
        norm2 += data[i + period] * data[i + period];
      }

      const normalizedCorrelation = correlation / (Math.sqrt(norm1 * norm2) || 1);

      if (normalizedCorrelation > bestCorrelation) {
        bestCorrelation = normalizedCorrelation;
        bestPeriod = period;
      }
    }

    if (bestCorrelation < this._confidenceThreshold || bestPeriod === 0) {
      return { frequency: 0, confidence: 0 };
    }

    return {
      frequency: this._sampleRate / bestPeriod,
      confidence: clamp(bestCorrelation, 0, 1),
    };
  }

  /** 设置检测频率范围 */
  setFrequencyRange(min: number, max: number): void {
    this._minFrequency = min;
    this._maxFrequency = max;
  }

  /** 设置置信度阈值 */
  setConfidenceThreshold(threshold: number): void {
    this._confidenceThreshold = clamp(threshold, 0, 1);
  }

  /** 重置内部状态 */
  reset(): void {
    this._lastFrequency = 0;
    this._lastChangeRate = 0;
    this._lastTimestamp = 0;
  }
}
