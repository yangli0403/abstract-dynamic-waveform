/**
 * 动画循环实现
 *
 * 基于requestAnimationFrame的帧循环引擎，
 * 提供帧率无关的deltaTime和FPS统计。
 */

import type { FrameCallback } from '../types';

export class AnimationLoop {
  private _running: boolean = false;
  private _lastTimestamp: number = 0;
  private _frameCallback: FrameCallback | null = null;
  private _animationFrameId: number = 0;
  private _fps: number = 0;
  private _frameCount: number = 0;
  private _fpsTimestamp: number = 0;

  /** 启动动画循环 */
  start(callback: FrameCallback): void {
    if (this._running) return;

    this._running = true;
    this._frameCallback = callback;
    this._lastTimestamp = performance.now();
    this._fpsTimestamp = this._lastTimestamp;
    this._frameCount = 0;

    this._tick(this._lastTimestamp);
  }

  /** 停止动画循环 */
  stop(): void {
    this._running = false;
    this._frameCallback = null;
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = 0;
    }
  }

  /** 是否正在运行 */
  isRunning(): boolean {
    return this._running;
  }

  /** 获取当前FPS */
  getFPS(): number {
    return this._fps;
  }

  /** 内部帧循环 */
  private _tick = (timestamp: number): void => {
    if (!this._running) return;

    const deltaTime = timestamp - this._lastTimestamp;
    this._lastTimestamp = timestamp;

    // FPS统计（每秒更新一次）
    this._frameCount++;
    if (timestamp - this._fpsTimestamp >= 1000) {
      this._fps = this._frameCount;
      this._frameCount = 0;
      this._fpsTimestamp = timestamp;
    }

    // 执行帧回调
    if (this._frameCallback) {
      try {
        this._frameCallback(timestamp, deltaTime);
      } catch (err) {
        console.error('[AnimationLoop] 帧回调执行出错:', err);
      }
    }

    // 请求下一帧
    this._animationFrameId = requestAnimationFrame(this._tick);
  };

  /** 销毁 */
  dispose(): void {
    this.stop();
  }
}
