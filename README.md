# Task Platform

認知負荷を下げながら、日々の実行と週次の見直しを分離して扱うための個人用タスク管理基盤です。

この MVP は次の考え方を中核にしています。

- タスクはまず inbox に入れる
- 期限、残り見積もり、各日の余力時間から日次配分案を自動生成する
- スケジュール変更は即確定ではなく `proposal` として提示する
- ユーザーは `Today` を見てその日の作業を進める
- Hermes Agent などのエージェントは MCP を通じて同じアプリケーション層を利用する

## 現在の実装範囲

MVP として、以下が実装されています。

- `packages/domain`
  - task / capacity / schedule proposal の中核ルール
  - バッファ考慮付きの配分ロジック
  - risk flag を含む schedule summary の生成
- `packages/application`
  - task 作成、task 更新、作業記録、capacity 更新
  - proposal 生成、承認、棄却
  - metrics 取得
- `packages/infrastructure`
  - SQLite 永続化
  - migration
  - task / capacity / proposal / work log / metrics repository
- `packages/scheduler`
  - 状態変更を契機に proposal を再生成する trigger
- `apps/mcp`
  - MCP server
  - task / capacity / schedule / metrics 用 tools
- `apps/web`
  - `Today`
  - `Inbox`
  - `Week`
  - `Proposals`
  - 対応する API routes

## リポジトリ構成

```text
apps/
  mcp/
  web/
packages/
  application/
  contracts/
  domain/
  infrastructure/
  scheduler/
docs/
  superpowers/
    plans/
    specs/
```

## Web UI

Web 側では、次の 4 画面を用意しています。

- `Today`
  - 現在承認されている schedule の slice 一覧を表示
- `Inbox`
  - task の追加
  - task 一覧の確認
- `Week`
  - capacity と近況 metrics の確認
- `Proposals`
  - pending proposal の確認
  - approve 操作

現状の UI は MVP 用の最小構成で、実運用向けの見た目や編集体験は今後拡張する前提です。

## MCP Tools

MCP server では、次の tool 群を公開しています。

- `task_create`
- `tasks_list`
- `task_update`
- `task_log_work`
- `capacity_get`
- `capacity_set`
- `schedule_generate`
- `schedule_get_current`
- `schedule_list_proposals`
- `schedule_get_proposal`
- `schedule_approve`
- `schedule_reject`
- `metrics_get`

基本方針は、agent が直接スケジュールを破壊的に確定するのではなく、proposal を生成し、人間が確認して承認することです。

## 技術スタック

- TypeScript
- pnpm workspace
- Next.js App Router
- Vitest
- zod
- better-sqlite3
- `@modelcontextprotocol/sdk`

## セットアップ

```bash
pnpm install
```

`better-sqlite3` を使うため、環境によってはネイティブ build が必要です。

## 開発コマンド

ルートの `package.json` から次を利用できます。

```bash
pnpm test
pnpm lint
pnpm dev:web
pnpm dev:mcp
pnpm build
```

個別には次も使えます。

```bash
pnpm --filter web build
pnpm --filter mcp build
```

## テストと検証

このブランチでは、少なくとも以下の検証を通しています。

```bash
pnpm test
pnpm --filter mcp build
timeout 60s pnpm --filter web build
```

## ドキュメント

設計と計画は次を参照してください。

- [docs/superpowers/specs/2026-04-27-task-platform-design.md](docs/superpowers/specs/2026-04-27-task-platform-design.md)
- [docs/superpowers/plans/2026-04-27-task-platform-mvp.md](docs/superpowers/plans/2026-04-27-task-platform-mvp.md)

## 今後の拡張候補

- Inbox / task 編集 UI の強化
- proposal 差分表示の改善
- metrics の拡充
- 日次・週次レビュー導線の強化
- LMS や外部サービスとの連携
- habit 管理の分離導入
