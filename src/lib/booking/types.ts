export type Period = 'AM' | 'PM'

export type BookingStatus = 'pending' | 'confirmed' | 'full' | 'cancelled'

export interface ClubConfig {
  id: number
  name: string
  am_start: string // 'HH:MM' or 'HH:MM:SS'
  am_end: string
  pm_start: string
  pm_end: string
  cluster_gap_minutes: number
  cluster_lockin_hours: number
  solo_timeout_hours: number
  slot_step_minutes: number
  duration_2_minutes: number
  duration_3_minutes: number
  duration_4_minutes: number
}

export interface Booking {
  id: string
  date: string         // 'YYYY-MM-DD'
  period: Period
  start_time: string   // 'HH:MM' or 'HH:MM:SS'
  end_time: string
  member_count: number
  status: BookingStatus
}

export interface BookingMember {
  booking_id: string
  user_id: string
  full_name?: string
}

export type SlotState =
  | 'pending'    // 1 member, needs buddy (yellow)
  | 'confirmed'  // 2-3 members (green)
  | 'full'       // 4 members (blue)
  | 'available'  // empty, no cluster yet (grey)
  | 'adjacent'   // empty, within cluster gap (encouraged)
  | 'hidden'     // outside cluster window OR conflicts with extension reach

export interface CandidateSlot {
  start_time: string   // 'HH:MM'
  end_time?: string    // present if booking exists
  state: SlotState
  booking?: Booking
  members?: BookingMember[]
}
