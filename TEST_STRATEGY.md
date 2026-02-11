# 实用主义流派 — 测试策略文档

> **项目**：抽象动态波形（Abstract Dynamic Waveform）  
> **阶段**：第6阶段 — 自动化测试  
> **作者**：Manus AI  
> **日期**：2026-02-11

---

## 1. 测试策略概述

本文档定义了抽象动态波形项目的完整测试策略，涵盖单元测试、集成测试、端到端测试和性能测试四个层次。测试框架选用 **Vitest**（与项目已有的devDependencies一致），Mock工具使用Vitest内置的vi.fn()和vi.spyOn()。

### 1.1 测试金字塔

| 层次 | 数量 | 覆盖目标 | 工具 |
|------|------|---------|------|
| **单元测试** | 45+ | 核心算法和工具函数 | Vitest |
| **集成测试** | 15+ | 模块间数据流和协作 | Vitest + Mock |
| **端到端测试** | 5+ | 完整用户流程 | Vitest + DOM Mock |
| **性能测试** | 5+ | 帧率和内存 | Vitest + performance API |

### 1.2 覆盖率目标

| 模块 | 目标覆盖率 |
|------|-----------|
| `src/utils/` | ≥ 95% |
| `src/types/` | N/A（纯类型定义） |
| `src/core/` | ≥ 90% |
| `src/audio/` | ≥ 85% |
| `src/mapping/` | ≥ 90% |
| `src/rendering/` | ≥ 80% |
| `src/index.ts` | ≥ 85% |
| **总体** | **≥ 85%** |

---

## 2. 单元测试用例

### 2.1 工具函数测试 (`src/utils/`)

#### 2.1.1 数学工具 (`math.ts`)

| 测试ID | 测试描述 | 输入 | 期望输出 |
|--------|---------|------|---------|
| UT-M01 | clamp: 值在范围内 | clamp(5, 0, 10) | 5 |
| UT-M02 | clamp: 值低于下限 | clamp(-1, 0, 10) | 0 |
| UT-M03 | clamp: 值高于上限 | clamp(15, 0, 10) | 10 |
| UT-M04 | mapRange: 正常映射 | mapRange(0.5, 0, 1, 0, 100) | 50 |
| UT-M05 | mapRange: 边界值 | mapRange(0, 0, 1, 10, 20) | 10 |
| UT-M06 | lerp: 中间值 | lerp(0, 10, 0.5) | 5 |
| UT-M07 | lerp: 起点 | lerp(0, 10, 0) | 0 |
| UT-M08 | lerp: 终点 | lerp(0, 10, 1) | 10 |
| UT-M09 | randomFloat: 范围内 | randomFloat(0, 1) | 0 ≤ result ≤ 1 |

#### 2.1.2 HSL色彩工具 (`hsl.ts`)

| 测试ID | 测试描述 | 输入 | 期望输出 |
|--------|---------|------|---------|
| UT-H01 | hslToString: 正常值 | {hue:180, saturation:90, lightness:85} | "hsl(180, 90%, 85%)" |
| UT-H02 | hslaToString: 带透明度 | {hue:270, ...}, 0.5 | "hsla(270, 60%, 55%, 0.5)" |
| UT-H03 | lerpHSL: 色相插值（短路径） | {h:10,...}, {h:350,...}, 0.5 | 色相≈0（走短路径） |
| UT-H04 | lerpHSL: 饱和度插值 | {s:20,...}, {s:80,...}, 0.5 | 饱和度≈50 |

#### 2.1.3 插值工具 (`lerp.ts`)

| 测试ID | 测试描述 | 输入 | 期望输出 |
|--------|---------|------|---------|
| UT-L01 | exponentialDecay: 正常衰减 | current=0, target=1, speed=0.1, dt=16 | 0 < result < 1 |
| UT-L02 | exponentialDecay: 帧率无关 | 不同dt但相同总时间 | 结果近似相等 |

### 2.2 核心模块测试 (`src/core/`)

#### 2.2.1 状态机 (`StateMachine.ts`)

