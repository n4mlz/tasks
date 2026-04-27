# Task Platform

Task Platform は、個人のタスク管理を「考える時間」と「実行する時間」に分けるための MVP です。  
思いついたタスクを inbox に入れ、各日の余力と残り見積もりからスケジュール案を作り、人間が承認してからその日の実行計画に反映します。

## このリポジトリの目的

多くのタスク管理ツールは、タスクの登録までは支援しても、その後の「今日は何をやるべきか」「予定は安全か」「見積もりと余力は釣り合っているか」という判断を、結局ユーザーの頭の中に戻しがちです。  
このリポジトリは、その認知負荷を減らすための個人用タスク基盤を作ることを目的にしています。

中核の思想は 2 つあります。

- control plane
  - タスクの追加、残り見積もりの更新、期限や urgency の調整、各日の余力設定のような「計画を整える操作」を扱います。
- data plane
  - 承認済みの計画を見て、その日やることを実行するための面です。理想は「今日は `Today` を見ればよい」状態です。

この分離で目指しているのは、次の運用です。

- 思いついたタスクはすぐ inbox に入れて、頭の中に持ち続けない
- どのタスクをどの日に置くかは、残り見積もり、期限、capacity、buffer を使ってシステム側で案を作る
- スケジュール変更は即時反映せず、必ず `proposal` として提示する
- 人間は proposal の差分や risk を見て承認する
- 日々の実行時は `Today` を見て進め、実績や残り見積もりの変化だけを返す

つまり、このプロジェクトは単なるタスク保存アプリではなく、

- 未完了タスクをワーキングメモリから外す
- 日次計画の生成を手作業から切り離す
- エージェントの支援を使いつつ、最終決定権は人間に残す

ための基盤です。

MCP を前提にしているのもそのためです。  
Web UI と MCP サーバーが同じアプリケーション層を使うことで、ブラウザでもエージェントでも同じルールで扱えます。エージェントは task 作成、capacity 更新、proposal 生成、状況要約を支援できますが、計画の確定を勝手に行わないように設計されています。

## できること

現時点の MVP では次を扱えます。

- タスクを inbox に追加する
- タスクの残り見積もりや状態を更新する
- 日ごとの available minutes / buffer minutes を保存する
- スケジュール案を生成する
- pending proposal を確認して承認する
- 現在の計画と簡単な metrics を確認する
- MCP tools 経由で同じ操作を呼び出す

## 画面構成

Web UI には 4 つの画面があります。

- `Today` (`/`)
  - 承認済みの schedule slices を確認する画面です。
- `Inbox` (`/inbox`)
  - タスク追加と、登録済みタスクの一覧確認を行います。
- `Week` (`/week`)
  - 近況 metrics と capacity を確認します。
- `Proposals` (`/proposals`)
  - pending proposal を確認し、承認します。

現状の UI は最小構成です。  
日常運用では、ブラウザで確認しつつ MCP 対応エージェントと会話して操作する使い方を想定しています。

## リポジトリ構成

```text
apps/
  mcp/   # MCP server
  web/   # Next.js Web UI
packages/
  application/
  contracts/
  domain/
  infrastructure/
  scheduler/
docs/
  superpowers/
```

## セットアップ

### 前提

- Node.js が使えること
- `pnpm` が使えること

### インストール

```bash
pnpm install
```

### 開発起動

```bash
pnpm dev
```

このコマンドで次の 2 つをまとめて立ち上げます。

- Web UI の開発サーバー
- MCP 側の開発プロセス

必要に応じて個別起動もできます。

```bash
pnpm dev:web
pnpm dev:mcp
```

Web UI は通常 `http://localhost:3000` で開きます。

### データ保存先

SQLite ファイルはデフォルトでリポジトリ直下の `task-platform.db` に作られます。  
別の場所を使いたい場合は `TASK_PLATFORM_DB` を指定してください。

```bash
TASK_PLATFORM_DB=/tmp/task-platform.db pnpm dev
```

## 最初の使い方

最小フローは次の 4 ステップです。

1. `Inbox` でタスクを登録する
2. capacity を設定する
3. schedule proposal を生成する
4. `Proposals` で承認して `Today` を見る

`Inbox` は UI からそのまま触れます。  
capacity の更新や proposal の確認は、MCP 導入後にエージェントへ依頼する運用と相性が良いです。

## 利用例

### 1. タスクを inbox に入れる

たとえば、MCP をつないだエージェントに次のように依頼します。

> 「今週中にレポート下書きを 2 時間進めたい。task を追加して」

エージェントは `task_create` を使って inbox に登録し、必要なら続けて schedule 生成まで補助します。

### 2. 1 日の余力を更新する

> 「今日は 4 時間使えて、30 分はバッファにしたい。capacity を更新して」

エージェントは `capacity_set` を使って、その日の available minutes と buffer minutes を反映します。

### 3. proposal を作らせる

> 「今のタスクと余力で、最新の schedule proposal を作って」

エージェントは `schedule_generate` を呼び、pending proposal を作成します。

### 4. proposal を要約させてから承認する

> 「pending proposal を見て、今日に何が入ったかと risk flags を要約して」

エージェントは `schedule_list_proposals` と `schedule_get_proposal` を使って内容を説明できます。  
そのうえで、人間がブラウザの `/proposals` を見て承認する、という流れを想定しています。

### 5. 今日やることを確認する

> 「今日やるべき内容を短くまとめて」

エージェントは承認済み schedule を読み、`Today` 画面と同じ前提で当日の実行内容を要約できます。

## MCP 連携

このリポジトリは MCP 対応エージェントから使う前提で作られています。  
MCP 側では、Web UI と同じアプリケーション層を呼びます。

代表的な tools は次のとおりです。

- task 操作
  - `task_create`
  - `tasks_list`
  - `task_update`
  - `task_log_work`
- capacity 操作
  - `capacity_get`
  - `capacity_set`
- schedule 操作
  - `schedule_generate`
  - `schedule_get_current`
  - `schedule_list_proposals`
  - `schedule_get_proposal`
  - `schedule_approve`
  - `schedule_reject`
- metrics
  - `metrics_get`

### MCP での使い方イメージ

- エージェントが `task_create` で inbox に入れる
- `capacity_set` でその日の余力を更新する
- `schedule_generate` で proposal を作る
- `schedule_list_proposals` と `schedule_get_proposal` で内容を要約する
- 最後の承認は人間が判断する

この「生成は自動、反映は人間承認」という構造が、このプロジェクトの重要な前提です。  
README 上の利用例も、HTTP API を直接叩くより、MCP を通してエージェントに補助させる日常運用を基準にしています。

## 補足

- `pnpm test`
  - テスト一式を実行します。
- `pnpm build`
  - 全ワークスペースをビルドします。

詳細な設計意図を追いたい場合は [docs/superpowers/specs/2026-04-27-task-platform-design.md](docs/superpowers/specs/2026-04-27-task-platform-design.md) を参照してください。
