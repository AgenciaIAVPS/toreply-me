'use client'
import { useEffect, useState } from 'react'

export type SseStatus = 'connecting' | 'connected' | 'disconnected'
export interface SsePayload { type: string; data?: unknown[] }

export function useSSE(url: string | undefined) {
  const [status, setStatus] = useState<SseStatus>('connecting')
  const [lastMessage, setLastMessage] = useState<SsePayload | null>(null)

  useEffect(() => {
    if (!url) { setStatus('disconnected'); return }
    const es = new EventSource(url)
    es.onopen = () => setStatus('connected')
    es.onmessage = (e) => {
      try { setLastMessage(JSON.parse(e.data)) } catch {}
    }
    es.onerror = () => setStatus('disconnected')
    // EventSource reconecta automaticamente — sem necessidade de lógica manual
    return () => es.close()
  }, [url])

  return { status, lastMessage }
}