| 测试ID | 测试描述 | 操作 | 期望结果 |
|--------|---------|------|---------|
| UT-S01 | 初始状态 | new StateMachine('connecting') | getState() === 'connecting' |
| UT-S02 | 有效转换: connecting→initializing | transition('connected') | 返回true, state='initializing' |
| UT-S03 | 有效转换: initializing→listening | transition('initialized') | 返回true, state='listening' |
| UT-S04 | 有效转换: listening→thinking | transition('speech_detected') | 返回true, state='thinking' |
| UT-S05 | 有效转换: thinking→speaking | transition('ai_responding') | 返回true, state='speaking' |
| UT-S06 | 有效转换: speaking→listening | transition('speech_ended') | 返回true, state='listening' |
| UT-S07 | 无效转换 | connecting + 'speech_detected' | 返回false, state不变 |
| UT-S08 | 状态变更回调 | onStateChange + transition | 回调被调用，参数正确 |
| UT-S09 | forceState | forceState('speaking') | state='speaking'，回调触发 |
| UT-S10 | dispose | dispose() | 回调不再触发 |

#### 2.2.2 动画循环 (`AnimationLoop.ts`)

| 测试ID | 测试描述 | 操作 | 期望结果 |
|--------|---------|------|---------|
| UT-A01 | 启动动画 | start(callback) | callback被调用 |
| UT-A02 | 停止动画 | stop() | callback不再被调用 |
| UT-A03 | deltaTime计算 | 连续两帧 | deltaTime > 0 |
| UT-A04 | dispose | dispose() | 动画停止 |

#### 2.2.3 默认配置 (`config.ts`)

| 测试ID | 测试描述 | 验证内容 | 期望结果 |
|--------|---------|---------|---------|
| UT-C01 | 默认配置完整性 | DEFAULT_CONFIG所有字段 | 所有字段非undefined |
| UT-C02 | 情感预设完整性 | EMOTION_PRESETS.size | === 6 |
| UT-C03 | Happy预设颜色 | EMOTION_PRESETS.get('happy').primary.hue | === 180 |
| UT-C04 | Sad预设颜色 | EMOTION_PRESETS.get('sad').primary.hue | === 270 |
| UT-C05 | Calm预设颜色 | EMOTION_PRESETS.get('calm').primary.hue | === 0 |

### 2.3 音频模块测试 (`src/audio/`)

#### 2.3.1 音量提取器 (`VolumeExtractor.ts`)

| 测试ID | 测试描述 | 输入 | 期望结果 |
|--------|---------|------|---------|
| UT-V01 | 静音输入 | 全零频谱数据 | rms≈0, peak≈0 |
| UT-V02 | 满音量输入 | 全最大值频谱 | rms≈1, peak≈1 |
| UT-V03 | 平滑处理 | 连续输入 | smoothed变化平滑 |

#### 2.3.2 音调提取器 (`PitchExtractor.ts`)

| 测试ID | 测试描述 | 输入 | 期望结果 |
|--------|---------|------|---------|
| UT-P01 | 纯正弦波440Hz | sin(440Hz)时域数据 | frequency≈440, confidence>0.8 |
| UT-P02 | 静音输入 | 全零时域数据 | frequency=0, confidence=0 |
| UT-P03 | 频率范围约束 | 超出范围的频率 | 被钳制到min/max范围 |

#### 2.3.3 语速提取器 (`SpeedExtractor.ts`)

| 测试ID | 测试描述 | 输入 | 期望结果 |
|--------|---------|------|---------|
| UT-SP01 | 无语音活动 | 低能量频谱 | activityRate≈0, isActive=false |
| UT-SP02 | 持续语音 | 高能量频谱 | activityRate≈1, isActive=true |
| UT-SP03 | 间歇语音 | 交替高低能量 | 0 < activityRate < 1 |

#### 2.3.4 情感提取器 (`EmotionExtractor.ts`)

| 测试ID | 测试描述 | 输入 | 期望结果 |
|--------|---------|------|---------|
| UT-E01 | 高能量+高效价 | volume高, pitch高, speed高 | type='happy'或'excited' |
| UT-E02 | 低能量+低效价 | volume低, pitch低, speed低 | type='sad'或'calm' |
| UT-E03 | 手动设置情感 | setManualEmotion('angry') | getCurrentEmotion()='angry' |
| UT-E04 | 清除手动情感 | clearManualEmotion() | 恢复自动检测 |

#### 2.3.5 多频段处理器 (`MultibandProcessor.ts`)

