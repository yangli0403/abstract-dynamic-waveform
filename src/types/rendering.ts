/**
 * 渲染相关类型定义
 *
 * 定义了情感可视化输出（第三段）的所有数据结构。
 */

import type { AgentState, RendererType } from './base';
import type { ColorParams, ShapeParams, DynamicParams } from './mapping';

/** 每帧渲染数据（映射核心→渲染器） */
export interface FrameData {
  readonly state: AgentState;
  readonly timestamp: number;
  readonly color: ColorParams;
  readonly shape: ShapeParams;
  readonly dynamic: DynamicParams;
  readonly bands: ReadonlyArray<number>;
  readonly highlightedIndices: ReadonlyArray<number>;
  readonly phase: number;
}

/** Canvas渲染器通用配置 */
export interface CanvasRendererConfig {
  pixelRatio: number;
  antialias: boolean;
}

/** 经典波形渲染器配置 */
export interface ClassicWaveConfig extends CanvasRendererConfig {
  curveCount: number;
  frequency: number;
  phaseShift: number;
  lineWidth: number;
}

/** iOS9波形渲染器配置 */
export interface iOS9WaveConfig extends CanvasRendererConfig {
  curveCount: number;
  supportLineCount: number;
  globalCompositeOperation: GlobalCompositeOperation;
}

/** 条形渲染器配置 */
export interface BarRendererConfig {
  barCount: number;
  barWidth: number;
  barRadius: number;
  minBarHeight: number;
  maxBarHeight: number;
  gap: number;
  transitionDuration: string;
}

/** 网格渲染器配置 */
export interface GridRendererConfig {
  rows: number;
  cols: number;
  cellSize: number;
  cellGap: number;
  cellRadius: number;
}

/** 径向渲染器配置 */
export interface RadialRendererConfig {
  segmentCount: number;
  innerRadius: number;
  outerRadius: number;
  rotationSpeed: number;
}

/** 序列配置 */
export interface SequenceConfig {
  rendererType: RendererType;
  barCount?: number;
  gridRows?: number;
  gridCols?: number;
  segmentCount?: number;
}

/** 动画序列 */
export interface AnimationSequence {
  readonly frames: ReadonlyArray<SequenceFrame>;
  readonly loop: boolean;
  readonly frameDuration: number;
}

/** 序列帧 */
export interface SequenceFrame {
  readonly highlightedIndices: ReadonlyArray<number>;
  readonly highlightedCoords?: ReadonlyArray<{ x: number; y: number }>;
}

/** 动画配置 */
export interface AnimationConfig {
  fps: number;
  lerpSpeed: number;
}

/** 帧回调类型 */
export type FrameCallback = (timestamp: number, deltaTime: number) => void;
