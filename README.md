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

## 使い方

### 現在の実装での基本フロー

この MVP は、次の流れで使う想定です。

1. `Inbox` で task を追加する
2. task 追加や更新をきっかけに schedule proposal を生成する
3. `Proposals` で pending proposal を確認して approve する
4. `Today` で承認済みの schedule slice を見ながら作業する
5. `Week` で capacity と metrics を確認する

### 1. Inbox に task を入れる

まず `Inbox` 画面で task を登録します。

現状の UI では最低限、次を入力できます。

- title
- remaining minutes

ドメイン上は `dueDate` や `urgency` も扱えるため、今後の UI 拡張でここに寄せていく想定です。

### 2. Proposal を作る

task 作成、task 更新、作業記録、capacity 更新は、再スケジューリングのきっかけになります。  
スケジュールは即座に確定されず、まず `proposal` として保存されます。

この設計にしている理由は次のとおりです。

- agent が勝手に日程を確定しないようにする
- 人間が差分や危険信号を確認してから反映できるようにする
- Hermes 以外の agent でも同じ安全モデルを使えるようにする

### 3. Proposal を確認して承認する

`Proposals` 画面では、pending proposal を確認して approve できます。

現状の画面では主に次を見ます。

- proposal id
- 生成理由
- risk flags

この段階で問題なければ approve し、承認済み proposal が current schedule として反映されます。

### 4. Today を見てその日の作業を進める

`Today` 画面では、現在承認されている schedule の slice 一覧を表示します。

目標は、毎日この画面を見れば「今日やるべきこと」が分かる状態にすることです。  
MVP 時点では表示は最小限ですが、思想としてはここがデータプレーンです。

### 5. Week で余力と進捗を確認する

`Week` 画面では、capacity と metrics を確認できます。

確認対象の例:

- その日の available minutes
- buffer minutes
- planned / actual / completed
- at-risk tasks
- pending proposal count

将来的には、ここが週次見直しやバッファ調整の中心画面になります。

## 理想運用

この README は現状の実装だけでなく、このシステムで目指している近い将来の運用像も含みます。

理想的には、次のように回せる状態を目指しています。

1. 思いついた task をすぐ inbox に放り込む
2. agent が残り見積もり、期限、capacity を見て proposal を作る
3. 人間は proposal をざっと確認して承認する
4. 毎日は `Today` の task をこなす
5. 週末や任意のタイミングで `Week` を見ながら余力時間と計画を見直す

この運用で狙っているのは、頭の中に task を抱え込み続けるのではなく、

- 思いついたら inbox に逃がす
- 配分はシステムに寄せる
- 日々は提示された task を進める

という分担にすることです。

## Agent 連携

このプロジェクトは MCP を前提にしており、Hermes Agent に限らず MCP 対応クライアントから利用できます。

### 何を agent に任せるか

MVP の基本方針は、agent に次を任せることです。

- task 一覧や capacity の取得
- schedule proposal の生成
- pending proposal の確認補助
- metrics の取得と状況把握

一方で、schedule の確定は人間承認を前提にしています。

### MCP server の起動

開発中は次で MCP server を起動できます。

```bash
pnpm dev:mcp
```

build 済み成果物を使う場合は、まず build を行います。

```bash
pnpm --filter mcp build
```

### Tool の使い分け

task 操作用:

- `task_create`
- `tasks_list`
- `task_update`
- `task_log_work`

capacity 操作用:

- `capacity_get`
- `capacity_set`

schedule 操作用:

- `schedule_generate`
- `schedule_get_current`
- `schedule_list_proposals`
- `schedule_get_proposal`
- `schedule_approve`
- `schedule_reject`

metrics 取得用:

- `metrics_get`

### Hermes / MCP クライアントでの利用例

#### 例1: task を inbox に追加する

「レポートの下書きを今週中に 2 時間進めたい」という task を入れる場合、agent は `task_create` を呼びます。

入力例:

```json
{
  "title": "レポート下書き",
  "remainingMinutes": 120
}
```

必要なら、この後に `schedule_generate` を呼んで proposal を作らせます。

#### 例2: pending proposal を確認する

agent は `schedule_list_proposals` で pending proposal を集め、必要なら `schedule_get_proposal` で詳細を見ます。

これにより、例えば次のような補助ができます。

- どの task が今日に寄せられたか説明する
- risk flags が付いた理由を要約する
- approve 前に気になる点を列挙する

#### 例3: proposal を承認する

人間が内容を確認して問題ないと判断したら、agent または UI から `schedule_approve` を呼べます。

このときの考え方は、

- 生成は agent が補助できる
- 反映は人間の意思で行う

です。

#### 例4: metrics を見て状況を振り返る

agent は `metrics_get` を使って、予定対実績や危険 task を確認できます。

例えば次のような問いに答えやすくなります。

- 今週は予定どおり進んでいるか
- バッファを使いすぎていないか
- 期限危険 task があるか
- capacity の見直しが必要か

### 運用イメージ

Hermes のような agent を使う場合、日々の会話は次のようなものを想定しています。

- 「Inbox に task を追加して」
- 「今の pending proposal を見せて」
- 「今日やることを要約して」
- 「今週まずそうな task があるか教えて」
- 「この proposal を承認して」

MCP によって、こうした操作を UI と agent の両方から同じモデルで扱えるようにしています。

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
