'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { Contact, Instance } from '@/lib/types'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Loader2, Search, Users, MessageCircle, Phone, Link2, Plus, Trash2 } from 'lucide-react'

type AuthPhone = {
  id: number
  whatsapp_phone_number: string
  external_company_name: string | null
  external_id: string | null
  instance_id: number
  instance_name: string | null
}

export default function ContactsPage() {
  const { user } = useAuth()
  const { selectedTenant } = useTenant()

  const isAdmin = selectedTenant?.tenant_user_role === 'admin'
  const isMasterAdmin = !!user?.user_is_master_admin
  const canSeeSubtenants = isAdmin || isMasterAdmin

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  // Subtenants dialog
  const [subtenantsContact, setSubtenantsContact] = useState<Contact | null>(null)
  const [subtenantsOpen, setSubtenantsOpen] = useState(false)
  const [authPhones, setAuthPhones] = useState<AuthPhone[]>([])
  const [phonesLoading, setPhonesLoading] = useState(false)
  const [instances, setInstances] = useState<Instance[]>([])
  const [instancesLoading, setInstancesLoading] = useState(false)
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<number[]>([])
  const [newPhoneCompany, setNewPhoneCompany] = useState('')
  const [newPhoneExtId, setNewPhoneExtId] = useState('')
  const [addingPhone, setAddingPhone] = useState(false)

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

  // ─── Subtenants dialog ─────────────────────────────────────────────────────

  const loadAuthPhones = async (contact: Contact) => {
    if (!selectedTenant || !contact.telefone) return
    setPhonesLoading(true)
    try {
      const res = await api.get<{ phones: AuthPhone[] }>(
        `/authphones-list?tenant_id=${selectedTenant.tenant_id}&phone_number=${encodeURIComponent(contact.telefone)}`
      )
      setAuthPhones((res.phones || []).filter(p => p.whatsapp_phone_number))
    } catch {
      toast.error('Erro ao carregar vínculos')
    } finally {
      setPhonesLoading(false)
    }
  }

  const loadInstances = async () => {
    if (!selectedTenant) return
    setInstancesLoading(true)
    try {
      const res = await api.get<{ instances: Instance[] }>(`/instances-list?tenant_id=${selectedTenant.tenant_id}`)
      setInstances((res.instances || []).filter(i => i.instance_channel === 'whatsapp'))
    } catch {
      toast.error('Erro ao carregar instâncias')
    } finally {
      setInstancesLoading(false)
    }
  }

  const openSubtenants = (contact: Contact) => {
    setSubtenantsContact(contact)
    setAuthPhones([])
    setInstances([])
    setSelectedInstanceIds([])
    setNewPhoneCompany('')
    setNewPhoneExtId('')
    setSubtenantsOpen(true)
    loadAuthPhones(contact)
    loadInstances()
  }

  const toggleInstanceId = (id: number) => {
    setSelectedInstanceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const addPhone = async () => {
    if (!subtenantsContact || !selectedTenant || !subtenantsContact.telefone) return
    if (!newPhoneCompany.trim() || !newPhoneExtId.trim()) {
      toast.error('Preencha o nome da empresa e o ID externo')
      return
    }
    if (selectedInstanceIds.length === 0) {
      toast.error('Selecione ao menos uma instância')
      return
    }
    setAddingPhone(true)
    try {
      await Promise.all(selectedInstanceIds.map(instanceId =>
        api.post('/authphones-create', {
          tenant_id: selectedTenant.tenant_id,
          phone_number: subtenantsContact.telefone,
          external_company_name: newPhoneCompany.trim(),
          external_id: newPhoneExtId.trim(),
          instance_id: instanceId,
        })
      ))
      toast.success('Vínculo adicionado')
      setNewPhoneCompany('')
      setNewPhoneExtId('')
      setSelectedInstanceIds([])
      loadAuthPhones(subtenantsContact)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar vínculo')
    } finally {
      setAddingPhone(false)
    }
  }

  const deletePhone = async (phoneId: number) => {
    if (!selectedTenant) return
    try {
      await api.post('/authphones-delete', { tenant_id: selectedTenant.tenant_id, phone_id: phoneId })
      toast.success('Vínculo removido')
      if (subtenantsContact) loadAuthPhones(subtenantsContact)
    } catch {
      toast.error('Erro ao remover vínculo')
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

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
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground font-mono">#{contact.contact_id}</span>
                      {canSeeSubtenants && contact.telefone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Ver subtenants vinculados"
                          onClick={() => openSubtenants(contact)}
                        >
                          <Link2 size={12} />
                        </Button>
                      )}
                    </div>
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

      {/* Subtenants Dialog */}
      <Dialog open={subtenantsOpen} onOpenChange={setSubtenantsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subtenants — {subtenantsContact?.contact_name}</DialogTitle>
          </DialogHeader>

          {subtenantsContact && (
            <div className="space-y-5">
              <p className="text-xs text-muted-foreground">
                Vínculos do número <span className="font-mono">{subtenantsContact.telefone}</span> com instâncias e empresas externas.
              </p>

              {/* List of existing auth phones */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Vínculos existentes</p>
                {phonesLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : authPhones.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 text-center">Nenhum vínculo encontrado.</p>
                ) : (
                  <div className="space-y-2">
                    {authPhones.map(phone => (
                      <div key={phone.id} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-medium truncate">{phone.external_company_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: <span className="font-mono">{phone.external_id || '—'}</span>
                            {phone.instance_name && <> · {phone.instance_name}</>}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0">
                              <Trash2 size={13} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover vínculo</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remover o vínculo com <strong>{phone.external_company_name}</strong>?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePhone(phone.id)} className="bg-destructive hover:bg-destructive/90">
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add new link */}
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium">Adicionar vínculo</p>

                {/* Instance selection */}
                <div className="space-y-1">
                  <Label className="text-xs">Números de WhatsApp *</Label>
                  {instancesLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Carregando instâncias...
                    </div>
                  ) : instances.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma instância WhatsApp disponível.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto border rounded-md p-2">
                      {instances.map(inst => (
                        <label key={inst.instance_id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedInstanceIds.includes(inst.instance_id)}
                            onChange={() => toggleInstanceId(inst.instance_id)}
                            className="rounded"
                          />
                          <span className="truncate">{inst.instance_name}{inst.instance_phone_number ? ` · ${inst.instance_phone_number}` : ''}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Nome da empresa *</Label>
                  <Input
                    value={newPhoneCompany}
                    onChange={e => setNewPhoneCompany(e.target.value)}
                    placeholder="Ex: Restaurante do João"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">External ID *</Label>
                  <Input
                    value={newPhoneExtId}
                    onChange={e => setNewPhoneExtId(e.target.value)}
                    placeholder="Ex: 001"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={addPhone}
                  disabled={addingPhone || !newPhoneCompany.trim() || !newPhoneExtId.trim() || selectedInstanceIds.length === 0}
                >
                  {addingPhone
                    ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Adicionando...</>
                    : <><Plus className="h-3 w-3 mr-1" />Adicionar</>
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
