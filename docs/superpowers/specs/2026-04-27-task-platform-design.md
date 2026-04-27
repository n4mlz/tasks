# Task Platform Design

## Overview

This document defines the MVP design for a personal task management platform that reduces cognitive load by separating:

- a control plane where the user enters and adjusts tasks, estimates, and available time
- a data plane where the user mainly executes the tasks assigned for today

The system is designed for a single user, runs as an always-on personal service, and exposes its capabilities both through a Web UI and an MCP server so Hermes Agent or other MCP-capable agents can interact with it through function calling.

The MVP is intentionally narrow. It focuses on:

- capturing tasks into an inbox quickly
- storing remaining work estimates and deadlines
- storing daily available capacity and buffer
- generating explainable schedule proposals
- letting the user approve or reject those proposals
- showing a simple daily execution view
- logging work and re-scheduling after changes

The design must allow future expansion into stronger automation, external integrations, richer metrics, and more advanced planning behavior without breaking the core model.

## Goals

- Reduce the amount of unfinished work the user has to keep in working memory.
- Provide a reliable daily plan where "doing today's list" means things are progressing safely.
- Keep the interaction model simple enough to sustain daily use.
- Make scheduling and review behavior part of the system rather than a manual ritual.
- Support agent assistance safely through proposal-based scheduling rather than fully autonomous mutation.

## Non-Goals For MVP

- Habit tracking
- Multi-user support
- External LMS or task service integrations
- Agent auto-approval of schedule changes
- Advanced ML-based task classification
- Sophisticated notification systems
- Heavy timeline visualizations

## Architecture

The system will be implemented as a TypeScript modular monolith in a pnpm workspace.

Core design principles:

- domain and scheduling rules live in shared packages
- Web UI and MCP server both call the same application services
- persistence is abstracted through repository interfaces
- SQLite is the initial storage backend
- background re-scheduling starts as an in-process job runner, with boundaries that allow later extraction into a separate worker

### High-Level Components

#### Web Application

Provides the user-facing UI for:

- today's assigned work
- inbox capture and task editing
- weekly capacity editing
- viewing and approving scheduling proposals

#### HTTP API

Provides JSON endpoints for the Web application.

#### MCP Server

Exposes task and scheduling capabilities as MCP tools for Hermes Agent and other MCP-capable agents. The MCP server does not get privileged scheduling powers; it generates and inspects proposals and uses the same approval workflow as the Web UI.

#### Application Layer

Implements use cases such as:

- creating tasks
- updating estimates
- logging work
- setting daily capacity
- generating schedule proposals
- approving or rejecting proposals
- retrieving metrics

#### Domain Layer

Contains the core business model and pure scheduling logic, including:

- scheduling horizon selection
- buffer handling
- risk flag generation
- task ordering heuristics
- schedule slice generation

#### Infrastructure Layer

Implements:

- SQLite repositories
- migrations
- ID generation
- clock abstraction
- transactional persistence

#### Scheduler Orchestrator

Runs schedule proposal generation whenever relevant state changes occur, such as:

- task created
- task updated
- work logged
- capacity updated
- manual re-schedule requested

For MVP, this can be an in-process queue or async trigger that calls application services.

## Proposed Repository Structure

```text
apps/
  web/
  mcp/
packages/
  domain/
  application/
  infrastructure/
  contracts/
  scheduler/
docs/
  superpowers/
    specs/
```

### Package Responsibilities

#### `apps/web`

- Next.js application
- Today, Inbox, Week, Proposals views
- Route handlers or server actions for API access

#### `apps/mcp`

- MCP server setup
- tool registration
- input validation
- application service invocation

#### `packages/domain`

- entities
- value objects
- scheduling rules
- risk evaluation

#### `packages/application`

- use case orchestration
- transaction boundaries
- repository interfaces

#### `packages/infrastructure`

- SQLite schema and repository implementations
- persistence setup

#### `packages/contracts`

- zod schemas
- shared DTO definitions for API and MCP

#### `packages/scheduler`

- schedule generation orchestration
- proposal trigger wiring

## Domain Model

The MVP keeps the model intentionally small. Inbox is represented as task state rather than a separate entity.

### Task

Represents a unit of work that may or may not already be actively scheduled.

Fields:

- `id`
- `title`
- `notes`
- `status`: `inbox | active | done | archived`
- `remainingMinutes`
- `dueDate` nullable
- `urgency`: `today | soon | normal`
- `createdAt`
- `updatedAt`

Rationale:

- `status=inbox` avoids a separate inbox object and keeps promotion logic simple.
- `remainingMinutes` is the central planning quantity and is updated whenever work is logged.
- `urgency` is a light user-supplied override for practical short-term prioritization.