| 测试ID | 测试描述 | 输入 | 期望结果 |
|--------|---------|------|---------|
| UT-MB01 | 频段数量 | process(data) | 返回数组长度=bandCount |
| UT-MB02 | 值范围 | process(data) | 所有值在0~1之间 |
| UT-MB03 | 静音输入 | 全零频谱 | 所有频段≈0 |

### 2.4 映射模块测试 (`src/mapping/`)

#### 2.4.1 颜色通道 (`ColorChannel.ts`)

| 测试ID | 测试描述 | 输入 | 期望结果 |
|--------|---------|------|---------|
| UT-CC01 | Happy映射 | emotion.type='happy' | primary.hue≈180 |
| UT-CC02 | Sad映射 | emotion.type='sad' | primary.hue≈270 |
| UT-CC03 | Calm映射 | emotion.type='calm' | primary.saturation≈10 |
| UT-CC04 | 自定义预设 | registerPreset('custom', ...) | 使用自定义颜色 |

#### 2.4.2 形态通道 (`ShapeChannel.ts`)

| 测试ID | 测试描述 | 输入 | 期望结果 |
|--------|---------|------|---------|
| UT-SC01 | 高音量→高振幅 | volume.smoothed=0.9 | amplitude接近1.0 |
| UT-SC02 | 低音量→低振幅 | volume.smoothed=0.1 | amplitude接近0.1 |
| UT-SC03 | 高音调→紧密间距 | pitch.frequency=400 | spacing较小 |
| UT-SC04 | 低音调→稀疏间距 | pitch.frequency=100 | spacing较大 |

#### 2.4.3 动态通道 (`DynamicChannel.ts`)

| 测试ID | 测试描述 | 输入 | 期望结果 |
|--------|---------|------|---------|
| UT-DC01 | 高语速→快速动画 | speed.activityRate=0.9 | speedMultiplier>1.0 |
| UT-DC02 | 低语速→慢速动画 | speed.activityRate=0.1 | speedMultiplier<1.0 |
| UT-DC03 | 高音量→强发光 | volume.peak=0.9 | glowIntensity接近1.0 |
| UT-DC04 | 波动模式选择 | 不同speed+volume组合 | 返回正确的WavePattern |

#### 2.4.4 全通道插值器 (`UnifiedLerp.ts`)

| 测试ID | 测试描述 | 输入 | 期望结果 |
|--------|---------|------|---------|
| UT-UL01 | 首帧直接设置 | 首次调用lerp() | 输出≈目标值 |
| UT-UL02 | 后续帧平滑过渡 | 连续调用lerp() | 输出逐渐趋近目标 |
| UT-UL03 | 色相短路径插值 | hue从10到350 | 经过0而非180 |

---

## 3. 集成测试用例

### 3.1 音频→映射管线

| 测试ID | 测试描述 | 验证内容 |
|--------|---------|---------|
| IT-01 | 音频特征→颜色通道 | EmotionExtractor输出正确传递到ColorChannel |
| IT-02 | 音频特征→形态通道 | VolumeExtractor+PitchExtractor输出正确传递到ShapeChannel |
| IT-03 | 音频特征→动态通道 | SpeedExtractor+VolumeExtractor输出正确传递到DynamicChannel |
| IT-04 | 三通道→全通道插值器 | 三个通道输出正确汇入UnifiedLerp |
| IT-05 | 全通道插值器→FrameData | 插值后的参数正确封装为FrameData |

### 3.2 状态机→序列生成器

| 测试ID | 测试描述 | 验证内容 |
|--------|---------|---------|
| IT-06 | 状态变更触发序列更新 | StateMachine状态变更后，SequenceGenerator生成新序列 |
| IT-07 | connecting序列 | 生成从中心向外扩散的序列 |
| IT-08 | thinking序列 | 生成波浪式扫描序列 |
| IT-09 | speaking序列 | 生成全频段活跃序列 |

### 3.3 情感切换流程

| 测试ID | 测试描述 | 验证内容 |
|--------|---------|---------|
| IT-10 | setEmotion触发颜色变化 | Happy→Sad时颜色从青蓝过渡到紫色 |
| IT-11 | setEmotion触发形态变化 | Happy→Calm时振幅从高降到低 |
| IT-12 | setEmotion触发动态变化 | Happy→Sad时速度从1.2x降到0.6x |
| IT-13 | 情感变更事件 | setEmotion触发'emotionChange'事件 |

### 3.4 渲染器切换

