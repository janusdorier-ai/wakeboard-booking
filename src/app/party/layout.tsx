import type { Metadata } from 'next'
import { CLIENT_THEME } from '@/lib/party/client-config'

export const metadata: Metadata = {
  title: `${CLIENT_THEME.gameTitle} — ${CLIENT_THEME.clientName}`,
  description: `Live party games — ${CLIENT_THEME.eventName}`,
}

export default function PartyLayout({ children }: { children: React.ReactNode }) {
  const { colors } = CLIENT_THEME
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[var(--party-grad-from)] via-[var(--party-grad-via)] to-[var(--party-grad-to)] text-slate-900"
      style={{
        // CSS custom properties — the one place theme colors reach the DOM.
        // Every themed class elsewhere reads these via bg-[var(--party-*)].
        ['--party-accent' as string]: colors.accent,
        ['--party-accent-dark' as string]: colors.accentDark,
        ['--party-grad-from' as string]: colors.gradientFrom,
        ['--party-grad-via' as string]: colors.gradientVia,
        ['--party-grad-to' as string]: colors.gradientTo,
      }}
    >
      {children}
    </div>
  )
}