### TaskWorkLog

Represents actual execution feedback entered by the user.

Fields:

- `id`
- `taskId`
- `date`
- `spentMinutes`
- `remainingMinutesAfter`
- `note`

Rationale:

- the log captures both actual time spent and the user’s updated estimate
- this supports better future metrics and immediate re-scheduling

### DayCapacity

Represents how much work can realistically be done on a date.

Fields:

- `date`
- `availableMinutes`
- `bufferMinutes`

Rationale:

- `bufferMinutes` is explicit rather than derived-only, so the user or future agents can tune it directly

### ScheduleProposal

Represents a generated but not necessarily active plan.

Fields:

- `id`
- `status`: `pending | approved | rejected | superseded`
- `reason`: `task_created | task_updated | work_logged | capacity_updated | manual`
- `generatedAt`
- `horizonStart`
- `horizonEnd`
- `summaryJson`

Rationale:

- the system is proposal-driven so agent activity stays safe and reviewable
- `summaryJson` can hold a stable summary of risk and reasoning for display

### ScheduledTaskSlice

Represents planned work for a task on a specific day within a proposal.

Fields:

- `id`
- `proposalId`
- `taskId`
- `date`
- `plannedMinutes`
- `kind`: `focus | buffer_fill`

Rationale:

- the slice is the bridge between high-level task state and daily execution

### ScheduleSnapshot

Represents the currently active approved schedule.

Fields:

- `id`
- `activeProposalId`
- `updatedAt`

Rationale:

- current state should be easy to resolve without re-deriving which approved proposal is active

## Scheduling Rules

The scheduling engine should optimize first for clarity and trust, not algorithmic cleverness.

### Inputs

- all tasks where `status` is `inbox` or `active`
- only tasks with `remainingMinutes > 0`
- daily capacities in the planning horizon
- per-task deadlines and urgency

### Horizon

- start at `today`
- end at the later of:
  - the latest due date among schedulable tasks
  - `today + 14 days`

This gives enough room for both deadline-bound and floating tasks without overcommitting to a distant future in MVP.

### Usable Capacity

For each day:

- `usableMinutes = max(availableMinutes - bufferMinutes, 0)`

Default buffer policy for new day capacity entries:

- `bufferMinutes = round(availableMinutes * 0.2)`

Later the user may override this per day.

### Deadline Handling

- tasks with due dates should aim to finish by the day before the due date
- if total capacity before that point is insufficient, mark the task as at risk

This intentionally leaves one day of slack where possible.

### Priority Order

Planning order for MVP:

1. `urgency=today`
2. tasks with the highest deadline pressure
3. remaining tasks by earliest due date first
4. undated tasks after dated tasks

`deadline pressure` should incorporate how much remaining work must fit into how many usable days remain.

### Slice Size

- default minimum slice size: `25` minutes

This avoids unreadably fragmented schedules and keeps the output psychologically actionable.

### Re-Scheduling Behavior

Generate a new proposal when:

- a task is created
- a task’s remaining estimate changes
- a task’s due date changes
- a task work log is added
- a day capacity changes
- the user or agent explicitly requests re-scheduling

The new proposal does not automatically replace the active one. It remains pending until approved.

### Risk Flags

The proposal summary should include explainable risk flags such as:

- insufficient capacity before due date
- buffer fully consumed
- work pushed into overdue range
- multiple `today` urgency tasks exceeding today’s usable capacity

These flags are important both for the user and for agent reasoning.

## MVP UX Model

The system is split into a control plane and a data plane.

### Control Plane

Used when planning, adjusting, and reviewing:

- Inbox
- Week
- Proposals

### Data Plane

Used during daily execution:

- Today

This separation is central to reducing the feeling that every interesting project is always "in progress" in an oppressive sense.

## Web UI

The MVP Web UI should have four primary screens.

### Today View

Purpose:

- show only what needs attention today
- let the user log work quickly

Key elements:

- today’s scheduled task slices
- planned minutes total
- usable minutes total
- remaining buffer for today
- action to log work against a task
- action to update remaining estimate

Primary workflow:

- user completes or partially completes a task
- user records `spentMinutes` and `remainingMinutesAfter`
- system generates a new schedule proposal if overall allocation changed

### Inbox View

Purpose:

- capture tasks quickly
- edit the minimum scheduling attributes

Key elements:

- task creation form
- editable list of inbox and active tasks
- fields for title, remaining estimate, due date, urgency, notes
- visible status of whether a pending proposal exists

### Week View

Purpose:

- set and adjust available capacity
- inspect near-term distribution

Key elements:

