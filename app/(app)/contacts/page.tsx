'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { Contact } from '@/lib/types'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Search, Users, MessageCircle, Phone } from 'lucide-react'

export default function ContactsPage() {
  const { selectedTenant } = useTenant()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  const load = useCallback((q: string, p: number) => {
    if (!selectedTenant) return
    setLoading(true)
    const params = new URLSearchParams({
      tenant_id: selectedTenant.tenant_id.toString(),
      page: p.toString(),
      limit: limit.toString(),
      ...(q ? { search: q } : {}),
    })
    api.get<{ contacts: Contact[] }>(`/contacts-list?${params}`)
      .then(r => setContacts(r.contacts || []))
      .catch(() => toast.error('Erro ao carregar contatos'))
      .finally(() => setLoading(false))
  }, [selectedTenant])

  useEffect(() => { load(search, page) }, [load, search, page])

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Contatos</h1>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar por nome ou telefone..."
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>Buscar</Button>
        {search && (
          <Button variant="ghost" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}>
            Limpar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Users className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">{search ? 'Nenhum contato encontrado.' : 'Nenhum contato cadastrado.'}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map(contact => (
              <Card key={contact.contact_id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{contact.contact_name}</p>
                      {contact.nome_empresa && contact.nome_empresa !== contact.contact_name && (
                        <p className="text-xs text-muted-foreground truncate">{contact.nome_empresa}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 font-mono">#{contact.contact_id}</span>
                  </div>

                  <div className="mt-2 space-y-1">
                    {contact.telefone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone size={11} />
                        <span>{contact.telefone}</span>
                      </div>
                    )}
                    {contact.localizacao && (
                      <p className="text-xs text-muted-foreground truncate">{contact.localizacao}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageCircle size={11} />
                      <span>{contact.total_conversations} conversa{Number(contact.total_conversations) !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Página {page} · {contacts.length} contato{contacts.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={contacts.length < limit} onClick={() => setPage(p => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
