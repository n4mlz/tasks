# Task Platform Design

## Overview

This document defines the current target design for the single-user Task Platform.

The system is meant to reduce cognitive load by separating:

- a control plane for inbox capture, estimate updates, deadline editing, day-capacity editing, and proposal review
- a data plane where the user mostly looks at today's assigned work and records execution feedback

The platform is always-on, single-user, proposal-driven, and available through both a Web UI and an MCP server. Hermes Agent is an important target consumer, but the integration model must remain agent-agnostic and rely on MCP function calling rather than Hermes-specific behavior.

This revision extends the original MVP design in four ways:

- scheduling must operate over a real multi-day horizon rather than near-today only
- the Web UI must be usable by a human without depending on MCP for routine operations
- task properties must support lightweight work-shape hints for better scheduling
- the UI must become a modern personal dashboard rather than an unstyled technical placeholder

This follow-up revision extends that design in four additional ways:

- capacity planning must be driven by arbitrary date input rather than a fixed current-week-only surface
- the system must expose planning-health warnings when capacity entries are missing within the next 7 days
- the Today view must behave as a true daily execution surface rather than a generic schedule dump
- the Web UI must be rebuilt on a modern component and styling foundation rather than incremental inline-style patching

## Goals

- Let the user offload tasks into an inbox instead of holding them in working memory.
- Provide a trustworthy daily plan where finishing today's list means things are progressing safely.
- Allow week-level capacity planning with explicit buffer.
- Keep schedule mutations proposal-based and human-approved.
- Expose the same core model to Web UI and MCP clients.
- Support lightweight agent assistance for planning, summarization, and progress evaluation.
- Make the interface pleasant enough for daily personal use on desktop and mobile.

## Non-Goals

- Habit tracking
- Multi-user support
- External LMS or task-service integration
- Agent auto-approval of schedule changes
- ML-heavy prediction or opaque optimization
- Push-notification systems
- Complex portfolio/project hierarchy

## Architecture

The system remains a TypeScript modular monolith in a pnpm workspace.

Core principles:

- domain rules live in shared packages
- Web UI and MCP server call the same application layer
- persistence stays abstracted through repositories
- SQLite remains the initial backend
- schedule generation is explainable and deterministic
- proposal approval remains the only way to update the active schedule

### High-Level Components

#### Web Application

Provides user-facing views for:

- Today
- Inbox
- Week
- Proposals

The Web application must cover routine usage end-to-end:

- create and edit tasks
- create and edit day capacities
- review and approve proposals
- record work performed
- inspect current metrics

#### HTTP API

Provides JSON endpoints for the Web application. The API is internal-facing but should remain consistent enough to support future clients.

#### MCP Server

Exposes task, capacity, schedule, and metrics operations to Hermes Agent and any other MCP-capable client.

The MCP server may help generate proposals, summarize them, or inspect progress, but it does not bypass human approval of schedule changes.

#### Application Layer

Implements use cases such as:

- create task
- update task
- log work
- set capacity
- generate schedule proposal
- approve proposal
- reject proposal
- get metrics
- get planning health

#### Domain Layer

Contains:

- task model
- capacity model
- schedule proposal model
- scheduling heuristics
- buffer handling
- risk summary generation

#### Infrastructure Layer

Implements:

- SQLite repositories
- migrations
- workspace path resolution
- ID generation
- clock abstraction

#### Scheduler Orchestrator

Handles proposal regeneration when relevant state changes:

- task created
- task updated
- work logged
- capacity updated
- manual generation requested

For now this remains in-process and synchronous enough to keep the implementation simple.

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
  scheduler/
docs/
  superpowers/
    specs/
    plans/
