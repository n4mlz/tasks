CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT NOT NULL,
  status TEXT NOT NULL,
  remaining_minutes INTEGER NOT NULL,
  due_date TEXT,
  urgency TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'unknown',
  cognitive_load TEXT NOT NULL DEFAULT 'unknown',
  energy TEXT NOT NULL DEFAULT 'unknown',
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_work_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  date TEXT NOT NULL,
  spent_minutes INTEGER NOT NULL,
  remaining_minutes_after INTEGER NOT NULL,
  note TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS day_capacities (
  date TEXT PRIMARY KEY,
  available_minutes INTEGER NOT NULL,
  buffer_minutes INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_proposals (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  horizon_start TEXT NOT NULL,
  horizon_end TEXT NOT NULL,
  summary_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_task_slices (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  date TEXT NOT NULL,
  planned_minutes INTEGER NOT NULL,
  kind TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES schedule_proposals(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS schedule_snapshots (
  id TEXT PRIMARY KEY,
  active_proposal_id TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS planning_state (
  singleton_id TEXT PRIMARY KEY,
  current_revision INTEGER NOT NULL,
  last_scheduled_revision INTEGER NOT NULL,
  last_mutation_at TEXT,
  last_scheduled_at TEXT,
  scheduler_status TEXT NOT NULL,
  running_revision INTEGER,
  running_started_at TEXT
);

CREATE TABLE IF NOT EXISTS planning_mutations (
  id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  mutation_kind TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  created_at TEXT NOT NULL,
  details_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_runs (
  id TEXT PRIMARY KEY,
  target_revision INTEGER NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  rationale TEXT NOT NULL,
  validation_json TEXT NOT NULL,
  error_message TEXT NOT NULL
);
