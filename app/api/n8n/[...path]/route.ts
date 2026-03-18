import { NextRequest, NextResponse } from 'next/server'

const N8N_BASE = process.env.N8N_INTERNAL_URL || 'https://api.toreply.me/webhook'

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const targetPath = path.join('/')
  const search = req.nextUrl.search
  const target = `${N8N_BASE}/${targetPath}${search}`

  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    if (!['host', 'connection', 'transfer-encoding', 'accept-encoding'].includes(key)) {
      headers[key] = value
    }
  })

  const body =
    req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined

  let res: Response
  try {
    res = await fetch(target, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[n8n-proxy] fetch error:', msg, 'target:', target)
    return NextResponse.json({ error: 'proxy_error', detail: msg }, { status: 502 })
  }

  const resHeaders = new Headers()
  res.headers.forEach((value, key) => {
    if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(key)) resHeaders.set(key, value)
  })

  return new NextResponse(res.body, { status: res.status, headers: resHeaders })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
