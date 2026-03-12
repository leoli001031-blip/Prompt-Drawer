# Architecture

本文档描述当前 `Prompt Storyboard Manager` 的模块边界、数据流和扩展约定。

目标不是解释每一行实现，而是回答这 3 个问题：

1. 现在的代码应该去哪里看
2. 新功能应该加到哪里
3. 如何避免结构重新长回“大文件 + 混合职责”

## Core Principles

- `App.tsx` 只做页面编排，不承载业务细节
- `hooks/` 负责状态和交互流程
- `components/` 负责渲染和局部 UI 交互
- `lib/` 负责纯函数、数据转换、前端命令封装
- `src-tauri/src/` 负责数据库、AI 请求和 Tauri commands
- 对外接口尽量使用 `动词式 API`，避免页面层堆积 `handle*`

## Current Shape

### Frontend

```text
src/
  App.tsx
  components/
    editor/
    overlays/
    right-panel/
    sidebar/
    workbench/
  hooks/
  lib/
  types/
  utils/
```

### Backend

```text
src-tauri/src/
  main.rs
  support.rs
  types.rs
  ai/
  db/
  workbench/
```

## Frontend Responsibilities

### `App.tsx`

[`src/App.tsx`](/Users/lichenhao/Desktop/code%20x/src/App.tsx)

只负责：

- 组装页面
- 连接 hooks 和 components
- 处理少量页面级切换逻辑
- 维持整体视图流转

不应该继续往里面放：

- 资产保存逻辑
- Block 编辑逻辑
- AI 请求逻辑
- 右键菜单 JSX
- 导入面板 JSX

### `components/`

组件只负责展示和局部输入，不负责持久化。

#### `components/sidebar/`

负责左侧导航：

- 标题区
- 搜索区
- 目录列表
- 新建提示词库 / AI 配置入口

关键文件：

- [`Sidebar.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/sidebar/Sidebar.tsx)
- [`FolderList.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/sidebar/FolderList.tsx)
- [`FolderCard.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/sidebar/FolderCard.tsx)

#### `components/workbench/`

负责工作台列表视图：

- 当前目录概览
- 资产卡片列表
- 单张资产卡片

关键文件：

- [`CurrentFolderOverview.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/workbench/CurrentFolderOverview.tsx)
- [`AssetList.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/workbench/AssetList.tsx)
- [`AssetCard.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/workbench/AssetCard.tsx)

#### `components/editor/`

负责资产编辑主区域：

- 标题、标签、收藏、项目字段
- Block 列表
- Block 卡片
- 编辑区主布局

关键文件：

- [`AssetEditorPane.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/editor/AssetEditorPane.tsx)
- [`AssetHeader.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/editor/AssetHeader.tsx)
- [`BlockList.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/editor/BlockList.tsx)
- [`BlockCard.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/editor/BlockCard.tsx)

#### `components/right-panel/`

负责右侧功能列：

- 导出预览
- AI 开关 / AI 助手 / AI 结果
- 资产操作
- 版本历史

关键文件：

- [`RightPanel.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/right-panel/RightPanel.tsx)
- [`ExportPreviewCard.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/right-panel/ExportPreviewCard.tsx)
- [`AiAssistantCard.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/right-panel/AiAssistantCard.tsx)
- [`AiResultCard.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/right-panel/AiResultCard.tsx)
- [`ActionsCard.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/right-panel/ActionsCard.tsx)
- [`VersionHistoryCard.tsx`](/Users/lichenhao/Desktop/code%20x/src/components/right-panel/VersionHistoryCard.tsx)

#### `components/overlays/`

负责弹层和上下文菜单：

- AI 设置
- 导入面板
- 目录右键菜单
- 资产右键菜单

### `hooks/`

hooks 是当前前端最重要的业务边界。

#### `useWorkbench`

[`useWorkbench.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useWorkbench.ts)

负责：

- 初始加载工作台快照
- 当前目录选择
- 搜索 / 排序 / 收藏过滤
- 派生可见资产列表

#### `useWorkbenchUiState`

[`useWorkbenchUiState.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useWorkbenchUiState.ts)

负责：

- 当前打开的资产
- 导入面板开关
- 文件夹重命名状态
- 右键菜单状态

它只管“界面状态”，不管数据读写。

#### `useWorkbenchActions`

[`useWorkbenchActions.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useWorkbenchActions.ts)

负责页面动作：

- 创建 / 删除目录
- 创建 / 删除 / 复制资产
- 收藏切换
- 导入资产
- 复制项目脚本
- 导出工作台 JSON

如果页面需要一个“跨区域动作”，优先放这里。

#### `useAssetDraft`

[`useAssetDraft.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useAssetDraft.ts)

是资产编辑阶段的组合 hook，内部再分为 3 层：

- [`useAssetPersistence.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useAssetPersistence.ts)
  - 草稿同步
  - 自动保存 / 手动保存
  - 删除确认
  - 导出复制
- [`useBlockEditor.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useBlockEditor.ts)
  - Block 增删改
  - 拖拽排序
  - Block 交互状态
- [`useVersionHistory.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useVersionHistory.ts)
  - 创建版本
  - 恢复版本

#### `useAiAssistant`

