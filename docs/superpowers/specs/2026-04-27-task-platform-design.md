# Task Platform Design

## Overview

This document defines the current target design for the single-user Task Platform.

The system is meant to reduce cognitive load by separating:

- a control plane for task capture, task editing, capacity editing, and schedule inspection
- a daily execution plane where the user mostly looks at today's assigned work and records what was done
- an analysis plane where the user reviews weekly trends and task-by-task progress

The platform is always-on, single-user, Web-first, and available through both a Web UI and an MCP server.

Hermes Agent is an important target consumer, but the integration model must remain agent-agnostic:

- MCP is used for `LLM -> app` monitoring and control
- a provider-compatible LLM endpoint is used for `app -> LLM` task classification and scheduling intent

This revision reflects the current product direction:

- scheduling is deferred and runs automatically after edits settle, rather than on every keystroke
- schedule updates no longer go through a proposal-approval tab
- LLM inference is used for task-shape analysis and scheduling guidance, but final schedules are validated deterministically
- the Web UI must support routine use without requiring MCP
- a dedicated dashboard must expose weekly and per-task progress trends through charts

## Goals

- Let the user offload tasks into Inbox instead of holding them in working memory.
- Provide a trustworthy daily plan where finishing today's list means things are progressing safely.
- Allow arbitrary-date capacity input through a calendar surface.
- Re-run scheduling automatically after changes settle, without interrupting the user mid-edit.
- Validate that the resulting schedule is internally consistent before adopting it.
- Expose the same core state to Web UI and MCP clients.
- Support agent assistance for classification, scheduling, and progress evaluation.
- Make the interface pleasant enough for daily personal use on desktop and mobile.

## Non-Goals

- Habit tracking
- Multi-user support
- External LMS or task-service integration
- Opaque ML optimization
- Push-notification systems
- Complex project / portfolio hierarchy

## Product Model

The product now has five user-facing surfaces:

- `Today`
- `Inbox`
- `計画`
- `ダッシュボード`
- `ログ`

Their responsibilities are intentionally split:

- `Today` is for doing and recording work
- `Inbox` is for adding and lightly editing tasks
- `計画` is for entering available time and inspecting schedule placement
- `ダッシュボード` is for understanding progress trends
- `ログ` is for understanding what changed and when scheduling ran

There is no longer a user-facing proposal review surface.

## Architecture

The system remains a TypeScript modular monolith in a pnpm workspace.

Core principles:

- domain rules live in shared packages
- Web UI and MCP server call the same application layer
- persistence stays abstracted through repositories
- SQLite remains the initial backend
- schedule generation is explainable and deterministic after LLM-assisted ordering
- schedule adoption is immediate only after deterministic validation succeeds

### High-Level Components

#### Web Application

Provides user-facing views for:

- Today
- Inbox
- 計画
- ダッシュボード
- ログ

The Web application must cover routine usage end-to-end:

- create and edit tasks
- delete tasks
- create and edit day capacities
- record work performed
- inspect current schedule
- inspect scheduling state and countdown
- inspect metrics and historical trends

#### HTTP API

Provides JSON endpoints for the Web application.

The API is internal-facing but should remain stable enough that MCP and future clients can mirror the same operations when appropriate.

#### MCP Server

Exposes monitoring and control operations to Hermes Agent and any other MCP-capable client.

MCP is not used as the app's internal scheduling engine. Instead it is used so agents can:

- add, edit, or delete tasks
- record work
- edit capacities
- inspect schedule state
- inspect metrics
- inspect planning health
- delay or trigger scheduling

#### Application Layer

Implements use cases such as:

- create task
- update task
- delete task
- log work
- set capacity
- get current schedule
- get metrics
- get planning health
- get scheduler status
- delay scheduling
- run scheduler tick
- get weekly dashboard summary
- get task dashboard timeline

#### Domain Layer

Contains:

- task model
- capacity model
- schedule model
- scheduling heuristics
- LLM result normalization
- schedule validation
- planning-health rules

#### Infrastructure Layer

Implements:

- SQLite repositories
- migrations
- workspace-root path resolution
- ID generation
- clock abstraction
- scheduler state persistence

#### Scheduler Orchestrator

Handles asynchronous schedule regeneration after relevant mutations:

- task created
- task updated
- task deleted
- work logged
- capacity updated
- explicit immediate run requested
- scheduling delay requested

The scheduler runs in-process on the Web server for now.

## Repository Structure

```text
apps/
  web/
  mcp/
packages/
  domain/
  application/
  infrastructure/
  contracts/
docs/
  superpowers/
    specs/
    plans/
```

## Domain Model

### Task

Fields:

- `id`
- `title`
- `notes`
- `status`: `active | done | archived`
- `remainingMinutes`
- `dueDate` nullable
- `taskType`
- `cognitiveLoad`
- `energy`
- `tags`
- `createdAt`
- `updatedAt`

Design notes:

