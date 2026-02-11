/**
 * iOS9波形渲染器 (iOS9WaveRenderer)
 *
 * 基于SiriWave.js iOS9模式的Canvas渲染实现。
 * 使用动态曲线生成/消亡机制，模拟iOS 9 Siri的视觉效果。
 *
 * 核心特点：
 * - 多条独立曲线，各自有生命周期
 * - 曲线使用贝塞尔曲线绘制
 * - 混合模式(lighter)产生叠加发光效果
 */

import type { IRenderer } from './IRenderer';
import type { AgentState, RendererType } from '../types';
import type { FrameData, iOS9WaveConfig } from '../types';
import { hslToString, hslaToString } from '../utils/hsl';
import { clamp, randomFloat } from '../utils/math';

/** 单条曲线的状态 */
interface CurveState {
  phase: number;
  amplitude: number;
  targetAmplitude: number;
  speed: number;
  opacity: number;
  hueOffset: number;
}

const DEFAULT_CONFIG: iOS9WaveConfig = {
  curveCount: 4,
  supportLineCount: 3,
  globalCompositeOperation: 'lighter',
  pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  antialias: true,
};

export class iOS9WaveRenderer implements IRenderer {
  readonly type: RendererType = 'ios9';

  private _container: HTMLElement | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _config: iOS9WaveConfig;
  private _width: number = 0;
  private _height: number = 0;
  private _curves: CurveState[] = [];

  constructor(config?: Partial<iOS9WaveConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._initCurves();
  }

  private _initCurves(): void {
    this._curves = [];
    const totalCurves = this._config.curveCount * (1 + this._config.supportLineCount);
    for (let i = 0; i < totalCurves; i++) {
      this._curves.push({
        phase: randomFloat(0, Math.PI * 2),
        amplitude: randomFloat(0.3, 0.8),
        targetAmplitude: randomFloat(0.3, 0.8),
        speed: randomFloat(0.5, 1.5),
        opacity: randomFloat(0.3, 0.8),
        hueOffset: randomFloat(-20, 20),
      });
    }
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

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = this._config.globalCompositeOperation;

    const { color, shape, dynamic } = frame;
    const baseAmplitude = shape.amplitude * (h * 0.35);

    for (let i = 0; i < this._curves.length; i++) {
      const curve = this._curves[i];
      const isMainCurve = i < this._config.curveCount;

      // 更新曲线状态
      curve.phase += curve.speed * dynamic.speedMultiplier * 0.02;
      curve.amplitude += (curve.targetAmplitude - curve.amplitude) * 0.05;

      // 随机更新目标振幅
      if (Math.random() < 0.01) {
        curve.targetAmplitude = randomFloat(0.3, shape.amplitude);
      }

      const curveAmplitude = baseAmplitude * curve.amplitude;
      const opacity = isMainCurve ? curve.opacity : curve.opacity * 0.4;

      // 计算颜色（带色相偏移）
      const hue = color.primary.hue + curve.hueOffset;
      const curveColor = `hsla(${hue}, ${color.primary.saturation}%, ${color.primary.lightness}%, ${opacity})`;

      // 绘制贝塞尔曲线
      ctx.beginPath();
      ctx.strokeStyle = curveColor;
      ctx.lineWidth = isMainCurve ? 2 : 1;

      const points = 128;
      for (let p = 0; p <= points; p++) {
        const nx = (p / points) * 2 - 1;
        const attenuation = Math.pow(1 - Math.pow(Math.abs(nx), 2), 2);

        const y = curveAmplitude *
          Math.sin(4 * nx * Math.PI + curve.phase) *
          attenuation;

        const x = (nx + 1) / 2 * w;

        if (p === 0) {
          ctx.moveTo(x, midY + y);
        } else {
          ctx.lineTo(x, midY + y);
        }
      }

      ctx.stroke();
    }

    // 重置混合模式
    ctx.globalCompositeOperation = 'source-over';
  }

  onStateChange(_state: AgentState): void {
    // iOS9渲染器通过amplitude自动响应
  }

  resize(): void {
    if (!this._canvas || !this._container) return;

    const rect = this._container.getBoundingClientRect();
    const dpr = this._config.pixelRatio;

    this._width = rect.width * dpr;
    this._height = rect.height * dpr;

    this._canvas.width = this._width;
    this._canvas.height = this._height;
  }

  dispose(): void {
    if (this._canvas && this._container) {
      this._container.removeChild(this._canvas);
    }
    this._canvas = null;
    this._ctx = null;
    this._container = null;
    this._curves = [];
  }
}
