export function toDateValue(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return new Date();
}

export function formatTime(value) {
  return toDateValue(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(value) {
  return toDateValue(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function remainingCountdown(targetDate, now = Date.now()) {
  const diff = Math.max(new Date(targetDate).getTime() - now, 0);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, done: diff <= 0 };
}