[`useAiAssistant.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useAiAssistant.ts)

是 AI 组合层，内部拆为：

- [`useAiProfiles.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useAiProfiles.ts)
  - AI 配置
  - Profile 选择
  - 测试连接
- [`useAiRunner.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useAiRunner.ts)
  - 执行 AI 任务
  - 结果写回当前资产
  - 复制 AI 结果

## Frontend Data Flow

```text
App
  -> useWorkbench
  -> useWorkbenchUiState
  -> useWorkbenchActions
  -> useAssetDraft
  -> useAiAssistant
  -> components/*
```

更具体一点：

1. `useWorkbench` 提供当前工作台数据
2. `useWorkbenchUiState` 提供当前界面打开状态
3. `useWorkbenchActions` 处理列表页和全局动作
4. `useAssetDraft` 处理当前资产编辑态
5. `useAiAssistant` 处理 AI 配置和 AI 运行
6. 组件只消费这些状态和动作

## Backend Responsibilities

### `main.rs`

[`src-tauri/src/main.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/main.rs)

只负责：

- 模块导入
- command 注册
- 启动 Tauri

不要再把具体数据库逻辑塞回这里。

### `db/`

负责 SQLite 层：

- schema
- connection
- seed

关键文件：

- [`schema.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/db/schema.rs)
- [`connection.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/db/connection.rs)
- [`seed.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/db/seed.rs)

### `workbench/`

负责工作台命令和查询：

- 目录和资产 CRUD
- 快照输出
- 存储描述

关键文件：

- [`commands.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/workbench/commands.rs)
- [`queries.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/workbench/queries.rs)

### `ai/`

负责 AI 相关能力：

- Profile 设置存储
- Prompt 构造
- OpenAI-compatible 请求
- Tauri AI commands

关键文件：

- [`settings.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/ai/settings.rs)
- [`prompts.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/ai/prompts.rs)
- [`client.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/ai/client.rs)
- [`commands.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/ai/commands.rs)

## Naming Conventions

### Hook public API

对外统一使用动词式命名，例如：

- `openAiSettings`
- `saveAiProfile`
- `runAi`
- `saveAsset`
- `createVersion`
- `restoreVersion`
- `createFolder`
- `duplicateAsset`

避免继续新增：

- `handleSaveSomething`
- `handleRunSomething`
- `onHandleSomething`

`handle*` 可以保留在组件内部局部函数中，但尽量不要作为 hook 的公开接口。

### Component props

props 名尽量表达“意图”而不是 DOM 细节：

- `onSelectAiProfile`
- `onSelectAiTaskType`
- `onSelectAiTargetBlock`
- `onBlockPointerDown`
- `onBlockPointerEnter`

### Types

组件和 hook 对外使用的 `Props / Args` 接口统一显式导出，方便：

- 复用类型
- 写测试
- 之后补 Storybook 或文档

## Where New Code Should Go

### 加一个新的页面动作

如果动作会操作工作台数据，并且会被页面多个区域触发，优先放：

- [`useWorkbenchActions.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useWorkbenchActions.ts)

### 加一个新的 Block 编辑行为

优先放：

- [`useBlockEditor.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useBlockEditor.ts)

### 加一个新的保存 / 草稿规则

优先放：

- [`useAssetPersistence.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useAssetPersistence.ts)

### 加一个新的版本功能

优先放：

- [`useVersionHistory.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useVersionHistory.ts)

### 加一个新的 AI 动作或 AI 结果写回方式

优先放：

- [`useAiRunner.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useAiRunner.ts)

如果涉及 provider/profile 管理，放：

- [`useAiProfiles.ts`](/Users/lichenhao/Desktop/code%20x/src/hooks/useAiProfiles.ts)

### 加一个新的弹层 / 右键菜单

优先放：

- `src/components/overlays/`

### 加一个新的后端工作台命令

优先放：

- [`src-tauri/src/workbench/commands.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/workbench/commands.rs)

### 加一个新的 AI 后端能力

优先放：

- [`src-tauri/src/ai/commands.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/ai/commands.rs)
- [`src-tauri/src/ai/client.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/ai/client.rs)
- [`src-tauri/src/ai/prompts.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/ai/prompts.rs)

## Guardrails

后续开发时，尽量守住这几条：

- 不把大段 JSX 再塞回 `App.tsx`
- 不把数据库逻辑再塞回 `main.rs`
- 不让一个 hook 同时管 `数据 + UI + 导航 + AI`
- 新功能优先加在现有边界内，而不是临时在页面层糊一段
- 每次重构后至少跑：
  - `npm run build`
  - `npm test`
  - `cargo check`

## Current Status

当前这套结构已经达到一个比较健康的状态：

- [`App.tsx`](/Users/lichenhao/Desktop/code%20x/src/App.tsx) 已降到约 `458` 行
- [`main.rs`](/Users/lichenhao/Desktop/code%20x/src-tauri/src/main.rs) 已降到约 `40` 行
- 前端已经完成组件层、状态层、动作层的初步解耦
- 后端已经完成 `db / workbench / ai` 模块化

后续迭代重点不再是“大拆”，而是：

- 继续沿现有边界加功能
- 避免回到“所有东西都堆进一个文件”
