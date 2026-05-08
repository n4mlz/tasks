# Task Platform

Task Platform は、個人のタスク管理を `考える面` と `進める面` に分けるための Web ファーストな個人用基盤です。  
思いついた task を `Inbox` に入れ、各日の余力時間と締切をもとにスケジュールし、毎日は `今日` だけ見て進めることを目的にしています。

## 目的

多くの task 管理では、登録した後の

- 今日は何を進めるべきか
- 期限までに安全か
- 余力時間と残り見積もりは釣り合っているか

を結局ユーザーが頭の中で考え続ける必要があります。

このリポジトリは、その認知負荷を減らすために次を目指しています。

- 思いついた task をすぐ外に出す
- 各日の余力時間を Web で管理する
- task の性質を LLM に推定させる
- スケジュールの再配分をシステム側で行う
- 毎日の実行時は `今日` だけ見ればよい状態に近づける

## 現在の構成

このプロジェクトでは、LLM の役割を 2 つに分けています。

- `MCP`
  - 外部エージェントが app の状態を読む/更新するための面です。
  - OpenClaw や Hermes Agent が task の進み具合、余力時間、metrics を確認する用途を想定しています。
- `app 内部 LLM`
  - app 自身が task の性質推定と再配分に使う面です。
  - `.env` で指定した OpenAI 互換 endpoint、または OpenAI / Anthropic provider に接続できます。

つまり、

- `LLM -> app` は MCP
- `app -> LLM` は内部 planner

という分離です。

## できること

現時点では次が動きます。

- `Inbox` で task を追加する
- task 追加後、落ち着いたタイミングで LLM によって
  - `taskType`
  - `cognitiveLoad`
  - `energy`
  - `tags`
  を推定する
- 推定結果を使って current schedule を自動再計算する
- task のタイトル、必要な時間、期限、状態、メモを更新する
- task を削除する
- 日ごとの余力時間を月カレンダー上で編集する
- `今日` 画面から作業記録を入力する
- `最後に再配分した時刻` と `次回あと何分で再配分するか` を見る
- `ログ` 画面で変更履歴と再配分履歴を見る
- `今日` と `計画` で current schedule と基本 metrics を見る
- `ダッシュボード` で週次と task 別の推移を見る
- MCP tools から task / capacity / metrics / current schedule / planning health にアクセスする
- `Today` から、今日に割り当たっていない active task の作業記録も入れる

## 画面

Web UI は現在 5 画面です。

- `今日` (`/`)
  - 今日の task 列を見る画面です。
  - `作業記録` モーダルから、進めた時間と残り時間を入力できます。
  - `他の task を記録` から、今日に割り当たっていない active task も記録できます。
- `Inbox` (`/inbox`)
  - task を追加する画面です。
  - 既存 task の編集と削除もここで行えます。
- `計画` (`/week`)
  - 月カレンダーで日ごとの余力時間を編集します。
  - 横には task 一覧、残り時間、進捗率、見込み配分が出ます。
- `ダッシュボード` (`/dashboard`)
  - 直近 8 週間の `予定時間 / 実績時間` を週次で見ます。
  - task を 1 つ選び、その task の週次推移も見られます。
- `ログ` (`/logs`)
  - 何を変更したか、いつ自動再配分が走ったかを見る画面です。
  - 検証エラーや再配分理由もここで確認できます。

`提案` 画面はありません。  
以前の proposal 承認フローは廃止し、`一定時間変更が止まった後に自動で再配分する` 方式に置き換えています。

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
docs/
  superpowers/
```

## セットアップ

### 前提

- Node.js
- pnpm

### インストール

```bash
pnpm install
```

### 開発起動

```bash
pnpm dev
```

個別起動もできます。

```bash
pnpm dev:web
pnpm dev:mcp
```

通常、Web UI は `http://localhost:3000` で開きます。

### DB

SQLite ファイルはデフォルトでリポジトリ直下の `task-platform.db` に作られます。  
変更したい場合は `TASK_PLATFORM_DB` を指定します。

```bash
TASK_PLATFORM_DB=/tmp/task-platform.db pnpm dev
```

## LLM 設定

app 内部 planner は、次の環境変数で provider を切り替えます。

- `TASK_PLATFORM_LLM_PROVIDER`
  - `openai-compatible`
  - `openai`
  - `anthropic`
- `TASK_PLATFORM_LLM_MODEL`
- `TASK_PLATFORM_LLM_BASE_URL`
  - `openai-compatible` のときに使用
- `TASK_PLATFORM_LLM_API_KEY`
- `TASK_PLATFORM_LLM_SUPPORTS_STRUCTURED_OUTPUTS`
  - `true` / `false`
- `TASK_PLATFORM_LLM_TIMEOUT_MS`
  - 自動再配分で内部 LLM を待つ最大時間

### ローカル OpenAI 互換 LLM の例

