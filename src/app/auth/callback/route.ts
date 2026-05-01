import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/book'

  if (code) {
    // Create the redirect response FIRST so we can attach cookies directly to it.
    // If we set cookies via cookies() from next/headers and then return a new
    // NextResponse.redirect(), the cookies are lost. Attaching them to the same
    // response object is the only reliable way across Next.js versions.
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
            toSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return response
  }

  // Code missing or exchange failed → back to login
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
