# Prompt Storyboard Manager

本地优先的 `AI 提示词 / 分镜工作台`。  
技术栈：`Tauri + React + TypeScript + Tailwind CSS + SQLite`

## What It Does

- 管理提示词库和项目分镜
- 用 Block 方式编辑提示词
- 本地保存到 SQLite
- 支持导出、版本历史、复制、导入
- 支持用户自配 AI 模型做提示词改写与辅助生成

## Tech Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Desktop Shell: Tauri
- Backend: Rust
- Storage: SQLite

## Run Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Start web development mode

```bash
npm run dev
```

### 3. Start Tauri desktop mode

```bash
npm run tauri -- dev
```

### 4. Build frontend

```bash
npm run build
```

### 5. Run tests

```bash
npm test
```

### 6. Check Rust backend

```bash
cd src-tauri
PATH="$HOME/.cargo/bin:/opt/homebrew/opt/rustup/bin:$PATH" cargo check
```

## Project Structure

```text
src/
  components/   UI components
  hooks/        state and page workflows
  lib/          pure logic and frontend bridge layer
  types/        shared TypeScript types
  utils/        formatting, clipboard, browser helpers

src-tauri/src/
  ai/           AI settings, prompts, client, commands
  db/           SQLite schema, connection, seed
  workbench/    workbench queries and commands
  main.rs       thin Tauri entrypoint
```

## Architecture

详细结构说明见：

- [docs/ARCHITECTURE.md](/Users/lichenhao/Desktop/code%20x/docs/ARCHITECTURE.md)

这份文档包含：

- 前后端模块边界
- `App -> hooks -> components -> tauri commands` 数据流
- 新功能应该放在哪里
- 命名约定和后续开发 guardrails

## Common Commands

```bash
npm run build
npm test
npm run tauri -- build --debug
```

## Notes

- SQLite 数据由 Tauri 后端管理
- AI 功能采用用户自配 `Base URL / API Key / Model`
- 当前仓库以本地优先为主，不依赖云同步