- per-day available minutes
- per-day buffer minutes
- daily total planned load
- indicators for overloaded or underloaded days
- visible due-risk tasks

### Proposals View

Purpose:

- inspect generated plans before making them active

Key elements:

- list of pending and historical proposals
- side-by-side difference from the active schedule
- proposal reason
- risk summary
- approve or reject actions

## MCP Tool Surface

The MCP surface should be small, explicit, and approval-oriented.

### Task Tools

- `tasks_list(status?, dueBefore?, scheduledOn?)`
- `task_create(title, remainingMinutes, dueDate?, urgency?, notes?)`
- `task_update(taskId, title?, remainingMinutes?, dueDate?, urgency?, status?, notes?)`
- `task_log_work(taskId, date, spentMinutes, remainingMinutesAfter, note?)`

### Capacity Tools

- `capacity_get(dateFrom, dateTo)`
- `capacity_set(date, availableMinutes, bufferMinutes?)`

### Scheduling Tools

- `schedule_generate(reason)`
- `schedule_get_current()`
- `schedule_list_proposals(status?)`
- `schedule_get_proposal(proposalId)`
- `schedule_approve(proposalId)`
- `schedule_reject(proposalId, reason?)`

### Metrics Tools

- `metrics_get(range?)`

### MCP Design Constraints

- tools should expose stable structured schemas via zod-backed contracts
- tools should not bypass application rules
- agents can propose and inspect, but scheduling becomes active only by explicit approval

This design keeps the system Hermes-compatible without becoming Hermes-dependent.

## Metrics

The MVP metrics surface should stay simple and operationally useful.

Initial metrics:

- planned minutes vs actual minutes over a range
- total completed minutes this week
- current buffer consumption by day
- count of at-risk tasks
- count of pending schedule proposals

These metrics should be available in the Web UI and through MCP.

## Data Flow

### Task Capture Flow

1. user creates or edits a task in Inbox
2. application persists the task
3. scheduler trigger creates a pending proposal
4. user or agent reviews the proposal
5. user approves or rejects it

### Daily Execution Flow

1. user opens Today
2. user sees slices from the active schedule
3. user logs time spent and updates remaining estimate
4. application stores the work log and task update
5. scheduler creates a new proposal if needed

### Capacity Adjustment Flow

1. user edits available minutes or buffer minutes in Week
2. application stores the capacity change
3. scheduler creates a new proposal
4. user reviews and approves if desired

## Error Handling

MVP should handle the following predictably:

- missing capacity days in the horizon
  - either assume zero usable time or prompt for capacity entry before approval
- invalid task estimates
  - reject negative values and zero-minute active tasks
- impossible schedules
  - still generate a proposal, but mark affected tasks and days with risk flags
- stale proposals
  - when a newer proposal is generated, older pending ones can be marked `superseded`

The system should prefer explicit degraded output over silent failure.

## Extensibility Strategy

The MVP must support future growth without rewriting the core model.

Planned extension areas:

- task type classification and heuristics
- external importers, including university systems
- optional reminders and coaching
- better schedule ranking logic
- automatic estimate suggestions
- separate worker process for scheduling
- richer analytics and retrospectives

Key design choices that enable this:

- repository abstraction over SQLite
- proposal model instead of direct mutation
- MCP as the primary agent integration surface
- shared application services across transport layers

## Testing Strategy

The implementation should be TDD-first.

### Domain Tests

Highest priority:

- usable capacity calculation
- buffer handling
- scheduling horizon calculation
- task ordering and deadline pressure
- risk flag generation
- slice generation constraints

### Application Tests

Use case coverage:

- creating a task triggers proposal generation
- editing capacity triggers proposal generation
- logging work updates task state and triggers proposal generation
- approving a proposal updates the active snapshot
- rejecting a proposal preserves the active schedule

### Infrastructure Tests

- SQLite repository persistence
- migration correctness
- transaction behavior

### MCP Tests

- input schema validation
- mapping from tool calls to application services
- stable structured output shape

### Web Tests

- inbox task creation flow
- today work logging flow
- proposal approval flow
- week capacity editing flow

## Recommended Implementation Order

1. domain model and scheduling rules
2. application use cases and repository interfaces
3. SQLite infrastructure
4. scheduling orchestration
5. MCP server
6. Web UI

This order lets the core behavior stabilize before UI work and aligns well with TDD.

## Open Decisions Intentionally Deferred

These are intentionally left out of MVP, not undefined:

- whether capacity defaults are pre-generated into the future
- how reminders are delivered
- how agent-generated rationale is phrased
- whether task categories should exist
- whether recurring work should be modeled separately

Those can be added later without changing the MVP core boundaries.