| 测试ID | 测试描述 | 验证内容 |
|--------|---------|---------|
| IT-14 | 热切换渲染器 | setRenderer('grid')后旧渲染器dispose，新渲染器mount |
| IT-15 | 渲染器切换事件 | setRenderer触发'rendererChange'事件 |

---

## 4. 端到端测试用例

| 测试ID | 测试描述 | 流程 | 验证内容 |
|--------|---------|------|---------|
| E2E-01 | 完整生命周期 | 创建→mount→connectAudio→setEmotion→disconnectAudio→dispose | 无错误，所有事件正确触发 |
| E2E-02 | 状态完整流转 | connecting→initializing→listening→thinking→speaking→listening | 所有状态转换成功 |
| E2E-03 | 情感完整切换 | 依次设置6种情感 | 每次切换颜色/形态/动态正确变化 |
| E2E-04 | 渲染器完整切换 | 依次切换5种渲染器 | 每次切换无错误，旧渲染器正确清理 |
| E2E-05 | 错误恢复 | 传入无效参数 | 不崩溃，触发error事件 |

---

## 5. 性能测试用例

| 测试ID | 测试描述 | 指标 | 目标值 |
|--------|---------|------|--------|
| PT-01 | 帧率稳定性 | 连续1000帧的平均帧间隔 | ≤ 16.7ms (60fps) |
| PT-02 | 帧率波动 | 帧间隔标准差 | ≤ 2ms |
| PT-03 | 内存稳定性 | 运行5分钟后的内存增长 | ≤ 5MB |
| PT-04 | 渲染器切换延迟 | setRenderer()执行时间 | ≤ 50ms |
| PT-05 | 情感切换延迟 | setEmotion()执行时间 | ≤ 5ms |
| PT-06 | 音频处理延迟 | 单帧音频特征提取时间 | ≤ 2ms |

---

## 6. 测试环境配置

### 6.1 Vitest配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/types/**'],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
```

### 6.2 Mock策略

由于本项目依赖Web Audio API和Canvas API，测试环境需要以下Mock：

| API | Mock方式 | 说明 |
|-----|---------|------|
| `AudioContext` | jsdom + 自定义Mock | 模拟AnalyserNode的getFloatFrequencyData |
| `CanvasRenderingContext2D` | jsdom内置 | 基本Canvas操作 |
| `requestAnimationFrame` | vi.useFakeTimers() | 控制帧循环 |
| `performance.now()` | vi.useFakeTimers() | 控制时间戳 |
| `MediaStream` | 自定义Mock | 模拟音频流 |

### 6.3 测试数据生成

```typescript
// tests/helpers/generators.ts

/** 生成指定频率的正弦波时域数据 */
function generateSineWave(frequency: number, sampleRate: number, length: number): Float32Array;

/** 生成指定能量的频谱数据 */
function generateSpectrum(energy: number, length: number): Float32Array;

/** 生成静音数据 */
function generateSilence(length: number): Float32Array;
```

---

## 7. 测试执行计划

### 7.1 执行顺序

| 阶段 | 内容 | 预计时间 |
|------|------|---------|
| 1 | 工具函数单元测试 | 15分钟 |
| 2 | 核心模块单元测试 | 20分钟 |
| 3 | 音频模块单元测试 | 20分钟 |
| 4 | 映射模块单元测试 | 15分钟 |
| 5 | 集成测试 | 25分钟 |
| 6 | 端到端测试 | 15分钟 |
| 7 | 性能测试 | 10分钟 |

### 7.2 持续集成建议

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: pnpm install
      - run: pnpm test -- --coverage
      - uses: codecov/codecov-action@v4
```

---

## 8. 测试结果预期

| 层次 | 用例数 | 预期通过率 |
|------|--------|-----------|
| 单元测试 | 45+ | 100% |
| 集成测试 | 15+ | 100% |
| 端到端测试 | 5+ | 100% |
| 性能测试 | 6 | ≥ 83%（允许1项在CI环境下波动） |
| **总计** | **71+** | **≥ 98%** |

> **注意**：由于本项目的核心模块依赖Web Audio API和Canvas API，完整的端到端测试需要在浏览器环境中运行。jsdom环境下的测试主要验证逻辑正确性，视觉渲染效果需要通过手动测试或视觉回归测试工具（如Playwright）进行补充验证。
