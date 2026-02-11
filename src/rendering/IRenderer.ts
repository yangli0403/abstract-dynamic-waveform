/**
 * 渲染器接口
 *
 * 所有渲染器必须实现此接口。
 * 系统通过此接口统一调度，上层代码无需关心底层渲染实现。
 */

import type { AgentState, RendererType } from '../types';
import type { FrameData } from '../types';

export interface IRenderer {
  /** 渲染器类型标识 */
  readonly type: RendererType;

  /** 挂载渲染器到指定容器 */
  mount(container: HTMLElement): void;

  /** 每帧绘制调用 */
  draw(frame: Readonly<FrameData>): void;

  /** 状态变更回调 */
  onStateChange(state: AgentState): void;

  /** 响应容器尺寸变化 */
  resize(): void;

  /** 销毁渲染器 */
  dispose(): void;
}
