# Docker Compose Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a root `Dockerfile` and single-service `compose.yml` so Task Platform can start both `web` and `mcp` together with `.env` injection, configurable web port, and persistent SQLite storage.

**Architecture:** Build one workspace-aware Node image from the repository root, then run the existing `pnpm dev` entrypoint inside a single Compose service. Keep runtime configuration in Compose through `env_file` and explicit environment variables so Docker startup matches the current local development workflow.

**Tech Stack:** Docker, Docker Compose, Node.js, pnpm workspace, Next.js, tsx

---

### Task 1: Add the root Docker build definition

**Files:**
- Create: `Dockerfile`
- Modify: `package.json`
- Test: `Dockerfile`

- [ ] **Step 1: Write the failing test**

Create a temporary assertion in `package.json` by adding a script entry that assumes the Dockerfile exists:

```json
{
  "scripts": {
    "verify:dockerfile": "test -f Dockerfile"
  }
}
```

This test should fail before `Dockerfile` is created because the file is missing.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm verify:dockerfile`

Expected: FAIL with a shell error indicating `Dockerfile` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `Dockerfile` with a workspace-aware development image:

```dockerfile
FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.config.ts vitest.workspace.ts ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mcp/package.json apps/mcp/package.json
COPY packages/application/package.json packages/application/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/infrastructure/package.json packages/infrastructure/package.json

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
```

Keep the image intentionally simple and aligned with the development-only goal.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm verify:dockerfile`

Expected: PASS with exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add package.json Dockerfile
git commit -m "build: add docker workspace image"
```

### Task 2: Add single-service Compose startup with `.env` injection

**Files:**
- Create: `compose.yml`
- Modify: `package.json`
- Test: `compose.yml`

- [ ] **Step 1: Write the failing test**

Extend the temporary verification script in `package.json` so it also expects the Compose file to exist:

```json
{
  "scripts": {
    "verify:dockerfile": "test -f Dockerfile",
    "verify:compose": "test -f compose.yml"
  }
}
```

This test should fail before `compose.yml` exists.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm verify:compose`

Expected: FAIL with a shell error indicating `compose.yml` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `compose.yml` with one service that runs the existing workspace dev command and reads `.env`:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    command: pnpm dev
    env_file:
      - .env
    environment:
      HOST: 0.0.0.0
      PORT: ${PORT:-3000}
      TASK_PLATFORM_DB: ${TASK_PLATFORM_DB:-/data/task-platform.db}
    ports:
      - "${PORT:-3000}:${PORT:-3000}"
    volumes:
      - task-platform-data:/data

volumes:
  task-platform-data:
```

This keeps `web` and `mcp` coupled intentionally and persists the SQLite file outside the container filesystem.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm verify:compose`

Expected: PASS with exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add package.json compose.yml
git commit -m "build: add docker compose dev startup"
```

### Task 3: Document Docker usage and verify configuration

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Test: `README.md`

- [ ] **Step 1: Write the failing test**

Add a verification script that checks the README includes the new Docker entry points:

```json
{
  "scripts": {
    "verify:docker-docs": "rg -n \"docker compose up --build|PORT=3001 docker compose up --build|TASK_PLATFORM_DB\" README.md"
  }
}
```

This should fail until the README contains those documented commands.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm verify:docker-docs`

Expected: FAIL because the Docker compose commands are not yet documented in `README.md`.

- [ ] **Step 3: Write minimal implementation**

Update `README.md` with a Docker / Compose section that includes:

````md
### Docker Compose

`.env` をリポジトリ直下に置いたうえで、次で一式起動できます。

```bash
docker compose up --build
```

Web UI はデフォルトで `http://localhost:3000` に公開されます。

ポートを変えたい場合は `PORT` を指定します。

```bash
PORT=3001 docker compose up --build
```

SQLite はデフォルトで Compose volume 上の `/data/task-platform.db` に保存されます。保存先を変えたい場合は `TASK_PLATFORM_DB` を指定します。

```bash
TASK_PLATFORM_DB=/data/custom-task-platform.db docker compose up --build
```
````

Then replace the temporary verification scripts in `package.json` with a small grouped set:

```json
{
  "scripts": {
    "verify:dockerfile": "test -f Dockerfile",
    "verify:compose": "test -f compose.yml",
    "verify:docker-docs": "rg -n \"docker compose up --build|PORT=3001 docker compose up --build|TASK_PLATFORM_DB\" README.md",
    "verify:docker": "pnpm verify:dockerfile && pnpm verify:compose && pnpm verify:docker-docs"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm verify:docker`

Expected: PASS, showing all three verification scripts succeed.

- [ ] **Step 5: Commit**

```bash
git add README.md package.json
git commit -m "docs: add docker compose usage"
```

### Task 4: Validate Compose behavior end-to-end

**Files:**
- Modify: `compose.yml`
- Modify: `Dockerfile`
- Test: `compose.yml`

- [ ] **Step 1: Write the failing test**

Run the Docker-native configuration validation before making any final adjustments:

```bash
docker compose config
```

Treat any interpolation error, invalid key, or malformed output as the failing test that must be corrected in `Dockerfile` or `compose.yml`.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose config`

Expected: If the configuration is incomplete or malformed, FAIL with a Compose validation error that identifies the invalid field or substitution issue. If it already passes, proceed immediately to the next step and treat the next command as the first red test instead.

- [ ] **Step 3: Write minimal implementation**

Adjust `compose.yml` or `Dockerfile` only if validation reveals a concrete issue. Typical minimal fixes include:

```yaml
services:
  app:
    env_file:
      - .env
```
or
```dockerfile
WORKDIR /app
```

Do not add extra services, production process managers, or bind mounts unless validation proves they are required.

- [ ] **Step 4: Run test to verify it passes**

Run these commands in order:

```bash
docker compose config
docker compose up --build
```

Expected:
- `docker compose config` prints the fully rendered configuration without errors
- `docker compose up --build` completes the build and starts the app container
- The logs show both `pnpm dev:web` and `pnpm dev:mcp` starting
- The web server listens on `0.0.0.0:<PORT>`

If the container starts cleanly, stop it with `Ctrl+C` after confirming startup.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile compose.yml package.json README.md
git commit -m "test: validate docker compose packaging"
```
