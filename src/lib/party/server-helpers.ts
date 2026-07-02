import { randomBytes } from 'crypto'

export function generatePlayerToken(): string {
  return randomBytes(16).toString('hex')
}

// Admin routes are gated by a single shared passcode (set at deploy time),
// not Supabase Auth — the MC running the party doesn't need an account.
export function isValidAdminPasscode(passcode: unknown): boolean {
  const expected = process.env.PARTY_ADMIN_PASSCODE
  return typeof passcode === 'string' && !!expected && passcode === expected
}
