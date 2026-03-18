import { NextRequest, NextResponse } from 'next/server'

const N8N_BASE = process.env.N8N_INTERNAL_URL || 'https://api.toreply.me/webhook'

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params
    const targetPath = path.join('/')
    const search = req.nextUrl.search
    const target = `${N8N_BASE}/${targetPath}${search}`

    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      if (!['host', 'connection', 'transfer-encoding', 'accept-encoding', 'content-length'].includes(key)) {
        headers[key] = value
      }
    })

    const body =
      req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined

    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    })

    // Read body as text to avoid streaming issues
    const resText = await res.text()

    // For error responses, return diagnostic JSON
    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'upstream_error',
          status: res.status,
          target,
          method: req.method,
          upstream_body: resText.slice(0, 1000),
        },
        { status: res.status }
      )
    }

    // For success, forward the response
    const resHeaders = new Headers()
    res.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(key)) {
        resHeaders.set(key, value)
      }
    })

    return new NextResponse(resText, { status: res.status, headers: resHeaders })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack?.slice(0, 500) : undefined
    return NextResponse.json(
      { error: 'proxy_crash', detail: msg, stack },
      { status: 502 }
    )
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
