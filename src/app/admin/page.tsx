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
    { data: members },
  ] = await Promise.all([
    supabase.from('club_config').select('*').eq('id', 1).single(),
    supabase.from('private_config').select('*').eq('id', 1).maybeSingle(),
    supabase.from('bookings').select('*').gte('date', today).lte('date', horizon)
      .neq('status', 'cancelled').order('date').order('start_time'),
    supabase.from('day_overrides').select('*').gte('date', today),
    supabase.from('booking_members').select('booking_id, user_id, profiles(full_name)'),
  ])

  // Group members by booking_id for the AdminClient.
  const membersByBooking: Record<string, { user_id: string; full_name: string | null }[]> = {}
  for (const row of (members ?? []) as any[]) {
    ;(membersByBooking[row.booking_id] ??= []).push({
      user_id: row.user_id,
      full_name: row.profiles?.full_name ?? null,
    })
  }

  return (
    <AdminClient
      config={config!}
      privateConfig={privateConfig ?? null}
      bookings={bookings ?? []}
      overrides={overrides ?? []}
      membersByBooking={membersByBooking}
      todayDate={today}
      tomorrowDate={tomorrow}
    />
  )
}
