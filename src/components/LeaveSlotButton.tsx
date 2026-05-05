'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  bookingId: string
}

export function LeaveSlotButton({ bookingId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const router   = useRouter()
  const supabase = createClient()

  async function handleLeave() {
    if (!window.confirm('Leave this slot? Your spot will free up for others.')) return
    setState('loading')
    const { error } = await supabase.rpc('leave_booking', { p_booking_id: bookingId })
    if (error) {
      alert(error.message)
      setState('idle')
      return
    }
    setState('done')
    router.refresh()
  }

  if (state === 'done') {
    return (
      <span className="font-mono text-[10px] tracking-widest text-slate-500">Left</span>
    )
  }

  return (
    <button
      disabled={state === 'loading'}
      onClick={handleLeave}
      className="font-mono text-[10px] tracking-widest text-slate-500 hover:text-red-400 border border-white/[0.08] hover:border-red-500/30 px-2.5 py-1.5 transition disabled:opacity-40 shrink-0">
      {state === 'loading' ? '…' : 'Leave'}
    </button>
  )
}
