'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export type WsStatus = 'connecting' | 'connected' | 'disconnected'

export interface WsPayload {
  type: string
  data?: unknown[]
}

export function useWebSocket(url: string | undefined) {
  const [status, setStatus] = useState<WsStatus>('connecting')
  const [lastMessage, setLastMessage] = useState<WsPayload | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intentionalClose = useRef(false)

  const connect = useCallback(() => {
    if (!url) { setStatus('disconnected'); return }
    intentionalClose.current = false
    setStatus('connecting')
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setStatus('connected')

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        // Normaliza wrappers do N8N: array, objeto direto ou .json aninhado
        let data: WsPayload | null = null
        if (Array.isArray(parsed)) {
          data = parsed[0]?.json?.type ? parsed[0].json : parsed[0]?.type ? parsed[0] : null
        } else if (parsed?.type) {
          data = parsed
        } else if (parsed?.json?.type) {
          data = parsed.json
        }
        if (data) setLastMessage(data)
      } catch { /* ignora parse errors */ }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      if (!intentionalClose.current) {
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => ws.close()
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      intentionalClose.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { status, lastMessage }
}
