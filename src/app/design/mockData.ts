import type { Booking, ClubConfig } from '@/lib/booking/types'

export const mockConfig: ClubConfig = {
  id: 1, name: 'CNV Wakeboard',
  am_start: '09:00:00', am_end: '12:30:00',
  pm_start: '14:00:00', pm_end: '18:30:00',
  cluster_gap_minutes: 45,
  cluster_lockin_hours: 24,
  solo_timeout_hours: 48,
  slot_step_minutes: 15,
  duration_2_minutes: 45,
  duration_3_minutes: 70,
  duration_4_minutes: 80,
}

export const mockBookings: Booking[] = [
  { id: 'm1', date: '2026-05-02', period: 'AM',
    start_time: '09:00:00', end_time: '10:10:00',
    member_count: 3, status: 'confirmed' },
  { id: 'm2', date: '2026-05-02', period: 'AM',
    start_time: '10:30:00', end_time: '11:50:00',
    member_count: 4, status: 'full' },
  { id: 'm3', date: '2026-05-02', period: 'AM',
    start_time: '12:00:00', end_time: '12:45:00',
    member_count: 1, status: 'pending' },
]

export const mockMembers: Record<string, { user_id: string; full_name: string }[]> = {
  m1: [{ user_id: 'u1', full_name: 'Alex' }, { user_id: 'u2', full_name: 'Sam' }, { user_id: 'u3', full_name: 'Jordan' }],
  m2: [{ user_id: 'u1', full_name: 'Alex' }, { user_id: 'u4', full_name: 'Robin' }, { user_id: 'u5', full_name: 'Casey' }, { user_id: 'u6', full_name: 'Morgan' }],
  m3: [{ user_id: 'u7', full_name: 'David' }],
}

export const mockDays = [
  { date: '2026-05-02', label: 'Sat 2' },
  { date: '2026-05-03', label: 'Sun 3' },
  { date: '2026-05-04', label: 'Mon 4' },
  { date: '2026-05-05', label: 'Tue 5' },
  { date: '2026-05-06', label: 'Wed 6' },
  { date: '2026-05-07', label: 'Thu 7' },
  { date: '2026-05-08', label: 'Fri 8' },
]