```

## Domain Model

Inbox remains a filtered task state rather than a separate entity.

### Task

Fields:

- `id`
- `title`
- `notes`
- `status`: `inbox | active | done | archived`
- `remainingMinutes`
- `dueDate` nullable
- `urgency`: `today | soon | normal`
- `taskType`: `deep | shallow | admin | research | writing | implementation | unknown`
- `energy`: `low | medium | high | unknown`
- `createdAt`
- `updatedAt`

Rationale:

- `remainingMinutes` remains the central planning quantity
- `dueDate` and `urgency` control explicit user intent
- `taskType` and `energy` provide lightweight scheduling hints without requiring heavy modeling
- `unknown` is preferred over null so every layer can reason consistently

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
- `bufferMinutes`

The user may enter capacity for any date, edit it later, and use it to shape a week-level plan.

### ScheduleProposal

Fields:

- `id`
- `status`: `pending | approved | rejected | superseded`
- `reason`: `task_created | task_updated | work_logged | capacity_updated | manual`
- `generatedAt`
- `horizonStart`
- `horizonEnd`
- `summaryJson`

`summaryJson` must contain, at minimum:

- `riskFlags`
- `unscheduledTaskIds`
- `capacityPressureByDate`

### ScheduledTaskSlice

Fields:

- `id`
- `proposalId`
- `taskId`
- `date`
- `plannedMinutes`
- `kind`: `focus | buffer_fill`

## Scheduling Rules

The scheduler must become horizon-based rather than near-today-only.

### Horizon Selection

- Start at `today`
- End at `max(latest due date - 1 day, today + 6 days)`
- If there are no due dates, still plan at least through the next 7 days

### Capacity Handling

- Read all capacities within the horizon
- Use `usableMinutes = max(availableMinutes - bufferMinutes, 0)`
- Missing capacity days are treated as zero-capacity unless a future policy changes that

### Ordering Heuristics

Tasks are ordered using:

1. `urgency=today`
2. earlier `dueDate`
3. work-shape hints
4. creation order

Work-shape handling:

- `deep` and `high` energy tasks should prefer higher-capacity days
- `admin` and `shallow` tasks may use tighter remaining gaps
- `unknown` behaves neutrally

### Deadline Safety

- Work is assigned before the due date rather than on it
- If work cannot fit before the deadline, the task is flagged in `riskFlags`
- Unplaced work must appear in `unscheduledTaskIds`

### Proposal Summary

Each proposal must summarize:

- unscheduled tasks
- which days are over pressure or near exhaustion
- whether today is overloaded

The summary must be sufficiently readable for both UI rendering and MCP summarization.

## Planning Health

The system needs a lightweight planning-health model so both Web UI and MCP clients can detect when the planning surface is incomplete even before scheduling quality is evaluated.

Planning health must include:

- `missingCapacityDatesWithin7Days`
- `warningCount`

Rules:

- the check window is always `today..today+6`
- if any date in that window has no stored capacity row, that date appears in `missingCapacityDatesWithin7Days`
- this warning is independent of whether schedulable tasks currently exist
- missing capacity continues to behave as zero-capacity for scheduling, but it must also surface as a warning

The purpose is to let both the human and the agent notice that planning confidence is degraded because the near-term capacity envelope is incomplete.

## Web UI

The UI direction is a modern personal planning console built for dense daily use, not a dense enterprise CRUD screen and not a calendar-only surface.

### UI Foundation

The redesign should standardize the frontend on:

- Tailwind CSS for layout, spacing, color, and responsive composition
- shadcn/ui for reusable primitives and consistent interaction surfaces
- project-local wrapper components for recurring product patterns such as metric cards, warning alerts, and status badges

Inline style objects should be treated as legacy implementation and replaced as part of the redesign.

### Design Direction

- Today is the primary screen
- typography, spacing, color, and hierarchy must make the app comfortable for daily use
- mobile-first one-column layouts should still work well on desktop
- planning views should feel structured and calm rather than visually noisy
- the interface should be intentionally styled, not raw HTML defaults
- overall information density should be moderately high rather than sparse
- the visual style should read as a practical planning console, not a marketing page
- color should stay in a neutral `slate / zinc / white` range with restrained `amber`, `emerald`, and `rose` accents for state
- warnings and risk should be highly visible without overwhelming the main execution flow

### Shared Interaction Model

The Web app should separate:

- execution surfaces, where the user mostly reads and records work
- planning surfaces, where the user edits capacities, reviews proposals, and inspects warnings

This should be visible in the UI itself:

- Today should feel lighter, faster, and more action-oriented
- Week and Proposals should feel denser and more analytical
- Inbox should optimize for quick capture first, lightweight editing second

Shared UI primitives should include at least:

- top-level app shell and navigation
- metric card
- warning alert
- status badge
- dense table/list containers
- form row patterns for compact editing

### Today

Purpose:

- show the approved slices for the current plan
- allow quick work logging

Must support:

- viewing only slices scheduled for the current date
- seeing the active proposal/source plan
- seeing a compact day summary before the task list
- entering `spentMinutes`
- entering `remainingMinutesAfter`
- optional work-log note
- seeing a lightweight planning-health warning when near-term capacities are missing
- being usable as the main page the user opens every day

Preferred structure:

- top summary strip
- current warnings / confidence state
- dense list of today's slices
- quick logging controls attached directly to each slice

### Inbox

Purpose:

- capture tasks quickly
- review and lightly edit them

Must support:

- create task with `title`, `remainingMinutes`, `dueDate`, `urgency`, `taskType`, `energy`, `notes`
- edit existing task properties
- distinguish inbox vs active/done state
- keep capture fast even when richer metadata is available

Preferred structure:

- compact capture form at the top
- editable task list below
- visible badges for urgency, type, energy, and status

### Week

Purpose:

- edit capacities for arbitrary dates
- inspect near-term pressure and metrics

Must support:

- a `referenceDate`-driven view rather than a fixed current-week-only screen
- a 7-day window anchored to the selected reference date
- direct arbitrary-date jump
- previous / today / next navigation for quick movement
- editing `availableMinutes` and `bufferMinutes` per date
- seeing a week-scale view of capacity entries
- seeing metrics and pressure signals
- seeing warning banners for missing capacity dates within the next 7 days

Preferred structure:

- compact navigation and date-jump controls at the top
- a dense planning summary row
- a table-like or grid-like 7-day capacity editor
- visible warning state before the editable rows

The Week surface should feel closer to a planning console than to a stack of large disconnected cards.

### Proposals

Purpose:

- review generated schedule changes before activation

Must support:

- list pending proposals
- inspect proposal details
- inspect `riskFlags`
- inspect `unscheduledTaskIds`
- inspect `capacityPressureByDate`
- approve or reject

Preferred structure:

- a compact review list
- dense detail sections for risk and capacity pressure
- approval actions that remain visible without excessive scrolling

## MCP Surface

The MCP server should continue exposing the current capability categories:

- task operations
- capacity operations
- schedule operations
- metrics operations
- planning health operations

The contract must be extended to support new task attributes and richer proposal summaries.

Expected usage patterns:

- agent captures tasks into inbox
- agent updates capacities
- agent generates proposals
- agent summarizes proposal risk
- agent reads metrics for daily or weekly coaching
- agent reads planning-health warnings to detect missing near-term capacities
- human approves the final plan

This preserves a clean split:

- system and agents assist with planning
- the user keeps approval authority
- everyday execution can still happen through Web UI alone

## Metrics

The current minimal metrics remain valid:

- planned minutes
- actual minutes
- completed minutes
- at-risk task count
- pending proposal count

This revision also expects the backend to support week-level evaluation more naturally, even if the first implementation remains compact.

Planning health remains separate from metrics. Metrics describe observed progress and schedule state, while planning health describes whether the near-term capacity input is sufficiently complete for the plan to be trustworthy.

## Data Ownership Model

The intended operating model is:

- most planning mutations can be performed either from Web UI or MCP
- daily human use should not require MCP
- agent intervention is primarily valuable for schedule generation, explanation, and progress evaluation

In other words:

- Web UI must be sufficient for normal operation
- MCP must be helpful, not mandatory
- the user should be able to live primarily in the Web UI and only occasionally care that an agent is participating

## Migration / Cleanup Requirement

This work also includes repository hygiene for public-facing documentation:

- no local absolute paths in README or public docs
- existing leaked local-path history must be rewritten when still on unpublished or branch-local history that can safely be force-pushed

## Acceptance Criteria

The design is considered satisfied when:

- users can enter and edit task and capacity data through the Web UI
- users can log work from the Today view
- Today shows only current-day execution items
- schedule proposals cover a real multi-day horizon
- proposals expose enough detail to understand risk and missing allocations
- MCP tools support the same enhanced model
- metrics remain accessible for agents and UI
- planning-health warnings are accessible from both Web UI and MCP
- the UI is intentionally styled for day-to-day human use on top of Tailwind CSS and shadcn/ui primitives
- the Week view is driven by arbitrary dates rather than a fixed current week
- the information density is high enough that repeated daily use does not feel wasteful
- documentation no longer contains leaked local absolute paths
