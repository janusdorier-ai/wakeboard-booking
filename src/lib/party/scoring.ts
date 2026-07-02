// Scoring rules for the party game. Kept in one place so the numbers are
// easy to tune between now and doors-open.

export const TRIVIA_BASE_POINTS = 70
export const TRIVIA_SPEED_BONUS_MAX = 30

export function computeTriviaPoints(correct: boolean, elapsedSeconds: number, timeLimitSeconds: number): number {
  if (!correct) return 0
  const remainingFrac = Math.max(0, (timeLimitSeconds - elapsedSeconds) / timeLimitSeconds)
  return TRIVIA_BASE_POINTS + Math.round(TRIVIA_SPEED_BONUS_MAX * remainingFrac)
}

export const REFLEX_POINTS_PER_TAP = 3
export const REFLEX_MAX_TAPS = 200 // sanity cap against spoofed submissions

export function computeReflexPoints(taps: number): number {
  const clamped = Math.max(0, Math.min(taps, REFLEX_MAX_TAPS))
  return clamped * REFLEX_POINTS_PER_TAP
}

export const PREDICTION_RANK_POINTS = [150, 100, 75] // 1st, 2nd, 3rd
export const PREDICTION_TOP10_POINTS = 30
export const PREDICTION_PARTICIPATION_POINTS = 10

export function computePredictionPoints(
  guesses: { id: string; guess: number }[],
  actual: number,
): Map<string, number> {
  const ranked = [...guesses].sort((a, b) => Math.abs(a.guess - actual) - Math.abs(b.guess - actual))
  const points = new Map<string, number>()
  ranked.forEach((g, i) => {
    if (i < PREDICTION_RANK_POINTS.length) points.set(g.id, PREDICTION_RANK_POINTS[i])
    else if (i < 10) points.set(g.id, PREDICTION_TOP10_POINTS)
    else points.set(g.id, PREDICTION_PARTICIPATION_POINTS)
  })
  return points
}

export const PHOTO_SUBMIT_POINTS = 25
export const PHOTO_VOTE_POINTS = 10
