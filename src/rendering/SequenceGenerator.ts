/**
 * 序列生成器
 *
 * 为不同AgentState生成对应的动画序列。
 * 灵感来自LiveKit Agents UI的序列系统。
 *
 * 每种状态有独特的高亮模式：
 * - connecting: 从中心向外扩散
 * - initializing: 逐行扫描
 * - listening: 中心脉冲
 * - thinking: 波浪式扫描
 * - speaking: 全频段活跃
 */

import type { AgentState } from '../types';
import type { AnimationSequence, SequenceFrame, SequenceConfig } from '../types';

export class SequenceGenerator {
  private _config: SequenceConfig;

  constructor(config: SequenceConfig) {
    this._config = config;
  }

  /** 为指定状态生成动画序列 */
  generate(state: AgentState): AnimationSequence {
    switch (state) {
      case 'connecting':
        return this._generateConnectingSequence();
      case 'initializing':
        return this._generateInitializingSequence();
      case 'listening':
        return this._generateListeningSequence();
      case 'thinking':
        return this._generateThinkingSequence();
      case 'speaking':
        return this._generateSpeakingSequence();
      default:
        return this._generateIdleSequence();
    }
  }

  /** connecting: 从中心向外逐步点亮 */
  private _generateConnectingSequence(): AnimationSequence {
    const count = this._getElementCount();
    const center = Math.floor(count / 2);
    const frames: SequenceFrame[] = [];

    for (let radius = 0; radius <= Math.ceil(count / 2); radius++) {
      const indices: number[] = [];
      for (let i = Math.max(0, center - radius); i <= Math.min(count - 1, center + radius); i++) {
        indices.push(i);
      }
      frames.push({ highlightedIndices: indices });
    }

    return { frames, loop: true, frameDuration: 200 };
  }

  /** initializing: 从左到右逐步扫描 */
  private _generateInitializingSequence(): AnimationSequence {
    const count = this._getElementCount();
    const windowSize = Math.max(3, Math.floor(count * 0.2));
    const frames: SequenceFrame[] = [];

    for (let start = -windowSize; start <= count; start++) {
      const indices: number[] = [];
      for (let i = Math.max(0, start); i < Math.min(count, start + windowSize); i++) {
        indices.push(i);
      }
      frames.push({ highlightedIndices: indices });
    }

    return { frames, loop: true, frameDuration: 80 };
  }

  /** listening: 中心脉冲（中间亮，两边暗） */
  private _generateListeningSequence(): AnimationSequence {
    const count = this._getElementCount();
    const center = Math.floor(count / 2);
    const frames: SequenceFrame[] = [];

    // 脉冲扩张
    for (let radius = 1; radius <= Math.ceil(count / 3); radius++) {
      const indices: number[] = [];
      for (let i = Math.max(0, center - radius); i <= Math.min(count - 1, center + radius); i++) {
        indices.push(i);
      }
      frames.push({ highlightedIndices: indices });
    }

    // 脉冲收缩
    for (let radius = Math.ceil(count / 3); radius >= 1; radius--) {
      const indices: number[] = [];
      for (let i = Math.max(0, center - radius); i <= Math.min(count - 1, center + radius); i++) {
        indices.push(i);
      }
      frames.push({ highlightedIndices: indices });
    }

    return { frames, loop: true, frameDuration: 120 };
  }

  /** thinking: 波浪式扫描（来回） */
  private _generateThinkingSequence(): AnimationSequence {
    const count = this._getElementCount();
    const windowSize = Math.max(2, Math.floor(count * 0.15));
    const frames: SequenceFrame[] = [];

    // 正向扫描
    for (let start = 0; start <= count - windowSize; start++) {
      const indices: number[] = [];
      for (let i = start; i < start + windowSize; i++) {
        indices.push(i);
      }
      frames.push({ highlightedIndices: indices });
    }

    // 反向扫描
    for (let start = count - windowSize; start >= 0; start--) {
      const indices: number[] = [];
      for (let i = start; i < start + windowSize; i++) {
        indices.push(i);
      }
      frames.push({ highlightedIndices: indices });
    }

    return { frames, loop: true, frameDuration: 60 };
  }

  /** speaking: 全频段活跃（所有元素高亮） */
  private _generateSpeakingSequence(): AnimationSequence {
    const count = this._getElementCount();
    const allIndices = Array.from({ length: count }, (_, i) => i);

    return {
      frames: [{ highlightedIndices: allIndices }],
      loop: true,
      frameDuration: 50,
    };
  }

  /** 空闲序列 */
  private _generateIdleSequence(): AnimationSequence {
    return {
      frames: [{ highlightedIndices: [] }],
      loop: true,
      frameDuration: 500,
    };
  }

  /** 获取当前渲染器的元素总数 */
  private _getElementCount(): number {
    switch (this._config.rendererType) {
      case 'bar':
        return this._config.barCount ?? 24;
      case 'grid':
        return (this._config.gridRows ?? 5) * (this._config.gridCols ?? 7);
      case 'radial':
        return this._config.segmentCount ?? 32;
      default:
        return 24;
    }
  }

  /** 更新配置 */
  updateConfig(config: Partial<SequenceConfig>): void {
    this._config = { ...this._config, ...config };
  }
}
