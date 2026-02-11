/**
 * 状态机实现
 *
 * 管理AI代理的5种交互状态（connecting→initializing→listening⇄thinking⇄speaking）
 * 的完整生命周期和转换逻辑。
 */

import type { AgentState, AgentEvent } from '../types';
import type { StateChangeCallback } from '../types';

/** 状态转换规则表 */
const STATE_TRANSITIONS: Record<AgentState, Partial<Record<AgentEvent, AgentState>>> = {
  connecting: {
    connected: 'initializing',
    disconnected: 'connecting',
  },
  initializing: {
    initialized: 'listening',
    disconnected: 'connecting',
  },
  listening: {
    speech_detected: 'listening',
    message_sent: 'thinking',
    disconnected: 'connecting',
  },
  thinking: {
    ai_responding: 'speaking',
    disconnected: 'connecting',
  },
  speaking: {
    speech_ended: 'listening',
    message_sent: 'thinking',
    disconnected: 'connecting',
  },
};

export class StateMachine {
  private _state: AgentState;
  private _listeners: Set<StateChangeCallback> = new Set();

  constructor(initialState: AgentState = 'connecting') {
    this._state = initialState;
  }

  /** 获取当前状态 */
  getState(): AgentState {
    return this._state;
  }

  /**
   * 触发状态转换
   * @param event - 触发事件
   * @returns 是否成功转换
   */
  transition(event: AgentEvent): boolean {
    const transitions = STATE_TRANSITIONS[this._state];
    const nextState = transitions[event];

    if (!nextState) {
      console.warn(
        `[StateMachine] 无效的状态转换: ${this._state} + ${event}。` +
        `允许的事件: ${this.getAllowedEvents().join(', ')}`
      );
      return false;
    }

    const prevState = this._state;
    this._state = nextState;

    // 仅在状态实际变化时通知监听器
    if (prevState !== nextState) {
      this._notifyListeners(prevState, nextState);
    }

    return true;
  }

  /** 强制设置状态（跳过转换规则验证） */
  forceState(state: AgentState): void {
    const prevState = this._state;
    this._state = state;
    if (prevState !== state) {
      this._notifyListeners(prevState, state);
    }
  }

  /** 注册状态变更监听器 */
  onStateChange(callback: StateChangeCallback): void {
    this._listeners.add(callback);
  }

  /** 移除状态变更监听器 */
  offStateChange(callback: StateChangeCallback): void {
    this._listeners.delete(callback);
  }

  /** 获取当前状态下允许的事件列表 */
  getAllowedEvents(): ReadonlyArray<AgentEvent> {
    return Object.keys(STATE_TRANSITIONS[this._state]) as AgentEvent[];
  }

  /** 通知所有监听器 */
  private _notifyListeners(from: AgentState, to: AgentState): void {
    for (const listener of this._listeners) {
      try {
        listener(from, to);
      } catch (err) {
        console.error('[StateMachine] 监听器执行出错:', err);
      }
    }
  }

  /** 销毁 */
  dispose(): void {
    this._listeners.clear();
  }
}
