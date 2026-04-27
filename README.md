# Task Platform

認知負荷を下げることを目的とした、個人用タスク管理基盤のリポジトリです。

このプロジェクトでは、次の 2 つを分離することを重視しています。

- タスク投入、見積もり、余力時間、計画見直しを行うコントロールプレーン
- その日にやることだけを見て進めるデータプレーン

また、Hermes Agent に限らず他のエージェントからも利用できるよう、MCP による function calling を前提に設計しています。

## 現在の内容

この `main` ブランチには、MVP の設計資料と実装計画を置いています。

- 設計 spec: [docs/superpowers/specs/2026-04-27-task-platform-design.md](docs/superpowers/specs/2026-04-27-task-platform-design.md)
- 実装 plan: [docs/superpowers/plans/2026-04-27-task-platform-mvp.md](docs/superpowers/plans/2026-04-27-task-platform-mvp.md)

## ステータス

- `main`: ドキュメントと計画
- 実装本体: feature branch / Pull Request 側で進行中

実装ブランチ側では、セットアップ手順、起動方法、Web UI / MCP server の使い方などを含む、より詳細な README を追加していきます。
