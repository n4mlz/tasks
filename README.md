# Task Platform

Task Platform は、個人のタスク管理を `考える面` と `進める面` に分けるための Web ファーストな個人用基盤です。

- 思いついた task は `Inbox` に逃がす
- 日ごとの余力時間を先に決める
- LLM で task の性質を推定する
- 自動再配分で current schedule を更新する
- 毎日は `今日` だけ見て進める

現状の中心は Next.js Web UI です。MCP も同じ application/domain を共有し、stdio と Streamable HTTP の両方で接続できます。

## できること

現在の `main` で確認できる機能は次です。

- `Inbox` で task を追加する
- task のタイトル、残り時間、期限、メモ、完了状態を更新する
- task を削除する
- task 追加後や更新後に、LLM が `taskType` `cognitiveLoad` `energy` `tags` を推定する
- 推定結果と期限、余力時間をもとに current schedule を自動再計算する
- `計画` 画面の月カレンダーで日ごとの余力時間を編集する
- `今日` 画面から、今日の task と今日に割り当たっていない active task の両方に対して作業記録を入れる
- `ダッシュボード` で直近 8 週間の予定時間 / 実績時間、および task ごとの週次推移を見る
- `ログ` で変更履歴と scheduler 実行履歴を見る
- `planning health` で直近 7 日の余力時間不足や capacity 未設定日を確認する
- `3分延長` と `今すぐ再配分` で scheduler を制御する

## 画面

現在の Web UI は 5 画面です。

- `今日` (`/`)
  - 今日の task 列を表示します
  - 予定時間、実績時間、当日バッファ使用量、計画の有無を見られます
  - `作業記録` と `他の task を記録` から実績を入れます
- `Inbox` (`/inbox`)
  - task を追加します
  - 既存 task の編集と削除も行います
- `計画` (`/week`)
  - 月カレンダーで日ごとの余力時間を編集します
  - task ごとの残り時間、実績、進捗率、配分見込みを見ます
- `ダッシュボード` (`/dashboard`)
  - 直近 8 週間の `予定時間 / 実績時間` を週次で見ます
  - 任意 task の週次推移も見られます
- `ログ` (`/logs`)
  - mutation log と scheduler run log を確認します

proposal 承認フロー専用画面はありません。変更が落ち着いた後に自動再配分する方式です。

## アーキテクチャ

このリポジトリは pnpm workspace 上の TypeScript modular monolith です。

- `apps/web`
  - Next.js 16 / React 19 の Web UI
  - SQLite を直接使う service facade と API route を持ちます
- `apps/mcp`
  - MCP server の tool 定義と runtime/bootstrap
  - stdio と Streamable HTTP の両 transport を持ちます
- `packages/domain`
  - task / capacity / schedule のドメインルール
- `packages/application`
  - use case 群
- `packages/infrastructure`
  - SQLite repository、migration、workspace path 解決
- `packages/contracts`
  - Web と MCP で使う schema 群

Web UI と MCP は同じ application/domain を共有する前提です。

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

これは `web` と `mcp` の両方を並列で起動します。

```bash
pnpm dev:web
pnpm dev:mcp
```

Web UI は通常 `http://localhost:3000` で開きます。

補足:

- `pnpm dev:web` は `next dev`
- `pnpm dev:mcp` は MCP の HTTP endpoint を watch 起動します

### Docker Compose

`.env` をリポジトリ直下に置いたうえで、次で一式起動できます。

```bash
docker compose up --build
```

Compose は単一サービスで `pnpm dev` を実行し、`web` と `mcp` を同じコンテナで起動します。

Web UI はデフォルトで `http://localhost:3000` に公開されます。`compose.yml` は既定で Web と MCP の両方を `0.0.0.0` に publish するので、サーバー上で起動すれば他ホストからも接続できます。ローカル専用に戻したい場合は `WEB_PUBLISH_HOST=127.0.0.1` と `MCP_PUBLISH_HOST=127.0.0.1` を指定します。ポートを変えたい場合は `PORT` を指定します。

```bash
PORT=3001 docker compose up --build
```

SQLite はデフォルトで Compose volume 上の `/data/task-platform.db` に保存されます。保存先を変えたい場合は `TASK_PLATFORM_DB` を指定します。

