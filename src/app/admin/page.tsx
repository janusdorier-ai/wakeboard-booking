import { createClient } from '@/lib/supabase/server'
import { AdminClient } from './AdminClient'
import { format, addDays } from 'date-fns'

export default async function AdminPage() {
  const supabase = createClient()
  const today    = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const horizon  = format(addDays(new Date(), 14), 'yyyy-MM-dd')

  const [
    { data: config },
    { data: privateConfig },
    { data: bookings },
    { data: overrides },
    { data: memberRows },
    { data: profilesAll },
  ] = await Promise.all([
    supabase.from('club_config').select('*').eq('id', 1).single(),
    supabase.from('private_config').select('*').eq('id', 1).maybeSingle(),
    supabase.from('bookings').select('*')
      .gte('date', today).lte('date', horizon)
      .neq('status', 'cancelled')
      .order('date').order('start_time'),
    supabase.from('day_overrides').select('*').gte('date', today),
    // Fetch raw member rows — two-step because user_id → auth.users, not profiles
    supabase.from('booking_members').select('booking_id, user_id'),
    supabase.from('profiles').select('id, full_name, role, created_at').order('full_name'),
  ])

  // Two-step: resolve user_id → full_name via profiles table
  const membersByBooking: Record<string, { user_id: string; full_name: string | null }[]> = {}
  if (memberRows && memberRows.length > 0) {
    const userIds = [...new Set((memberRows as any[]).map(r => r.user_id))]
    const { data: nameRows } = await supabase
      .from('profiles').select('id, full_name').in('id', userIds)
    const nameMap: Record<string, string> = {}
    for (const p of (nameRows ?? []) as any[]) nameMap[p.id] = p.full_name
    for (const row of memberRows as any[]) {
      ;(membersByBooking[row.booking_id] ??= []).push({
        user_id:   row.user_id,
        full_name: nameMap[row.user_id] ?? null,
      })
    }
  }

  return (
    <AdminClient
      config={config!}
      privateConfig={privateConfig ?? null}
      bookings={bookings ?? []}
      overrides={overrides ?? []}
      membersByBooking={membersByBooking}
      profiles={(profilesAll ?? []) as any[]}
      todayDate={today}
      tomorrowDate={tomorrow}
    />
  )
}
