import { DEFAULT_SETTINGS } from "./config.js";

const SETTINGS_KEY = "haniumTraffic.settings.v2";
const LOCATION_KEY = "haniumTraffic.location.v2";
const NOTIFICATIONS_KEY = "haniumTraffic.notifications.v2";
const MONITOR_KEY = "haniumTraffic.monitor.v2";

function safeParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function loadSettings() {
  return {
    ...DEFAULT_SETTINGS,
    ...safeParse(localStorage.getItem(SETTINGS_KEY), {})
  };
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadLocationState() {
  return safeParse(localStorage.getItem(LOCATION_KEY), null);
}

export function saveLocationState(state) {
  localStorage.setItem(LOCATION_KEY, JSON.stringify(state));
}

export function loadNotifications() {
  return safeParse(localStorage.getItem(NOTIFICATIONS_KEY), []);
}

export function saveNotifications(items) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 500)));
}

export function hasNotificationEvent(eventKey) {
  return loadNotifications().some((item) => item.eventKey === eventKey);
}

export function addNotification(item) {
  const items = loadNotifications();

  if (items.some((existing) => existing.eventKey === item.eventKey)) {
    return false;
  }

  items.unshift(item);
  saveNotifications(items);
  return true;
}

export function markNotificationRead(id) {
  const items = loadNotifications();
  const target = items.find((item) => item.id === id);
  if (target) target.read = true;
  saveNotifications(items);
}

export function markAllNotificationsRead() {
  saveNotifications(loadNotifications().map((item) => ({ ...item, read: true })));
}

export function clearNotifications() {
  saveNotifications([]);
}

export function loadMonitorState() {
  return safeParse(localStorage.getItem(MONITOR_KEY), null);
}

export function saveMonitorState(state) {
  localStorage.setItem(MONITOR_KEY, JSON.stringify(state));
}

export function clearMonitorState() {
  localStorage.removeItem(MONITOR_KEY);
}