```bash
TASK_PLATFORM_DB=/data/custom-task-platform.db docker compose up --build
```

Compose は `.env` を `env_file` として読み込み、`TASK_PLATFORM_LLM_*` もそのままコンテナへ渡します。

MCP の Streamable HTTP endpoint も同時に起動します。デフォルトでは `http://localhost:3100/mcp` です。

```bash
MCP_PORT=3101 docker compose up --build
```

外部サーバーで使う場合は、次の 2 つの入口がそのまま使えます。

- Web UI: `http://<server-ip>:3000`
- MCP: `http://<server-ip>:3100/mcp`

host 側 bind を明示したい場合は、次のように指定します。

```bash
WEB_PUBLISH_HOST=0.0.0.0 MCP_PUBLISH_HOST=0.0.0.0 docker compose up --build
```

公開サーバーでは raw HTTP のまま開けるより、reverse proxy 越しに HTTPS 化することを推奨します。MCP 側は `TASK_PLATFORM_MCP_ALLOWED_HOSTS` で host header を絞れます。

`pnpm dev` は Next.js dev server を使うので、別マシンから Web UI を開く場合は dev resource の origin 許可も必要です。必要なら `.env` に `ALLOWED_DEV_ORIGINS=wisteria,100.79.204.14` のように設定してください。

## スクリプト

ルート `package.json` にある主要スクリプトは次です。

```bash
pnpm dev
pnpm dev:web
pnpm dev:mcp
pnpm build
pnpm test
pnpm test:domain
pnpm lint
```

現状の `lint` は formatter ではなく TypeScript build check (`tsc -b --pretty false`) です。

## 永続化

SQLite ファイルはデフォルトでリポジトリ直下の `task-platform.db` に作られます。
変更したい場合は `TASK_PLATFORM_DB` を指定します。

```bash
TASK_PLATFORM_DB=/tmp/task-platform.db pnpm dev
```

相対パスを指定した場合は workspace root から解決されます。

## LLM 設定

planner は `.env` と `.env.local` を workspace root から読み込みます。すでに process に入っている環境変数は上書きしません。

利用する環境変数:

- `TASK_PLATFORM_LLM_PROVIDER`
  - `openai-compatible`
  - `openai`
  - `anthropic`
- `TASK_PLATFORM_LLM_MODEL`
- `TASK_PLATFORM_LLM_BASE_URL`
  - `openai-compatible` のときに必須
- `TASK_PLATFORM_LLM_API_KEY`
- `TASK_PLATFORM_LLM_SUPPORTS_STRUCTURED_OUTPUTS`
  - `true` / `false`
- `TASK_PLATFORM_LLM_TIMEOUT_MS`
  - 既定値は `20000`

### 例: ローカル OpenAI 互換 endpoint

```bash
TASK_PLATFORM_LLM_PROVIDER=openai-compatible
TASK_PLATFORM_LLM_MODEL=your-local-model
TASK_PLATFORM_LLM_BASE_URL=http://127.0.0.1:1234/v1
TASK_PLATFORM_LLM_API_KEY=local
TASK_PLATFORM_LLM_SUPPORTS_STRUCTURED_OUTPUTS=true
TASK_PLATFORM_LLM_TIMEOUT_MS=20000
```

LLM が未設定なら task 分析は失敗として扱われ、簡易ヒューリスティックへのフォールバックはしません。

## scheduler の動き

現在の scheduler は Web server 内でバックグラウンド実行されます。

- relevant mutation が入ると pending になります
- 最後の変更から 3 分経つと再配分対象になります
- `taskPlatform.runSchedulerTick()` は 30 秒ごとに background interval から呼ばれます
- `3分延長` は次回実行時刻を後ろにずらします
- `今すぐ再配分` は強制 tick を投げます

capacity の扱いは次です。

- 各日の `availableMinutes` はその日に task に使ってよい最大時間です
- scheduler は原則としてその 80% を通常予算、残りを reserve として扱います
- 通常予算内で収まるなら reserve を残し、必要なときだけ使います

## 最初の使い方

最小フローは次です。

