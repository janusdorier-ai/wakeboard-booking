import type { SlotState } from './types'

// Dark-theme status styles — CNV Midnight Regatta
export const SLOT_BG: Record<SlotState, string> = {
  // Orange/amber — solo waker waiting for a buddy
  pending:
    'bg-amber-400/[0.12] border border-amber-400/30 text-amber-300',

  // Emerald — session confirmed, come join
  confirmed:
    'bg-emerald-400/[0.12] border border-emerald-400/30 text-emerald-300',

  // Violet — 4/4, boat is full
  full:
    'bg-violet-500/[0.12] border border-violet-400/25 text-violet-300 cursor-not-allowed',

  // Ghost — open, no cluster yet
  available:
    'bg-white/[0.03] border border-white/[0.07] text-slate-500 ' +
    'hover:border-cnv-yellow/40 hover:text-slate-300 hover:bg-cnv-yellow/[0.04] transition',

  // Cyan — within cluster window, encouraged to pick
  adjacent:
    'bg-cyan-400/[0.12] border border-cyan-400/30 text-cyan-300',

  hidden: 'hidden',
}

export const SLOT_LABEL: Record<SlotState, string> = {
  pending:   'Needs a buddy',
  confirmed: 'Join us!',
  full:      'Full',
  available: 'Open',
  adjacent:  'Available',
  hidden:    '',
}
