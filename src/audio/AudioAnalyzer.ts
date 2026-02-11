/**
 * 音频分析器
 *
 * 管理Web Audio API连接，提供原始频谱数据和时域数据。
 * 作为四维特征提取器的数据源。
 */

import type { AudioConfig } from '../types';

export class AudioAnalyzer {
  private _audioContext: AudioContext | null = null;
  private _analyserNode: AnalyserNode | null = null;
  private _sourceNode: MediaStreamAudioSourceNode | null = null;
  private _frequencyData: Float32Array = new Float32Array(0);
  private _timeDomainData: Float32Array = new Float32Array(0);
  private _config: AudioConfig;

  constructor(config: AudioConfig) {
    this._config = config;
  }

  /** 连接麦克风音频流 */
  connect(stream: MediaStream): void {
    this._audioContext = new AudioContext();
    this._analyserNode = this._audioContext.createAnalyser();

    this._analyserNode.fftSize = this._config.fftSize;
    this._analyserNode.smoothingTimeConstant = this._config.smoothingTimeConstant;
    this._analyserNode.minDecibels = this._config.minDecibels;
    this._analyserNode.maxDecibels = this._config.maxDecibels;

    this._sourceNode = this._audioContext.createMediaStreamSource(stream);
    this._sourceNode.connect(this._analyserNode);

    const bufferLength = this._analyserNode.frequencyBinCount;
    this._frequencyData = new Float32Array(bufferLength);
    this._timeDomainData = new Float32Array(bufferLength);
  }

  /** 获取频域数据（FFT结果，分贝值） */
  getFrequencyData(): Float32Array {
    if (this._analyserNode) {
      this._analyserNode.getFloatFrequencyData(this._frequencyData);
    }
    return this._frequencyData;
  }

  /** 获取时域数据（PCM波形，-1~1） */
  getTimeDomainData(): Float32Array {
    if (this._analyserNode) {
      this._analyserNode.getFloatTimeDomainData(this._timeDomainData);
    }
    return this._timeDomainData;
  }

  /** 获取采样率 */
  getSampleRate(): number {
    return this._audioContext?.sampleRate ?? 44100;
  }

  /** 断开音频流 */
  disconnect(): void {
    if (this._sourceNode) {
      this._sourceNode.disconnect();
      this._sourceNode = null;
    }
  }

  /** 释放所有资源 */
  dispose(): void {
    this.disconnect();
    if (this._audioContext && this._audioContext.state !== 'closed') {
      this._audioContext.close().catch(() => {});
    }
    this._audioContext = null;
    this._analyserNode = null;
  }
}