1. `計画` で今月の余力時間を入れる
2. `Inbox` で task を追加する
3. 変更が落ち着いて自動再配分されるのを待つ
4. `今日` でその日の task を進める
5. 作業後に `作業記録` を入れる
6. `ダッシュボード` で進み方を見る
7. `ログ` で何が起きたか確認する

## Web API

Web UI が使う主な route は次です。

- `POST /api/tasks`
  - task 作成
- `PATCH /api/tasks/:taskId`
  - task 更新
- `POST /api/tasks/:taskId`
  - form submit 用の task 更新
- `POST /api/tasks/:taskId/delete`
  - task 削除
- `POST /api/tasks/:taskId/log-work`
  - 作業記録
- `POST /api/capacity`
  - 余力時間更新
- `GET /api/planning-health`
  - planning health 取得
- `GET /api/planning-month?referenceDate=YYYY-MM-DD`
  - 月カレンダー描画用 payload 取得
- `GET /api/scheduler/status`
  - scheduler 状態取得
- `POST /api/scheduler/delay`
  - 次回再配分を 3 分延長
- `POST /api/scheduler/tick`
  - 強制再配分

`POST` route の多くは `application/json` と `formData` の両方を受けます。

## MCP

`apps/mcp` には現在、次の tool が定義されています。

- `task_create`
- `tasks_list`
- `task_update`
- `task_delete`
- `task_log_work`
- `work_logs_list`
- `capacity_get`
- `capacity_set`
- `schedule_get_current`
- `metrics_get`
- `planning_health_get`
- `scheduler_status_get`
- `scheduler_delay`
- `scheduler_logs_list`
- `scheduler_run`

注意:

- これらの tool schema と server registration は [apps/mcp/src/server.ts](/home/noname/me/workspace/personal/tasks/apps/mcp/src/server.ts:1) にあります

### 接続方法

現在は stdio と Streamable HTTP の両方を実装しています。

ローカル stdio 接続は次です。

```bash
pnpm --filter mcp start
```

`Claude Desktop` などの stdio client には、たとえば次のように設定できます。

```json
{
  "mcpServers": {
    "task-platform": {
      "command": "pnpm",
      "args": [
        "--dir",
        "/absolute/path/to/tasks",
        "--filter",
        "mcp",
        "start"
      ]
    }
  }
}
```

HTTP endpoint を起動したい場合は次です。

```bash
pnpm --filter mcp start:http
```

既定では `http://127.0.0.1:3100/mcp` で待ち受けます。host / port / path は環境変数で変えられます。Docker Compose ではこの endpoint を外部 publish するので、サーバー上では通常 `http://<server-ip>:3100/mcp` から接続します。

- `TASK_PLATFORM_MCP_HOST`
- `TASK_PLATFORM_MCP_PORT`
- `TASK_PLATFORM_MCP_PATH`
- `TASK_PLATFORM_MCP_ALLOWED_HOSTS`

remote MCP URL を受けられる client なら、endpoint は次です。

- ローカル: `http://127.0.0.1:3100/mcp`
- 外部公開時: `https://your-domain.example/mcp` または `http://your-server-ip:3100/mcp`

たとえば `url` ベースの remote MCP 設定を受ける client なら、次のようになります。

```json
{
  "mcpServers": {
    "task-platform-remote": {
      "url": "https://your-domain.example/mcp"
    }
  }
}
```

補足:

- `.env` と `.env.local` は起動時に自動で読みます
- `TASK_PLATFORM_DB` を渡さなければ repo root の `task-platform.db` を使います
- `pnpm --filter mcp build` は型付き build の確認用です
- Web UI を同時に起動している場合、background scheduler は Web 側が担当します
- MCP 単独で使う場合は、task 変更後に `scheduler_run` を呼ぶと current schedule を即時更新できます
- `TASK_PLATFORM_MCP_ALLOWED_HOSTS` を設定すると、公開時でも host header を制限できます

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
docs/
  superpowers/
```

## テストと補助ドキュメント

テストは `vitest` です。

- 全体: `pnpm test`
- domain のみ: `pnpm test:domain`

設計の背景は [docs/superpowers/specs/2026-04-27-task-platform-design.md](/home/noname/me/workspace/personal/tasks/docs/superpowers/specs/2026-04-27-task-platform-design.md:1) にあります。
