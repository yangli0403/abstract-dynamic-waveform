/**
 * 径向渲染器 (RadialRenderer)
 *
 * 使用Canvas渲染环形/径向音频可视化。
 * 灵感来自LiveKit Agents UI的radial可视化器。
 *
 * 特点：
 * - 环形布局，频段数据映射为径向扇区
 * - 支持旋转动画
 * - 支持情感颜色和发光效果
 */

import type { IRenderer } from './IRenderer';
import type { AgentState, RendererType } from '../types';
import type { FrameData, RadialRendererConfig } from '../types';
import { hslToString, hslaToString } from '../utils/hsl';
import { clamp, mapRange } from '../utils/math';

const DEFAULT_CONFIG: RadialRendererConfig = {
  segmentCount: 32,
  innerRadius: 30,
  outerRadius: 60,
  rotationSpeed: 0.5,
};

export class RadialRenderer implements IRenderer {
  readonly type: RendererType = 'radial';

  private _container: HTMLElement | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _config: RadialRendererConfig;
  private _width: number = 0;
  private _height: number = 0;
  private _rotation: number = 0;

  constructor(config?: Partial<RadialRendererConfig>) {
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
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const { color, shape, dynamic, bands, highlightedIndices } = frame;
    const segmentAngle = (Math.PI * 2) / this._config.segmentCount;

    // 更新旋转
    this._rotation += this._config.rotationSpeed * dynamic.speedMultiplier * 0.01;

    for (let i = 0; i < this._config.segmentCount; i++) {
      const startAngle = i * segmentAngle + this._rotation;
      const endAngle = startAngle + segmentAngle * 0.8;

      // 频段数据
      const bandIdx = i % (bands.length || 1);
      const bandValue = bands.length > 0 ? bands[bandIdx] : 0;

      // 计算外半径
      const dynamicRadius = mapRange(
        bandValue * shape.amplitude,
        0, 1,
        this._config.innerRadius,
        this._config.outerRadius
      );

      const isHighlighted = highlightedIndices.includes(i);

      // 绘制扇区
      ctx.beginPath();
      ctx.arc(cx, cy, this._config.innerRadius, startAngle, endAngle);
      ctx.arc(cx, cy, dynamicRadius, endAngle, startAngle, true);
      ctx.closePath();

      if (isHighlighted) {
        ctx.fillStyle = hslToString(color.primary);
        if (dynamic.glowIntensity > 0.1) {
          ctx.shadowColor = hslToString(color.glow);
          ctx.shadowBlur = dynamic.glowIntensity * 10;
        }
      } else {
        ctx.fillStyle = hslaToString(color.secondary, 0.5);
        ctx.shadowBlur = 0;
      }

      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  onStateChange(_state: AgentState): void {
    // 径向渲染器通过动态参数自动响应
  }

  resize(): void {
    if (!this._canvas || !this._container) return;

    const rect = this._container.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

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
  }
}
