/**
 * 经典波形渲染器 (ClassicWaveRenderer)
 *
 * 基于SiriWave.js经典模式的Canvas渲染实现。
 * 使用多条正弦波叠加 + 衰减函数生成平滑波形。
 *
 * 核心算法：
 * y(x) = A * sin(B * x - C) * e^(-|x|^D)
 * 其中A=振幅, B=频率, C=相位, D=衰减指数
 */

import type { IRenderer } from './IRenderer';
import type { AgentState, RendererType } from '../types';
import type { FrameData, ClassicWaveConfig } from '../types';
import { hslToString, hslaToString } from '../utils/hsl';
import { clamp } from '../utils/math';

const DEFAULT_CONFIG: ClassicWaveConfig = {
  curveCount: 5,
  frequency: 6,
  phaseShift: -0.15,
  lineWidth: 1,
  pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  antialias: true,
};

export class ClassicWaveRenderer implements IRenderer {
  readonly type: RendererType = 'classic';

  private _container: HTMLElement | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _config: ClassicWaveConfig;
  private _width: number = 0;
  private _height: number = 0;

  constructor(config?: Partial<ClassicWaveConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  mount(container: HTMLElement): void {
    this._container = container;
    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText = 'width: 100%; height: 100%; display: block;';
    this._container.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d', { alpha: true });
    this.resize();
  }

  draw(frame: Readonly<FrameData>): void {
    if (!this._ctx || !this._canvas) return;

    const ctx = this._ctx;
    const w = this._width;
    const h = this._height;
    const midY = h / 2;

    // 清空画布
    ctx.clearRect(0, 0, w, h);

    const { color, shape, dynamic } = frame;
    const amplitude = shape.amplitude * (h * 0.4);

    // 绘制多条曲线
    for (let c = 0; c < this._config.curveCount; c++) {
      const curveAmplitude = amplitude * (1 - c * 0.15);
      const opacity = 1 - c * 0.18;
      const curveColor = c === 0
        ? hslToString(color.primary)
        : hslaToString(color.secondary, opacity);

      ctx.beginPath();
      ctx.lineWidth = this._config.lineWidth * (1 - c * 0.1);
      ctx.strokeStyle = curveColor;

      for (let x = 0; x <= w; x++) {
        // 归一化x到 -1 ~ 1
        const nx = (x / w) * 2 - 1;

        // 衰减函数：e^(-|x|^2.5)
        const attenuation = Math.exp(-Math.pow(Math.abs(nx), 2.5));

        // 正弦波 + 相位偏移
        const phase = frame.phase * dynamic.speedMultiplier + c * 0.5;
        const y = curveAmplitude *
          Math.sin(this._config.frequency * nx * Math.PI + phase) *
          attenuation;

        if (x === 0) {
          ctx.moveTo(x, midY + y);
        } else {
          ctx.lineTo(x, midY + y);
        }
      }

      ctx.stroke();

      // 发光效果
      if (c === 0 && dynamic.glowIntensity > 0.1) {
        ctx.shadowColor = hslToString(color.glow);
        ctx.shadowBlur = dynamic.glowIntensity * 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  onStateChange(_state: AgentState): void {
    // 经典波形渲染器不需要特殊的状态处理
  }

  resize(): void {
    if (!this._canvas || !this._container) return;

    const rect = this._container.getBoundingClientRect();
    const dpr = this._config.pixelRatio;

    this._width = rect.width * dpr;
    this._height = rect.height * dpr;

    this._canvas.width = this._width;
    this._canvas.height = this._height;

    if (this._ctx && this._config.antialias) {
      this._ctx.imageSmoothingEnabled = true;
    }
  }

  dispose(): void {
    if (this._canvas && this._container) {
      this._container.removeChild(this._canvas);
    }
    this._canvas = null;
    this._ctx = null;
    this._container = null;
  }
}
