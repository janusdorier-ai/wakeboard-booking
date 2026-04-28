import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// /design routes are public mockups (no auth needed for previewing styles)
const PROTECTED = ['/book', '/admin', '/me']
const ADMIN_ONLY = ['/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const needsAuth = PROTECTED.some(p => pathname.startsWith(p))
  if (!needsAuth) return NextResponse.next()

  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (ADMIN_ONLY.some(p => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/book', request.url))
    }
  }
  return response
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/api/:path*'],
}
