import { NextRequest, NextResponse } from 'next/server'
import { isValidAdminPasscode } from '@/lib/party/server-helpers'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!isValidAdminPasscode(body?.passcode)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