- `remainingMinutes` remains the central planning quantity
- there is no user-facing `inbox` status; Inbox is a view over active tasks
- task-shape metadata is primarily inferred by the LLM, not manually filled every time
- `energy` means activation cost / body-and-mind effort needed to start and continue the task

### TaskWorkLog

Fields:

- `id`
- `taskId`
- `date`
- `spentMinutes`
- `remainingMinutesAfter`
- `note`

This is the main execution feedback loop for rescheduling and metrics.

### DayCapacity

Fields:

- `date`
- `availableMinutes`

Design notes:

- `availableMinutes` means the maximum amount of time the user is willing to allocate to tasks that day
- buffer is not directly edited by the user
- any internal buffer or caution logic belongs to scheduling heuristics, not to the input surface

### CurrentSchedule

The system stores the active plan directly rather than keeping a user-visible proposal queue.

Core data:

- schedule slices by task and date
- schedule summary
- schedule revision metadata

### SchedulerState

Fields:

- `currentRevision`
- `lastScheduledRevision`
- `lastMutationAt`
- `lastScheduledAt`
- `nextEligibleRunAt`
- `schedulerStatus`: `idle | pending | running | failed`

Purpose:

- debounce scheduling after edits
- avoid running in the middle of active editing
- expose a human-readable countdown to the Web UI
- support safe restart or retry behavior

### SchedulingRunLog

Each run stores:

- revision targeted
- started / finished timestamps
- success / failed / superseded outcome
- readable rationale from the LLM
- validation result
- error message when failed

### PlanningMutationLog

Each planning mutation stores:

- revision
- mutation type
- timestamp
- optional related task/date identifier

This supports the `ログ` page and scheduler reasoning.

## Scheduling Model

Scheduling is delayed rather than immediate.

### Trigger Model

Mutations mark the schedule as dirty:

- task add / edit / delete
- work log
- capacity add / edit

The scheduler becomes eligible when:

- there is an unscheduled revision
- at least 3 minutes have passed since the last mutation
- no scheduler run is currently active

The user may also:

- delay the next run by 3 minutes
- trigger an immediate run

### Concurrency Model

The scheduler must remain safe if edits happen while a run is executing.

Rules:

- a run starts against a fixed `targetRevision`
- if newer changes appear during execution, the finished run may be marked `superseded`
- only a run for the latest applicable revision may become the active schedule
- failed runs must not corrupt the last good schedule

This ensures that leaving the page, reloading, or editing during a run does not produce inconsistent state.

### Horizon Selection

- start at `today`
- end at the latest relevant due date, with at least a near-term planning window
- allow due-today tasks to still be scheduled on today

### Capacity Handling

- read all capacities inside the horizon
- missing capacity behaves as zero capacity
- missing capacity also contributes to planning-health warnings
- if total capacity is clearly insufficient, the scheduler may fail fast and ask the user to revisit the plan

### LLM-Assisted Ordering

The app sends the LLM:

- the new or edited task, including `notes`
- the set of active tasks
- current capacities
- existing task metadata when present

The LLM returns:

- inferred task metadata
- relative scheduling rationale
- ordering / grouping guidance

The LLM is advisory, not authoritative.

The final schedule is still built and validated in application/domain logic.

### Validation

The resulting schedule must be validated before adoption.

Validation must ensure at minimum:

- no slice references an unknown task
- no slice references an unknown date
- no slice has non-positive minutes
- no slice is placed after the latest schedulable date for its task
- no day exceeds its capacity

Unscheduled work is not a structural validation failure by itself.

Instead, unscheduled or under-scheduled work must surface through:

- human-readable warnings
- risk flags
- shortage metrics

### Failure Policy

If LLM inference fails:

- the run becomes `failed`
- the last valid schedule stays active
- the failure appears in `ログ`

The app must not fall back to heuristic pseudo-inference that pretends to be intelligent.

## Planning Health

Planning health is separate from progress metrics.

It must include:

- `missingCapacityDatesWithin7Days`
- `warningCount`
- `shortfallMinutes` for the current horizon when total capacity is insufficient

Rules:

- the warning window is always `today..today+6`
- any date in that range without a capacity row is reported
- if total capacity cannot cover required task time in the relevant horizon, the shortfall is reported

The purpose is to let both the human and the agent notice when planning confidence is degraded.

## Web UI

The UI direction is a modern, quiet planning console.

It must avoid:

- verbose headings and explanation boxes
- raw internal identifiers
- repeated status blocks that do not help decisions

It must prefer:

- compact, human-readable summaries
- minimal but clear interaction affordances
- modal editing where inline editing would overcrowd the surface

### Shared UI Foundation

- Tailwind CSS for layout and responsive behavior
- reusable modal / badge / tab / form primitives
- information-dense but calm visual hierarchy
- Japanese as the main user-facing language

### Today

Purpose:

- show only today's assigned tasks
- let the user record what was done

Must support:

- current-day slices only
- work log modal
- `spent time`
- editable `remaining time`
- complete-task toggle
- compact planning-health warning
- compact scheduler status

