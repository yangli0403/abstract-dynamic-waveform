/**
 * 网格渲染器 (GridRenderer)
 *
 * 使用DOM元素渲染网格式音频可视化。
 * 灵感来自LiveKit Agents UI的grid可视化器。
 *
 * 特点：
 * - 网格布局，单元格亮度由频段数据驱动
 * - 高亮序列产生扫描动画效果
 * - 支持情感颜色映射
 */

import type { IRenderer } from './IRenderer';
import type { AgentState, RendererType } from '../types';
import type { FrameData, GridRendererConfig } from '../types';
import { hslToString, hslaToString } from '../utils/hsl';
import { clamp } from '../utils/math';

const DEFAULT_CONFIG: GridRendererConfig = {
  rows: 5,
  cols: 7,
  cellSize: 8,
  cellGap: 4,
  cellRadius: 2,
};

export class GridRenderer implements IRenderer {
  readonly type: RendererType = 'grid';

  private _container: HTMLElement | null = null;
  private _wrapper: HTMLElement | null = null;
  private _cells: HTMLElement[] = [];
  private _config: GridRendererConfig;

  constructor(config?: Partial<GridRendererConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  mount(container: HTMLElement): void {
    this._container = container;

    this._wrapper = document.createElement('div');
    this._wrapper.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${this._config.cols}, ${this._config.cellSize}px);
      grid-template-rows: repeat(${this._config.rows}, ${this._config.cellSize}px);
      gap: ${this._config.cellGap}px;
      align-items: center;
      justify-content: center;
      width: fit-content;
      margin: auto;
    `;

    this._cells = [];
    const totalCells = this._config.rows * this._config.cols;
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.style.cssText = `
        width: ${this._config.cellSize}px;
        height: ${this._config.cellSize}px;
        border-radius: ${this._config.cellRadius}px;
        background-color: hsl(210, 30%, 20%);
        transition: background-color 150ms ease-out, opacity 150ms ease-out, box-shadow 200ms ease-out;
        opacity: 0.2;
      `;
      this._cells.push(cell);
      this._wrapper.appendChild(cell);
    }

    this._container.appendChild(this._wrapper);
  }

  draw(frame: Readonly<FrameData>): void {
    if (!this._wrapper || this._cells.length === 0) return;

    const { color, shape, dynamic, bands, highlightedIndices } = frame;
    const primaryColor = hslToString(color.primary);
    const glowColor = hslaToString(color.glow, dynamic.glowIntensity);

    for (let i = 0; i < this._cells.length; i++) {
      const cell = this._cells[i];
      const isHighlighted = highlightedIndices.includes(i);

      // 频段数据映射到单元格亮度
      const bandIdx = i % (bands.length || 1);
      const bandValue = bands.length > 0 ? bands[bandIdx] : 0;
      const brightness = clamp(bandValue * shape.amplitude, 0, 1);

      if (isHighlighted) {
        cell.style.backgroundColor = primaryColor;
        cell.style.opacity = String(clamp(0.5 + brightness * 0.5, 0.5, 1));
        if (dynamic.glowIntensity > 0.1) {
          cell.style.boxShadow = `0 0 ${dynamic.glowIntensity * 6}px ${glowColor}`;
        }
      } else {
        cell.style.backgroundColor = hslToString(color.secondary);
        cell.style.opacity = String(clamp(0.1 + brightness * 0.3, 0.1, 0.5));
        cell.style.boxShadow = 'none';
      }
    }
  }

  onStateChange(_state: AgentState): void {
    // 网格渲染器通过highlightedIndices响应状态
  }

  resize(): void {
    // DOM渲染器自动响应
  }

  dispose(): void {
    if (this._wrapper && this._container) {
      this._container.removeChild(this._wrapper);
    }
    this._cells = [];
    this._wrapper = null;
    this._container = null;
  }
}
