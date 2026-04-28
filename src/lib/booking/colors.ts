import type { SlotState } from './types'

// Light-theme status colors. Yellow + red are reserved for CNV branding.
export const SLOT_BG: Record<SlotState, string> = {
  pending:   'bg-orange-50 border-orange-400 text-orange-700',
  confirmed: 'bg-emerald-50 border-emerald-500 text-emerald-700',
  full:      'bg-purple-50 border-purple-400 text-purple-700 cursor-not-allowed',
  available: 'bg-white border-slate-200 text-slate-600 hover:border-cnv-yellow',
  adjacent:  'bg-cyan-50 border-cyan-400 text-cyan-700',
  hidden:    'hidden',
}

export const SLOT_LABEL: Record<SlotState, string> = {
  pending:   'NEEDS_BUDDY',
  confirmed: 'OPEN_SPOTS',
  full:      'CAPACITY',
  available: 'OPEN',
  adjacent:  'CLUSTER_OK',
  hidden:    '',
}
