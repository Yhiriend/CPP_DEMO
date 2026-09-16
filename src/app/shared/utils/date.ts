export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTimestamp(): string {
  const iso = new Date().toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}
