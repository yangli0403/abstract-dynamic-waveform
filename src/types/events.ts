/**
 * 事件相关类型定义
 *
 * 定义了事件系统的回调类型和错误处理类型。
 */

import type { AgentState, EmotionType, RendererType, WaveformEvent } from './base';
import type { FrameData } from './rendering';

/** 事件回调类型映射 */
export type WaveformEventCallback<E extends WaveformEvent> =
  E extends 'stateChange' ? (from: AgentState, to: AgentState) => void :
  E extends 'emotionChange' ? (from: EmotionType, to: EmotionType) => void :
  E extends 'frameUpdate' ? (frame: Readonly<FrameData>) => void :
  E extends 'audioStart' ? () => void :
  E extends 'audioStop' ? () => void :
  E extends 'rendererChange' ? (from: RendererType, to: RendererType) => void :
  E extends 'error' ? (error: WaveformError) => void :
  never;

/** 错误类型 */
export interface WaveformError {
  readonly code: WaveformErrorCode;
  readonly message: string;
  readonly cause?: Error;
}

/** 错误码 */
export type WaveformErrorCode =
  | 'AUDIO_PERMISSION_DENIED'
  | 'AUDIO_NOT_SUPPORTED'
  | 'RENDERER_MOUNT_FAILED'
  | 'INVALID_CONFIG'
  | 'STATE_TRANSITION_INVALID';

/** 状态变更回调 */
export type StateChangeCallback = (from: AgentState, to: AgentState) => void;
