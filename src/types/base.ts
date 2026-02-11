/**
 * 基础枚举和类型定义
 *
 * 本文件定义了系统中所有基础枚举类型，作为整个类型系统的基石。
 */

/** AI代理交互状态 */
export type AgentState = 'connecting' | 'initializing' | 'listening' | 'thinking' | 'speaking';

/** 状态转换事件 */
export type AgentEvent =
  | 'connected'
  | 'initialized'
  | 'speech_detected'
  | 'message_sent'
  | 'ai_responding'
  | 'speech_ended'
  | 'disconnected'
  | 'reconnect';

/** 情感类型（6种基础情感） */
export type EmotionType = 'happy' | 'sad' | 'calm' | 'angry' | 'excited' | 'neutral';

/** 渲染器类型 */
export type RendererType = 'classic' | 'ios9' | 'bar' | 'grid' | 'radial';

/** 波动模式 */
export type WavePattern = 'steady' | 'active' | 'slow' | 'shaking' | 'pulsing' | 'breathing';

/** 间距模式 */
export type SpacingMode = 'uniform' | 'tight' | 'sparse' | 'irregular' | 'jumping';

/** 波形事件类型 */
export type WaveformEvent =
  | 'stateChange'
  | 'emotionChange'
  | 'frameUpdate'
  | 'audioStart'
  | 'audioStop'
  | 'rendererChange'
  | 'error';
