import { NextRequest, NextResponse } from 'next/server'

const N8N_BASE = process.env.N8N_INTERNAL_URL || 'https://api.toreply.me/webhook'

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const targetPath = path.join('/')
  const search = req.nextUrl.search
  const target = `${N8N_BASE}/${targetPath}${search}`

  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    if (!['host', 'connection', 'transfer-encoding'].includes(key)) {
      headers[key] = value
    }
  })

  const body =
    req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined

  const res = await fetch(target, {
    method: req.method,
    headers,
    body,
  })

  const resHeaders = new Headers()
  res.headers.forEach((value, key) => {
    if (key !== 'transfer-encoding') resHeaders.set(key, value)
  })

  return new NextResponse(res.body, { status: res.status, headers: resHeaders })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
