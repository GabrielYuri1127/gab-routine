import test from "node:test";
import assert from "node:assert/strict";

import { getSnoozeTarget, getTaskUrgency, prioritizeTasks } from "../lib/tasks/prioritization";
import type { Task } from "../types/domain";

const baseTask: Task = {
  id: "task",
  userId: "user",
  title: "Task",
  priority: "medium",
  status: "open"
};

test("classifies task urgency from due dates", () => {
  assert.equal(getTaskUrgency({ ...baseTask, dueDate: "2026-09-07" }, "2026-09-08"), "overdue");
  assert.equal(getTaskUrgency({ ...baseTask, dueDate: "2026-09-08" }, "2026-09-08"), "today");
  assert.equal(getTaskUrgency({ ...baseTask, dueDate: "2026-09-09" }, "2026-09-08"), "upcoming");
  assert.equal(getTaskUrgency({ ...baseTask, status: "done", dueDate: "2026-09-08" }, "2026-09-08"), "done");
});

test("prioritizes due work before completed work", () => {
  const ordered = prioritizeTasks(
    [
      { ...baseTask, id: "done", title: "Done", priority: "urgent", status: "done", dueDate: "2026-09-08" },
      { ...baseTask, id: "low", title: "Low", priority: "low", dueDate: "2026-09-08" },
      { ...baseTask, id: "urgent", title: "Urgent", priority: "urgent", dueDate: "2026-09-09" }
    ],
    "2026-09-08"
  );

  assert.deepEqual(
    ordered.map((task) => task.id),
    ["low", "urgent", "done"]
  );
});

test("creates snooze targets from a date key", () => {
  assert.equal(getSnoozeTarget("2026-09-08", 1), "2026-09-09");
  assert.equal(getSnoozeTarget("2026-09-08", 3), "2026-09-11");
});
