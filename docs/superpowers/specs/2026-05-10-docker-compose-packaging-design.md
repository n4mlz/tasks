# Task Platform Docker Compose Packaging Design

## Summary

Task Platform を Docker Compose で一式起動できるようにする。起動単位は `web` と `mcp` を分離せず、既存の `pnpm dev` をそのまま使って 1 コンテナで同時起動する。環境変数は Compose 起動時に `.env` から注入し、公開ポートと SQLite DB パスも同じ経路で制御できるようにする。

## Goals

- `docker compose up` で開発用途の Task Platform 一式を起動できる
- `.env` を Compose から読み込み、内部 planner 向け設定を注入できる
- Web UI の公開ポートを `PORT` で変えられる
- SQLite の保存先を環境変数で外出しできる
- 既存のローカル `pnpm dev` 運用と意味を揃える

## Non-Goals

- `web` と `mcp` を別コンテナに分割すること
- 本番用の最適化済みイメージを作ること
- Kubernetes や cloud deploy 向け構成を追加すること
- Compose 上で外部 LLM サービス自体を同梱すること

## Constraints And Existing Context

- ルート `package.json` の `pnpm dev` は `pnpm dev:web` と `pnpm dev:mcp` を並列起動する
- `apps/web` は Next.js dev server を `next dev` で起動する
- `apps/mcp` は `tsx watch src/server.ts` を使う
- DB パスは `TASK_PLATFORM_DB` 未指定時に workspace 直下の `task-platform.db` を使う
- `.env` はすでに app 内 planner の provider 設定に使う前提で README に記載がある

## Proposed Approach

単一のルート `Dockerfile` を追加し、pnpm workspace 全体をインストールした Node ベースイメージを作る。Compose は単一サービスだけを持ち、そのサービスが `pnpm dev` を実行する。これにより既存のローカル起動フローと Docker 起動フローを一致させる。

Compose 側では `env_file` でリポジトリ直下の `.env` を読み込む。これで planner 向けの `TASK_PLATFORM_LLM_*` 設定をそのままコンテナへ渡せる。追加で `PORT`、`HOST`、`TASK_PLATFORM_DB` も `environment` で明示し、必要なら `.env` から上書きできる構成にする。

Web UI はコンテナ外からアクセスできるよう、`HOST=0.0.0.0` をデフォルトで渡す。公開ポートは Compose の `ports` で `${PORT:-3000}:3000` ではなく、コンテナ内外のポート番号を揃えるため `${PORT:-3000}:${PORT:-3000}` を使う。Next.js 側が `PORT` を読んでそのポートで listen する前提に合わせる。

SQLite の永続化は `TASK_PLATFORM_DB` をコンテナ内の専用ディレクトリに向け、Compose volume をそのディレクトリへマウントする形を第一候補にする。これによりソースツリーへ DB ファイルを書かず、再作成時もデータが保持される。

## File Changes

### New `Dockerfile`

- ベースは Node LTS を使う
- `corepack enable` で pnpm を使えるようにする
- workspace マニフェストと各 package manifest を先にコピーして依存インストール層を安定化させる
- その後にソース全体をコピーする
- デフォルト command は持たず、Compose 側から `pnpm dev` を渡す

この Dockerfile は開発起動用であり、ホットリロードを完全保証するための bind mount 前提にはしない。まずは再現可能な一式起動を優先する。

### New `compose.yml`

- サービスは 1 つだけにする
- `build` は repo root の `Dockerfile` を参照する
- `command` は `pnpm dev`
- `env_file` で `.env` を読む
- `environment` で最低限次を扱う
  - `HOST=0.0.0.0`
  - `PORT=${PORT:-3000}`
  - `TASK_PLATFORM_DB=${TASK_PLATFORM_DB:-/data/task-platform.db}`
- `ports` は `${PORT:-3000}:${PORT:-3000}`
- `volumes` は SQLite 保存先用に named volume を `/data` へマウントする

### README Updates

- Docker / Compose セクションを追加する
- `.env` を使った起動手順を書く
- ポート変更例を `PORT=3001 docker compose up --build` として示す
- DB 永続化の保存場所と `TASK_PLATFORM_DB` の上書き例を書く

## Runtime Behavior

1. `docker compose up --build` を実行する
2. Compose が `.env` を読み、planner 用設定とポート設定をコンテナへ渡す
3. コンテナ内で `pnpm dev` が `web` と `mcp` を並列起動する
4. `web` は `HOST` と `PORT` に従って listen する
5. `mcp` は同一コンテナ内で watch 起動し、外部公開はしない
6. SQLite DB は `/data` 配下へ保存され、named volume で保持される

## Error Handling And Operational Notes

- `.env` がなくても Compose 自体は起動できるが、planner に必要な設定が足りないと該当機能は失敗しうる
- `PORT` を変更した場合、Compose の公開ポートと Next.js の listen ポートが同じ値になる必要がある
- `TASK_PLATFORM_DB` を `/data` 外へ変更した場合、その保存先が volume 対象でなければコンテナ再作成時に消える
- 1 コンテナで 2 プロセスを動かすため、本番の process supervision には向かないが、今回の開発向け要件には十分

## Testing Strategy

- `docker compose config` で変数展開後の Compose 定義を検証する
- `docker compose up --build` でイメージ build と起動が通ることを確認する
- `http://localhost:<PORT>` で Web UI に到達できることを確認する
- `.env` を使った状態でアプリが起動し、DB ファイルが volume 配下へ作成されることを確認する
- README のコマンドが実際の構成と一致していることを見直す

## Rejected Alternatives

### `web` と `mcp` を別サービスにする

将来的な分離には向くが、今回の要件では常に一緒に起動できれば十分であり、Compose と運用説明が複雑になるため見送る。

### app ごとに別 Dockerfile を置く

workspace 依存の扱いが重複し、変更時の保守負荷が増える。単一 Dockerfile の方が現状の repo に自然。

### bind mount 前提の dev container に寄せる

ホットリロード体験は改善できるが、まず必要なのは一式を再現可能に起動する最小構成であり、初回導入の焦点から外れる。
