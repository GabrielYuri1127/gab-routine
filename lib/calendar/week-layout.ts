export interface TimedItemInput {
  id: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

export interface TimedItemLayout<T extends TimedItemInput> {
  item: T;
  startMinutes: number;
  endMinutes: number;
  lane: number;
  laneCount: number;
  conflictGroup: number;
  conflicting: boolean;
}

export interface TimelineBounds {
  startHour: number;
  endHour: number;
}

const DEFAULT_DURATION_MINUTES = 45;

export function parseTimeInMinutes(value?: string) {
  if (!value) {
    return null;
  }

  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function minutesToTime(value: number) {
  const normalized = Math.min(24 * 60 - 1, Math.max(0, Math.round(value)));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function layoutTimedItems<T extends TimedItemInput>(items: T[]): TimedItemLayout<T>[] {
  const normalized = items
    .map((item) => {
      const startMinutes = parseTimeInMinutes(item.startTime);
      if (startMinutes === null) {
        return null;
      }

      const requestedEnd = parseTimeInMinutes(item.endTime);
      const duration = Math.max(15, item.durationMinutes ?? DEFAULT_DURATION_MINUTES);
      const endMinutes = Math.min(24 * 60, requestedEnd && requestedEnd > startMinutes ? requestedEnd : startMinutes + duration);

      return {
        item,
        startMinutes,
        endMinutes
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes || a.item.id.localeCompare(b.item.id));

  const result: TimedItemLayout<T>[] = [];
  let group: typeof normalized = [];
  let groupEnd = -1;
  let groupIndex = 0;

  function flushGroup() {
    if (group.length === 0) {
      return;
    }

    const laneEnds: number[] = [];
    const assigned = group.map((entry) => {
      const availableLane = laneEnds.findIndex((endMinutes) => endMinutes <= entry.startMinutes);
      const lane = availableLane === -1 ? laneEnds.length : availableLane;
      laneEnds[lane] = entry.endMinutes;
      return { entry, lane };
    });
    const laneCount = laneEnds.length;

    assigned.forEach(({ entry, lane }) => {
      result.push({
        ...entry,
        lane,
        laneCount,
        conflictGroup: groupIndex,
        conflicting: laneCount > 1
      });
    });

    group = [];
    groupEnd = -1;
    groupIndex += 1;
  }

  normalized.forEach((entry) => {
    if (group.length > 0 && entry.startMinutes >= groupEnd) {
      flushGroup();
    }

    group.push(entry);
    groupEnd = Math.max(groupEnd, entry.endMinutes);
  });
  flushGroup();

  return result.sort((a, b) => a.startMinutes - b.startMinutes || a.lane - b.lane);
}

export function getTimelineBounds(
  layouts: Array<Pick<TimedItemLayout<TimedItemInput>, "startMinutes" | "endMinutes">>,
  defaults: TimelineBounds = { startHour: 7, endHour: 22 }
): TimelineBounds {
  if (layouts.length === 0) {
    return defaults;
  }

  const earliest = Math.floor(Math.min(...layouts.map((layout) => layout.startMinutes)) / 60);
  const latest = Math.ceil(Math.max(...layouts.map((layout) => layout.endMinutes)) / 60);

  return {
    startHour: Math.max(0, Math.min(defaults.startHour, earliest)),
    endHour: Math.min(24, Math.max(defaults.endHour, latest))
  };
}

export function countConflictGroups(layouts: Array<Pick<TimedItemLayout<TimedItemInput>, "conflictGroup" | "conflicting">>) {
  return new Set(layouts.filter((layout) => layout.conflicting).map((layout) => layout.conflictGroup)).size;
}