### Inbox

Purpose:

- capture tasks quickly
- lightly edit them

Must support:

- create task with `title`, `required time`, `due date`, `notes`
- edit existing task properties
- mark task done
- delete task with confirmation

Human input should stay lightweight.

The user should not be required to manually fill detailed scheduling metadata every time.

### 計画

Purpose:

- enter available time for arbitrary dates
- inspect how tasks are distributed

Must support:

- month calendar view
- editing a day by clicking its cell and opening a modal
- highlighting today
- editing days outside the current month grid if they are visible in the calendar
- task overview with:
  - total estimated time
  - remaining time
  - progress rate
  - due date
  - cumulative logged time
  - assigned schedule preview

The calendar is an input surface, not only a display.

### ダッシュボード

Purpose:

- show progress trends rather than input controls

Structure:

- one `ダッシュボード` route
- tabs: `週次` and `タスク別`

#### 週次 Tab

Shows the last 8 weeks.

Needs:

- weekly grouped bar chart
- `planned` and `actual` hours shown side by side
- compact summaries for:
  - this week's planned hours
  - this week's actual hours
  - this week's completion rate
  - completed task count

This view should feel like a personal progress dashboard, similar in spirit to study-time tracking apps, while staying visually restrained.

#### タスク別 Tab

Shows one task at a time.

Needs:

- task selector
- last 8 weeks of planned vs actual hours for that task
- compact summary for:
  - total estimated hours
  - remaining hours
  - progress rate
  - due date
  - cumulative logged hours

The selector should default to a useful current task rather than an empty state whenever possible.

### ログ

Purpose:

- explain what changed and when scheduling ran

Must show:

- mutation history
- scheduling runs
- validation failures
- inference failures
- superseded runs

The page should auto-refresh when scheduling state changes, even if the user stays on it.

## Dashboard Data Model

The dashboard requires two additional aggregate read models.

### Weekly Summary

For the last 8 weeks, return:

- `weekStart`
- `plannedMinutes`
- `actualMinutes`
- `completedTaskCount`
- `completionRate`

### Task Timeline

For one selected task and the last 8 weeks, return:

- `weekStart`
- `plannedMinutes`
- `actualMinutes`

Also return task header data:

- `totalEstimatedMinutes`
- `remainingMinutes`
- `loggedMinutes`
- `progressRate`
- `dueDate`

## MCP Surface

MCP is the monitoring and control plane for external agents.

It should support all meaningful Web-side operations that matter for conversational use, including:

- create task
- update task
- delete task
- list tasks
- log work
- list work logs
- set capacity
- inspect current schedule
- inspect planning health
- inspect metrics
- inspect scheduler status
- delay scheduler
- trigger immediate scheduler run

This allows agents to handle requests such as:

- "今日中に返信が必要だから task を追加して"
- "今日やる task を教えて"
- "今日どれくらいやったか評価して"
- "今週どれくらいやったか評価して"

## LLM Endpoint Integration

The app must support provider-compatible local LLM endpoints, especially OpenAI-compatible ones.

Configuration is provided through environment variables.

Requirements:

- support OpenAI-compatible local endpoints
- support providers that do not fully implement `response_format`
- when structured outputs are unavailable, fall back to plain JSON prompting, not heuristic classification
- include enough context to infer task shape from title and notes

The app must never silently pretend inference happened when it actually did not.

## Metrics

Core metrics remain:

- planned minutes
- actual minutes
- completed minutes
- at-risk task count

The dashboard extends the read model with weekly and task-specific trend views, but planning health remains a separate concept.

## Data Ownership Model

The intended operating model is:

- the user lives mostly in the Web UI
- agents use MCP to inspect and help, but are not required for normal operation
- LLM scheduling support happens inside the app against a configured endpoint

In other words:

- Web UI must be sufficient for day-to-day operation
- MCP must expose equivalent operational controls where that makes sense
- agents can observe, evaluate, and mutate the same planning state

## Documentation Hygiene

Public-facing docs must not contain local absolute paths.

This includes:

- README
- specs
- plans
- any public usage examples

## Acceptance Criteria

The design is considered satisfied when:

- users can enter and edit task and capacity data through the Web UI
- users can log work from Today
- Today shows only current-day execution items
- scheduling runs asynchronously after edits settle
- users can delay or immediately trigger scheduling from the UI
- scheduling remains safe if edits occur during a run
- failed inference does not replace the last valid schedule
- schedule adoption is gated by deterministic validation
- planning-health warnings are accessible from both Web UI and MCP
- the app exposes a dedicated ダッシュボード route
- the dashboard has `週次` and `タスク別` tabs
- the weekly dashboard shows the last 8 weeks of planned vs actual hours
- the task dashboard shows one selected task's last 8 weeks of planned vs actual hours
- MCP supports the same meaningful operational controls exposed by the Web UI
- the UI is intentionally styled for repeated human use without redundant explanatory clutter
- documentation no longer contains leaked local absolute paths
