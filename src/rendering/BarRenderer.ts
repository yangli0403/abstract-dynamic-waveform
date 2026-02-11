/**
 * 条形渲染器 (BarRenderer)
 *
 * 使用DOM元素渲染条形音频可视化，对应用户截图中的效果。
 * 每个条形是一个独立的div元素，通过CSS transition实现平滑动画。
 *
 * 特点：
 * - DOM渲染，易于CSS定制
 * - 支持情感颜色映射
 * - 支持间距模式变化
 * - 条形高度由频段数据驱动
 */

import type { IRenderer } from './IRenderer';
import type { AgentState, RendererType } from '../types';
import type { FrameData, BarRendererConfig } from '../types';
import { hslToString, hslaToString } from '../utils/hsl';
import { clamp, mapRange } from '../utils/math';

const DEFAULT_BAR_CONFIG: BarRendererConfig = {
  barCount: 24,
  barWidth: 3,
  barRadius: 2,
  minBarHeight: 4,
  maxBarHeight: 48,
  gap: 3,
  transitionDuration: '100ms',
};

export class BarRenderer implements IRenderer {
  readonly type: RendererType = 'bar';

  private _container: HTMLElement | null = null;
  private _wrapper: HTMLElement | null = null;
  private _bars: HTMLElement[] = [];
  private _config: BarRendererConfig;
  private _currentState: AgentState = 'connecting';

  constructor(config?: Partial<BarRendererConfig>) {
    this._config = { ...DEFAULT_BAR_CONFIG, ...config };
  }

  /** 挂载渲染器 */
  mount(container: HTMLElement): void {
    this._container = container;

    // 创建wrapper
    this._wrapper = document.createElement('div');
    this._wrapper.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      gap: ${this._config.gap}px;
    `;

    // 创建条形元素
    this._bars = [];
    for (let i = 0; i < this._config.barCount; i++) {
      const bar = document.createElement('div');
      bar.style.cssText = `
        width: ${this._config.barWidth}px;
        height: ${this._config.minBarHeight}px;
        border-radius: ${this._config.barRadius}px;
        transition: height ${this._config.transitionDuration} ease-out,
                    background-color 300ms ease-out,
                    box-shadow 300ms ease-out,
                    opacity 200ms ease-out;
        background-color: hsl(210, 30%, 50%);
        flex-shrink: 0;
      `;
      this._bars.push(bar);
      this._wrapper.appendChild(bar);
    }

    this._container.appendChild(this._wrapper);
  }

  /** 每帧绘制 */
  draw(frame: Readonly<FrameData>): void {
    if (!this._wrapper || this._bars.length === 0) return;

    const { color, shape, dynamic, bands, highlightedIndices } = frame;
    const primaryColor = hslToString(color.primary);
    const glowColor = hslaToString(color.glow, dynamic.glowIntensity);

    // 更新wrapper间距
    const gap = this._getSpacingForMode(shape.spacingMode, shape.spacing);
    this._wrapper.style.gap = `${gap}px`;

    for (let i = 0; i < this._bars.length; i++) {
      const bar = this._bars[i];

      // 获取频段数据（如果bands不够长，循环使用）
      const bandValue = bands.length > 0
        ? bands[i % bands.length]
        : 0;

      // 计算高度
      const isHighlighted = highlightedIndices.includes(i);
      const baseHeight = mapRange(
        bandValue * shape.amplitude,
        0, 1,
        this._config.minBarHeight,
        this._config.maxBarHeight
      );

      // 应用方差（随机高度偏移）
      const varianceOffset = shape.variance > 0
        ? (Math.sin(i * 2.5 + frame.phase * dynamic.speedMultiplier) * shape.variance * 10)
        : 0;

      const height = clamp(
        baseHeight + varianceOffset,
        this._config.minBarHeight,
        this._config.maxBarHeight
      );

      // 设置样式
      bar.style.height = `${height}px`;
      bar.style.backgroundColor = primaryColor;

      // 活跃条形的发光效果
      if (i < shape.activeCount && dynamic.glowIntensity > 0.1) {
        bar.style.boxShadow = `0 0 ${dynamic.glowIntensity * 8}px ${glowColor}`;
      } else {
        bar.style.boxShadow = 'none';
      }

      // 非活跃条形降低透明度
      bar.style.opacity = i < shape.activeCount ? '1' : '0.3';

      // 高亮条形额外处理
      if (isHighlighted) {
        bar.style.backgroundColor = hslToString(color.secondary);
      }
    }
  }

  /** 根据间距模式计算实际间距 */
  private _getSpacingForMode(mode: string, baseSpacing: number): number {
    switch (mode) {
      case 'tight': return Math.max(1, baseSpacing * 0.5);
      case 'sparse': return baseSpacing * 1.5;
      case 'uniform': return baseSpacing;
      case 'irregular': return baseSpacing * (0.5 + Math.random() * 1.0);
      case 'jumping': return baseSpacing * (0.8 + Math.random() * 0.4);
      default: return baseSpacing;
    }
  }

  /** 状态变更回调 */
  onStateChange(state: AgentState): void {
    this._currentState = state;

    // 根据状态调整过渡时长
    if (this._bars.length > 0) {
      const duration = state === 'speaking' ? '80ms' :
                       state === 'thinking' ? '200ms' :
                       state === 'listening' ? '120ms' : '150ms';

      for (const bar of this._bars) {
        bar.style.transitionDuration = duration;
      }
    }
  }

  /** 响应容器尺寸变化 */
  resize(): void {
    // DOM渲染器自动响应容器尺寸，无需额外处理
  }

  /** 销毁渲染器 */
  dispose(): void {
    if (this._wrapper && this._container) {
      this._container.removeChild(this._wrapper);
    }
    this._bars = [];
    this._wrapper = null;
    this._container = null;
  }
}
