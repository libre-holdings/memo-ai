// libs/calendar.js
import * as Calendar from "expo-calendar";

export async function createCalendarEvent(event) {
  const perm = await Calendar.requestCalendarPermissionsAsync();
  if (perm.status !== "granted") throw new Error("カレンダー権限が許可されていません");

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

  // ✅ UIで選ばれた calendarId があれば最優先
  const preferred =
    event?.calendarId && calendars.find((c) => c.id === event.calendarId);

  const target =
    preferred ||
    calendars.find((c) => c.allowsModifications && c.isPrimary) ||
    calendars.find((c) => c.allowsModifications) ||
    calendars[0];

  if (!target?.id) throw new Error("書き込み可能なカレンダーが見つかりません");
  if (!event?.startDate) throw new Error("startDate が未設定です");
  if (!event?.endDate) throw new Error("endDate が未設定です");

  const { calendarId, ...details } = event; // createEventAsync に不要なキーを除外

  const id = await Calendar.createEventAsync(target.id, details);
  return { eventId: id, calendarId: target.id };
}