```bash
TASK_PLATFORM_LLM_PROVIDER=openai-compatible
TASK_PLATFORM_LLM_MODEL=your-local-model
TASK_PLATFORM_LLM_BASE_URL=http://127.0.0.1:1234/v1
TASK_PLATFORM_LLM_API_KEY=local
TASK_PLATFORM_LLM_SUPPORTS_STRUCTURED_OUTPUTS=true
TASK_PLATFORM_LLM_TIMEOUT_MS=20000
```

この設定で、自動再配分時にローカル LLM へ structured output を要求します。  
structured output が使えない provider では plain JSON 形式に切り替えて推論します。  
推論に失敗した場合は `再配分失敗` として記録し、簡易推定にはフォールバックしません。

## 最初の使い方

最小フローは次です。

1. `計画` で日ごとの余力時間を入れる
2. `Inbox` で task を追加する
3. 変更が止まると自動再配分を待つ
4. `今日` でその日の task を進める
5. 作業後に `作業記録` を入れる
6. `ダッシュボード` で週次や task 別の進み方を見る
7. `ログ` で変更履歴と再配分履歴を見る

## 運用イメージ

### task を追加する

`Inbox` では次を入力します。

- タイトル
- 必要な時間
- 期限
- メモ

その後 `追加` を押すと、

- 変更が保存され
- 一定時間変更が止まると task の性質推定
- current schedule の再計算
- 必要時間・期限・余力時間に矛盾がないかの validation

をバックグラウンドで行います。

### 余力時間を入れる

`計画` 画面の月カレンダーから日付を押すと、その日の余力時間をモーダルで編集できます。  
ここで入れる値は、`その日に task に使える最大時間` です。

変更後はすぐに重い推論をせず、最後の変更から 3 分以上経ってから自動再配分します。
必要なら header の `3分延長` から次回実行を後ろにずらせます。

### 作業を記録する

`今日` 画面の `作業記録` から、

- 進めた時間
- 残り時間
- 完了扱いにするか

を入力できます。  
保存後は変更履歴に積まれ、落ち着いたタイミングで自動再配分されます。

その日に割り当たっていない task を進めた場合でも、`他の task を記録` から記録できます。  
未完了なら `remainingMinutesAfter` が更新され、次回の自動再配分で残り作業として持ち越されます。

### 自動再配分

自動再配分は即時ではなく、次の条件で走ります。

- 何らかの変更が入っている
- 最後の変更から 3 分以上経過している
- その変更 revision に対してまだ再配分していない

各日の `availableMinutes` は、その日に task に使ってよい最大時間です。  
scheduler は原則としてその 80% を通常予算、残り 20% をバッファとして扱います。通常予算内で収まる限りはバッファを残し、期限や総量の都合で必要なときだけバッファを使います。

再配分中にさらに変更が入った場合、その実行結果は current schedule に採用せず、`再実行待ち` のまま次の tick に回します。

### ログ

`ログ` 画面では次を確認できます。

- task 追加、編集、削除
- 余力時間の編集
- 作業記録の追加
- 自動再配分の実行履歴
- 検証エラーや実行エラー

## ダッシュボード

`ダッシュボード` では、入力や再配分ではなく、進み方の傾向を確認します。

- `週次`
  - 直近 8 週間の `予定時間` と `実績時間` を並べて表示します。
  - 今週の予定、実績、達成率、完了 task 数も確認できます。
- `タスク別`
  - task を 1 つ選び、その task の直近 8 週間の `予定時間` と `実績時間` を見ます。
  - 全体時間、残り時間、進捗率、期限、累計実績も確認できます。

## MCP 連携

MCP は外部エージェントが app の状態を読む/操作するための面です。  
現在の tool は次です。

- task
  - `task_create`
  - `tasks_list`
- `task_update`
- `task_delete`
- `task_log_work`
- `work_logs_list`
- capacity
  - `capacity_get`
  - `capacity_set`
- schedule
  - `schedule_get_current`
- metrics
  - `metrics_get`
- `planning_health_get`
  - `scheduler_status_get`
  - `scheduler_delay`
  - `scheduler_logs_list`

### 想定用途

- Hermes Agent が task の増減や進み具合を確認する
- OpenClaw が metrics を読み、日次/週次の振り返りを支援する
- エージェントが `capacity` や task 更新を補助する

MCP 側は監視面・操作面であり、task 性質推定や自動再配分そのものは app 内部 LLM が担当します。

## 開発用コマンド

```bash
pnpm test
pnpm --filter mcp build
pnpm --filter web build
```

補足として、`web build` では `workspace-path.ts` 起因の NFT trace warning が出ることがありますが、現状 build 自体は通ります。

## 補足

詳細な設計メモは以下を参照してください。

- [docs/superpowers/specs/2026-04-27-task-platform-design.md](docs/superpowers/specs/2026-04-27-task-platform-design.md)
