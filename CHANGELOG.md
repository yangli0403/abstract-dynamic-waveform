# 变更日志

本项目遵循[语义化版本](https://semver.org/lang/zh-CN/)规范。

---

## [0.1.0] - 2026-02-11

### 新增

- 三段式核心架构：多维音频输入 → 三通道映射核心 → 情感可视化输出
- 四维音频特征提取器：VolumeExtractor、PitchExtractor、SpeedExtractor、EmotionExtractor
- 三通道并行映射：ColorChannel（情感→颜色）、ShapeChannel（特征→形态）、DynamicChannel（节奏→动态）
- 全通道插值器 UnifiedLerp：帧率无关的指数衰减平滑过渡
- 5种渲染器：BarRenderer、ClassicWaveRenderer、iOS9WaveRenderer、GridRenderer、RadialRenderer
- 5种AgentState状态机：connecting → initializing → listening → thinking → speaking
- 6种情感预设：Happy（青蓝）、Sad（紫色）、Calm（白灰）、Angry（红色）、Excited（金黄）、Neutral（蓝灰）
- 动画序列生成器 SequenceGenerator：为每种状态生成独立的动画序列
- 完整的事件系统：stateChange、emotionChange、frameUpdate、audioStart/Stop、rendererChange、error
- 零核心依赖：仅使用Web Audio API + Canvas/DOM标准API
- 完整的TypeScript类型定义

### 文档

- REPO_ANALYSIS.md：SiriWave.js和LiveKit Agents UI深度源代码分析
- ARCHITECTURE.md（v3）：三段式架构设计，含5张Mermaid架构图
- INTERFACE_DESIGN.md：17个核心类的完整接口定义和API契约
- REQUIREMENTS_REFLECTION.md：53项需求对比验证，合规率98%
- TEST_STRATEGY.md：71+测试用例设计，覆盖率目标85%
- README.md：项目概览、API参考、快速开始指南
