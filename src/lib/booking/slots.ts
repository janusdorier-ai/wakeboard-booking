import type { Booking, BookingMember, CandidateSlot, ClubConfig, Period, SlotState } from './types'
import { parseHM, formatHM, rangesOverlap } from './time'

export interface GenerateSlotsArgs {
  config: ClubConfig
  period: Period
  bookings: Booking[]                              // active (non-cancelled) only
  membersByBooking?: Record<string, BookingMember[]>
  /** YYYY-MM-DD of the day being generated (used for cluster lock-in) */
  date?: string
  /** Override "now" — for tests. Defaults to current time. */
  now?: Date
}

/**
 * Generates the candidate slot grid for a single (date, period).
 *
 * Algorithm:
 *   1. Walk a fixed grid from window_start to window_end - 45min, stepping slot_step (15min).
 *   2. If a booking starts at the candidate time, surface it with its status color.
 *   3. Otherwise the candidate is "free":
 *      - mark 'hidden' if [start, start+45min) overlaps an existing booking;
 *      - if there is no cluster yet → 'available';
 *      - else if start is within [clusterMin - gap, clusterMax + gap] → 'adjacent';
 *      - else → 'hidden' (the cluster has shrunk the bookable window).
 */
export function generateSlots(args: GenerateSlotsArgs): CandidateSlot[] {
  const { config, period, bookings, membersByBooking = {}, date, now = new Date() } = args

  const winStart = parseHM(period === 'AM' ? config.am_start : config.pm_start)
  const winEnd   = parseHM(period === 'AM' ? config.am_end   : config.pm_end)
  const step     = config.slot_step_minutes
  const minDur   = config.duration_2_minutes // smallest viable slot length
  const gap      = config.cluster_gap_minutes

  // Cluster lock-in: earlier than `cluster_lockin_hours` before the period starts,
  // any candidate is bookable. After that horizon, the cluster rule kicks in.
  let enforceCluster = true
  if (date) {
    const periodStart = new Date(`${date}T${(period === 'AM' ? config.am_start : config.pm_start).slice(0, 5)}:00`)
    const hoursToStart = (periodStart.getTime() - now.getTime()) / 3_600_000
    enforceCluster = hoursToStart <= config.cluster_lockin_hours
  }

  // Index existing bookings by exact start time and derive cluster bounds.
  const byStart = new Map<number, Booking>()
  let clusterMin: number | null = null
  let clusterMax: number | null = null
  for (const b of bookings) {
    const s = parseHM(b.start_time)
    const e = parseHM(b.end_time)
    byStart.set(s, b)
    if (clusterMin === null || s < clusterMin) clusterMin = s
    if (clusterMax === null || e > clusterMax) clusterMax = e
  }

  const slots: CandidateSlot[] = []

  for (let t = winStart; t + minDur <= winEnd; t += step) {
    const existing = byStart.get(t)
    if (existing) {
      slots.push({
        start_time: formatHM(t),
        end_time: existing.end_time.slice(0, 5),
        state: existing.status as SlotState, // 'pending' | 'confirmed' | 'full'
        booking: existing,
        members: membersByBooking[existing.id] ?? [],
      })
      continue
    }

    // Free candidate. Compute its tentative end as a minimum-duration slot.
    const candEnd = t + minDur

    // Conflict with any existing booking?
    let conflicts = false
    for (const b of bookings) {
      const bs = parseHM(b.start_time)
      const be = parseHM(b.end_time)
      if (rangesOverlap(t, candEnd, bs, be)) { conflicts = true; break }
    }

    let state: SlotState
    if (conflicts) {
      state = 'hidden'
    } else if (clusterMin === null) {
      state = 'available'
    } else if (!enforceCluster) {
      // Far from the day — no cluster constraint, but flag adjacent ones as encouraged.
      state = (t >= clusterMin - gap && t <= clusterMax! + gap) ? 'adjacent' : 'available'
    } else if (t >= clusterMin - gap && t <= clusterMax! + gap) {
      state = 'adjacent'
    } else {
      state = 'hidden'
    }

    slots.push({ start_time: formatHM(t), state })
  }

  return slots
}
