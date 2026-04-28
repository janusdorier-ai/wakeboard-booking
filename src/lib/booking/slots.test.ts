import { describe, it, expect } from 'vitest'
import { generateSlots } from './slots'
import type { Booking, ClubConfig } from './types'

const cfg: ClubConfig = {
  id: 1, name: 'Test',
  am_start: '09:00', am_end: '12:30',
  pm_start: '14:00', pm_end: '18:30',
  cluster_gap_minutes: 45,
  cluster_lockin_hours: 24,
  solo_timeout_hours: 48,
  slot_step_minutes: 15,
  duration_2_minutes: 45,
  duration_3_minutes: 70,
  duration_4_minutes: 80,
}

// Tests pass `date` only when they want lock-in considered. Without `date`,
// generateSlots assumes cluster is enforced (the historical behaviour).

const states = (s: ReturnType<typeof generateSlots>) => s.map(x => [x.start_time, x.state] as const)

describe('generateSlots', () => {
  it('shows all AM candidates as available when no bookings exist', () => {
    const slots = generateSlots({ config: cfg, period: 'AM', bookings: [] })
    expect(slots.every(s => s.state === 'available')).toBe(true)
    expect(slots[0].start_time).toBe('09:00')
    // last viable start = 12:30 - 45min = 11:45
    expect(slots[slots.length - 1].start_time).toBe('11:45')
  })

  it('hides far-away candidates once a cluster anchor is booked', () => {
    const bookings: Booking[] = [
      { id: 'b1', date: '2026-05-01', period: 'AM',
        start_time: '09:00:00', end_time: '09:45:00',
        member_count: 2, status: 'confirmed' },
    ]
    const slots = generateSlots({ config: cfg, period: 'AM', bookings })

    // 09:00 itself = the booking (confirmed)
    expect(slots.find(s => s.start_time === '09:00')!.state).toBe('confirmed')

    // 09:45 + 45min gap → 10:30 is the last cluster-friendly start
    expect(slots.find(s => s.start_time === '10:30')!.state).toBe('adjacent')

    // 10:45 onwards = outside cluster, should be hidden
    expect(slots.find(s => s.start_time === '10:45')!.state).toBe('hidden')
    expect(slots.find(s => s.start_time === '11:45')!.state).toBe('hidden')
  })

  it('hides candidates that would overlap an existing booking', () => {
    const bookings: Booking[] = [
      { id: 'b1', date: '2026-05-01', period: 'AM',
        start_time: '10:00:00', end_time: '10:45:00',
        member_count: 2, status: 'confirmed' },
    ]
    const slots = generateSlots({ config: cfg, period: 'AM', bookings })
    // 09:30 + 45min = 10:15 → overlaps 10:00–10:45
    expect(slots.find(s => s.start_time === '09:30')!.state).toBe('hidden')
    // 09:15 + 45min = 10:00 → does not overlap (touches boundary)
    expect(slots.find(s => s.start_time === '09:15')!.state).toBe('adjacent')
  })

  it('skips cluster enforcement when more than lockin_hours from period start', () => {
    const bookings: Booking[] = [
      { id: 'b1', date: '2026-05-01', period: 'AM',
        start_time: '09:00:00', end_time: '09:45:00',
        member_count: 2, status: 'confirmed' },
    ]
    // 5 days before — far outside the 24h lock-in window
    const slots = generateSlots({
      config: cfg, period: 'AM', bookings,
      date: '2026-05-01', now: new Date('2026-04-26T09:00:00Z'),
    })
    // The far-end candidate that would normally be hidden is now bookable
    expect(slots.find(s => s.start_time === '11:45')!.state).toBe('available')
  })

  it('enforces cluster once we cross the lockin horizon', () => {
    const bookings: Booking[] = [
      { id: 'b1', date: '2026-05-01', period: 'AM',
        start_time: '09:00:00', end_time: '09:45:00',
        member_count: 2, status: 'confirmed' },
    ]
    // 1 hour before — well inside the 24h lock-in window
    const slots = generateSlots({
      config: cfg, period: 'AM', bookings,
      date: '2026-05-01', now: new Date('2026-05-01T08:00:00Z'),
    })
    expect(slots.find(s => s.start_time === '11:45')!.state).toBe('hidden')
  })

  it('treats AM and PM as independent clusters', () => {
    const bookings: Booking[] = [
      { id: 'b1', date: '2026-05-01', period: 'AM',
        start_time: '09:00:00', end_time: '09:45:00',
        member_count: 2, status: 'confirmed' },
    ]
    const pm = generateSlots({ config: cfg, period: 'PM', bookings: [] })
    // PM has no bookings, so all candidates available
    expect(pm.every(s => s.state === 'available')).toBe(true)
  })

  it('marks pending solo slot in yellow', () => {
    const bookings: Booking[] = [
      { id: 'b1', date: '2026-05-01', period: 'AM',
        start_time: '10:00:00', end_time: '10:45:00',
        member_count: 1, status: 'pending' },
    ]
    const slots = generateSlots({ config: cfg, period: 'AM', bookings })
    expect(slots.find(s => s.start_time === '10:00')!.state).toBe('pending')
  })
})
