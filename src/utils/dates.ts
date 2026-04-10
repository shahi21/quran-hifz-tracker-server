import dayjs from "dayjs";

export function normalizeToDay(date: Date) {
  return dayjs(date).startOf("day").toDate();
}

export function startOfWeekMonday(date: Date) {
  const d = dayjs(date);
  const offset = (d.day() + 6) % 7; // Monday = 0 ... Sunday = 6
  return d.subtract(offset, "day").startOf("day").toDate();
}

