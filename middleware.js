import { NextResponse } from 'next/server'

// Limiter in-memory a finestra fissa, chiave = metodo + path + IP.
// Nota: è per istanza server (non distribuito); per un deploy multi-istanza
// andrebbe spostato su un backing store condiviso (es. Redis).
const RATE_LIMITS = {
  '/api/chat': { windowMs: 60_000, max: 10 },            // quota AI a pagamento
  '/api/chat-locale': { windowMs: 60_000, max: 10 },
  '/api/upload': { windowMs: 60_000, max: 10 },          // elaborazione PDF costosa
  '/api/setup-locale': { windowMs: 60_000, max: 2 },     // job pesante (download+indici)
  '/api/status': { windowMs: 60_000, max: 60 },
}
const DEFAULT_LIMIT = { windowMs: 60_000, max: 30 }
const buckets = new Map()

function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

export function middleware(request) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Rate limit sugli endpoint /api
  const rule = RATE_LIMITS[pathname] || DEFAULT_LIMIT
  const key = `${request.method}:${pathname}:${clientIp(request)}`

  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || now - bucket.start >= rule.windowMs) {
    bucket = { start: now, count: 0 }
    buckets.set(key, bucket)
    // evita crescita illimitata della mappa in processi long-running
    if (buckets.size > 5000) buckets.clear()
  }
  bucket.count += 1

  response.headers.set('X-RateLimit-Limit', String(rule.max))
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, rule.max - bucket.count)))

  if (bucket.count > rule.max) {
    const retryAfter = Math.max(1, Math.ceil((bucket.start + rule.windowMs - now) / 1000))
    return new NextResponse(JSON.stringify({ error: 'Troppe richieste. Riprova tra poco.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    })
  }

  return response
}

export const config = {
  matcher: '/api/:path*',
}