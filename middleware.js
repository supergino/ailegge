import { NextResponse } from 'next/server'

// Limiter in-memory a finestra fissa, chiave = metodo + path + IP.
// Nota: è per istanza server (non distribuito); per un deploy multi-istanza
// andrebbe spostato su un backing store condiviso (es. Redis/KV) condiviso.
const RATE_LIMITS = {
  '/api/chat': { windowMs: 60_000, max: 10 },            // quota AI a pagamento
  '/api/chat-locale': { windowMs: 60_000, max: 10 },
  '/api/upload': { windowMs: 60_000, max: 10 },          // elaborazione PDF costosa
  '/api/setup-locale': { windowMs: 60_000, max: 2 },     // job pesante (download+indici)
  '/api/status': { windowMs: 60_000, max: 60 },
}
const DEFAULT_LIMIT = { windowMs: 60_000, max: 30 }
const buckets = new Map()

// CSP: protegge tutte le rotte (non solo /api). 'unsafe-inline' è necessario per
// gli script bootstrap di Next.js in produzione; il vincolo principale è
// frame-ancestors 'none' (anti-clickjacking) e base-uri/form-action 'self'.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function setSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // HSTS: applicato sempre; innocuo su HTTP, efficace su HTTPS.
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  // CSP stretto SOLO in produzione: in development React/Fast Refresh richiedono
  // eval() e 'unsafe-inline', altrimenti la console mostra errori di eval non supportato.
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', CSP)
  }
}

function clientIp(request) {
  // H1: non fidarsi mai di X-Forwarded-For se non siamo esplicitamente dietro un
  // proxy attendibile. Altrimenti un attaccante può falsificare l'IP e bypassare
  // il rate limiting inviando un XFF diverso a ogni richiesta.
  const trustedProxy = process.env.TRUSTED_PROXY === '1' || process.env.TRUSTED_PROXY === 'true'
  if (!trustedProxy) {
    const direct = request.ip || request.headers.get('x-real-ip')
    if (direct) return direct
  }
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || request.ip || 'unknown'
}

const LOCALHOST_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'])

// HIGH 1/3: gating opzionale di tutte le API tramite APP_API_KEY.
// Se APP_API_KEY NON è impostato: tutto aperto (uso locale single-user).
// Se impostato: serve il token (Bearer o ?key=) oppure provenire da localhost.
// In questo modo un deploy pubblico senza token non può né consumare quota né
// ricostruire/cancellare l'indice.
function apiAuthorized(request, ip) {
  if (!process.env.APP_API_KEY) return true
  if (LOCALHOST_IPS.has(ip)) return true
  const auth = request.headers.get('authorization') || ''
  if (auth === `Bearer ${process.env.APP_API_KEY}`) return true
  const token = new URL(request.url).searchParams.get('key')
  if (token === process.env.APP_API_KEY) return true
  return false
}

export function middleware(request) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // M2: header di sicurezza (inclusa CSP) su TUTTE le rotte.
  setSecurityHeaders(response)

  // Rate limit e auth solo sugli endpoint /api
  if (!pathname.startsWith('/api')) {
    return response
  }

  const ip = clientIp(request)

  // HIGH 1/3: autorizzazione API.
  if (!apiAuthorized(request, ip)) {
    const denied = new NextResponse(
      JSON.stringify({ error: 'Non autorizzato. Configura APP_API_KEY sul server o esegui da localhost.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
    setSecurityHeaders(denied)
    return denied
  }

  const rule = RATE_LIMITS[pathname] || DEFAULT_LIMIT
  const key = `${request.method}:${pathname}:${ip}`

  // HIGH 2: eviction pigra delle entry scadute invece di svuotare la mappa
  // (che azzerava i limiti di tutti gli utenti).
  if (buckets.size > 2000) {
    const expiry = Date.now() - rule.windowMs * 2
    for (const [k, b] of buckets) {
      if (b.start <= expiry) buckets.delete(k)
    }
  }

  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || now - bucket.start >= rule.windowMs) {
    bucket = { start: now, count: 0 }
    buckets.set(key, bucket)
  }
  bucket.count += 1

  response.headers.set('X-RateLimit-Limit', String(rule.max))
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, rule.max - bucket.count)))

  if (bucket.count > rule.max) {
    const retryAfter = Math.max(1, Math.ceil((bucket.start + rule.windowMs - now) / 1000))
    const denied = new NextResponse(JSON.stringify({ error: 'Troppe richieste. Riprova tra poco.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    })
    setSecurityHeaders(denied)
    return denied
  }

  return response
}

export const config = {
  matcher: '/:path*',
}
