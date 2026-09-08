export const defaultReminderOffsets = {
  class: [{ minutesBefore: 30 }],
  activity: [{ minutesBefore: 24 * 60 }],
  exam: [{ minutesBefore: 3 * 24 * 60 }, { minutesBefore: 24 * 60 }],
  appointment: [{ minutesBefore: 60 }],
  tomorrowPlanning: [{ time: "21:30" }],
  dailySummary: [{ time: "07:00" }]
} as const;

export const defaultQuietHours = {
  startsAt: "23:00",
  endsAt: "07:00"
};
