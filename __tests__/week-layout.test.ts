import test from "node:test";
import assert from "node:assert/strict";

import { countConflictGroups, getTimelineBounds, layoutTimedItems, parseTimeInMinutes } from "../lib/calendar/week-layout";

test("parses valid times and rejects invalid values", () => {
  assert.equal(parseTimeInMinutes("08:30"), 510);
  assert.equal(parseTimeInMinutes("23:59"), 1439);
  assert.equal(parseTimeInMinutes("24:00"), null);
  assert.equal(parseTimeInMinutes("8:30"), null);
  assert.equal(parseTimeInMinutes(undefined), null);
});

test("places overlapping commitments in separate lanes", () => {
  const layouts = layoutTimedItems([
    { id: "class", startTime: "08:00", endTime: "09:40" },
    { id: "meeting", startTime: "09:00", endTime: "10:30" },
    { id: "study", startTime: "10:00", endTime: "11:00" }
  ]);

  assert.equal(layouts[0].lane, 0);
  assert.equal(layouts[1].lane, 1);
  assert.equal(layouts[2].lane, 0);
  assert.equal(layouts.every((layout) => layout.laneCount === 2), true);
  assert.equal(countConflictGroups(layouts), 1);
});

test("keeps adjacent commitments in full-width independent groups", () => {
  const layouts = layoutTimedItems([
    { id: "first", startTime: "13:00", endTime: "14:00" },
    { id: "second", startTime: "14:00", endTime: "15:00" }
  ]);

  assert.equal(layouts[0].laneCount, 1);
  assert.equal(layouts[1].laneCount, 1);
  assert.equal(countConflictGroups(layouts), 0);
});

test("expands timeline bounds when an item is outside the default window", () => {
  const layouts = layoutTimedItems([
    { id: "early", startTime: "05:30", endTime: "06:30" },
    { id: "late", startTime: "22:30", endTime: "23:30" }
  ]);

  assert.deepEqual(getTimelineBounds(layouts), { startHour: 5, endHour: 24 });
});
