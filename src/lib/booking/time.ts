// Time utilities operating on 'HH:MM' or 'HH:MM:SS' strings.
// We deliberately work with minutes-since-midnight to avoid Date / TZ pitfalls.

export function parseHM(t: string): number {
  const [h, m] = t.split(':')
  return parseInt(h, 10) * 60 + parseInt(m, 10)
}

export function formatHM(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function addMinutes(t: string, minutes: number): string {
  return formatHM(parseHM(t) + minutes)
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart
}
