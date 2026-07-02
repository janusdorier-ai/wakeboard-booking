// Single source of truth for "who is this party for." Swap every value in
// this file to re-skin the whole game for a different client/event — no
// other file needs to change. Colors are hex (consumed as CSS vars in
// party/layout.tsx) so Tailwind's arbitrary-value classes (`bg-[var(--x)]`)
// pick them up without touching tailwind.config.ts or a safelist.
export interface GameLabel {
  icon: string
  title: string
  blurb: string
}

export interface ClientTheme {
  clientName: string
  eventName: string
  gameTitle: string
  tagline: string
  wordmark: string // short text badge shown top-left of the join screen, in lieu of a logo asset
  avatarChoices: string[]
  colors: {
    accent: string // primary brand accent — buttons, scores, highlights
    accentDark: string // hover/active state for accent
    gradientFrom: string // page background gradient, top
    gradientVia: string
    gradientTo: string // page background gradient, bottom
  }
  games: {
    trivia: GameLabel
    reflex: GameLabel
    predict: GameLabel
    photo: GameLabel
  }
}

export const CLIENT_THEME: ClientTheme = {
  clientName: 'MCI Group',
  eventName: 'Geneva Summer Party 2026',
  gameTitle: 'Making Waves',
  tagline: 'Ride the wake, rack up points, own the podium.',
  wordmark: 'MCI',
  avatarChoices: ['🏄', '🌊', '🚤', '🕶️', '🍹', '⚡', '🔥', '🎧', '🦩', '⭐', '🍉', '🎉'],
  colors: {
    accent: '#ff5a4e',
    accentDark: '#e23f35',
    gradientFrom: '#0891b2',
    gradientVia: '#38bdf8',
    gradientTo: '#fb923c',
  },
  games: {
    trivia: { icon: '🧠', title: 'Speed Trivia', blurb: 'Answer fast, score big' },
    reflex: { icon: '⚡', title: 'Wake Reflex', blurb: '5 seconds, tap like mad' },
    predict: { icon: '🔮', title: 'Make Waves', blurb: 'Guess closest, win points' },
    photo: { icon: '📸', title: 'Wake Pose', blurb: 'Snap it, get votes' },
  },
}
