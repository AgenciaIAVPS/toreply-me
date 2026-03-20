'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { Conversation, Message } from '@/lib/types'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Search, MessageCircle, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatTime(dateStr: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200">Ativa</Badge>
  if (status === 'closed') return <Badge variant="secondary" className="text-xs">Fechada</Badge>
  return <Badge variant="outline" className="text-xs">Arquivada</Badge>
}

export default function ConversationsPage() {
  const { selectedTenant } = useTenant()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Conversation | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [convMeta, setConvMeta] = useState<{ contact_name: string; contact_phone: string | null; conversation_status: string } | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(() => {
    if (!selectedTenant) return
    api.get<{ conversations: Conversation[] }>(`/conversations-list?tenant_id=${selectedTenant.tenant_id}`)
      .then(r => setConversations(r.conversations || []))
      .catch(() => toast.error('Erro ao carregar conversas'))
      .finally(() => setLoadingConvs(false))
  }, [selectedTenant])

  const loadMessages = useCallback(async (conv: Conversation) => {
    if (!selectedTenant) return
    setLoadingMsgs(true)
    try {
      const res = await api.get<{ messages: Message[]; conversation: { contact_name: string; contact_phone: string | null; conversation_status: string } }>(
        `/messages-list?tenant_id=${selectedTenant.tenant_id}&conversation_id=${conv.conversation_id}`
      )
      setMessages(res.messages || [])
      setConvMeta(res.conversation || null)
    } catch {
      toast.error('Erro ao carregar mensagens')
    } finally {
      setLoadingMsgs(false)
    }
  }, [selectedTenant])

  useEffect(() => {
    setLoadingConvs(true)
    loadConversations()
  }, [loadConversations])

  // Select conversation
  const selectConv = (conv: Conversation) => {
    setSelected(conv)
    setMessages([])
    setConvMeta(null)
    loadMessages(conv)
  }

  // Polling: reload messages every 5s when a conversation is selected
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!selected || !selectedTenant) return
    pollRef.current = setInterval(() => loadMessages(selected), 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selected, selectedTenant, loadMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filtered = conversations.filter(c =>
    !search || c.contact_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_phone || '').includes(search) ||
    (c.last_message || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] border rounded-lg overflow-hidden">
      {/* Left panel: Conversation list */}
      <div className="w-80 shrink-0 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-20 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">Nenhuma conversa.</p>
            </div>
          ) : (
            filtered.map(conv => (
              <button
                key={conv.conversation_id}
                onClick={() => selectConv(conv)}
                className={cn(
                  'w-full text-left p-3 border-b hover:bg-muted/50 transition-colors',
                  selected?.conversation_id === conv.conversation_id && 'bg-muted'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium leading-tight truncate">{conv.contact_name}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatTime(conv.conversation_last_message_at)}
                  </span>
                </div>
                {conv.last_message && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {conv.last_message_sender === 'ai' ? '🤖 ' : ''}{conv.last_message}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  <StatusBadge status={conv.conversation_status} />
                  {conv.unread_count > 0 && (
                    <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel: Messages */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Selecione uma conversa</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b px-4 py-3 flex items-center gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">{convMeta?.contact_name || selected.contact_name}</p>
                {(convMeta?.contact_phone || selected.contact_phone) && (
                  <p className="text-xs text-muted-foreground">{convMeta?.contact_phone || selected.contact_phone}</p>
                )}
              </div>
              {convMeta && <StatusBadge status={convMeta.conversation_status} />}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-20 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">Nenhuma mensagem.</div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.messages_id}
                    className={cn('flex gap-2', msg.messages_sender === 'contact' ? 'justify-end' : 'justify-start')}
                  >
                    {msg.messages_sender === 'ai' && (
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                        <Bot size={12} className="text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[70%] rounded-2xl px-3 py-2 text-sm',
                        msg.messages_sender === 'contact'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.messages_content}</p>
                      <p className={cn('text-[10px] mt-1', msg.messages_sender === 'contact' ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground')}>
                        {formatTime(msg.messages_date_creation)}
                      </p>
                    </div>
                    {msg.messages_sender === 'contact' && (
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                        <User size={12} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
