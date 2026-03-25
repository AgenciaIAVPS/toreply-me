'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { isValidSlug, sanitizeSlug } from '@/lib/validators'
import { RelChildSummary, Instance } from '@/lib/types'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Loader2, Building2, Lock, Unlock, Plus, Pencil, CreditCard, Receipt, UserPlus, Unlink2, Phone, Trash2, Link2, Database } from 'lucide-react'

type DialogMode = 'edit' | 'credits' | 'fees' | 'subscription' | 'unlink' | 'whatsapp' | 'create' | 'localdb' | null

type AuthPhone = {
  id: number
  whatsapp_phone_number: string
  external_company_name: string | null
  external_id: string | null
  instance_id: number
  instance_name: string | null
}

interface LocalDb {
  ldb_id: string
  ldb_name: string
  ldb_type: string
  ldb_host: string | null
  ldb_port: number | null
  ldb_user: string | null
  ldb_database: string | null
  ldb_is_active: boolean
}

const DB_TYPES = ['postgres', 'mysql', 'sqlite', 'sqlserver', 'oracle']
const EMPTY_DB_FORM = { ldb_name: '', ldb_type: 'postgres', ldb_host: '', ldb_port: '', ldb_user: '', ldb_pass: '', ldb_database: '' }

export default function ClientsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedTenant } = useTenant()
  const isMaster = user?.user_is_master_admin && selectedTenant?.tenant_is_master
  const isParent = selectedTenant?.tenant_is_parent

  const [clients, setClients] = useState<RelChildSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<RelChildSummary | null>(null)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [search, setSearch] = useState('')

  // Client invite link (global — new company becomes child tenant)
  const [clientInviteUrl, setClientInviteUrl] = useState<string | null>(null)
  const [clientInviteOpen, setClientInviteOpen] = useState(false)
  const [clientInviteLoading, setClientInviteLoading] = useState(false)

  // Per-client user invite link (invites a user to join an existing child tenant)
  const [childUserInviteUrl, setChildUserInviteUrl] = useState<string | null>(null)
  const [childUserInviteOpen, setChildUserInviteOpen] = useState(false)
  const [childUserInviteLoading, setChildUserInviteLoading] = useState(false)
  const [childUserInviteTarget, setChildUserInviteTarget] = useState<RelChildSummary | null>(null)

  // Edit form
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editExtId, setEditExtId] = useState('')
  const [saving, setSaving] = useState(false)

  // Credits form
  const [creditAmount, setCreditAmount] = useState('')
  const [creditDesc, setCreditDesc] = useState('')

  // Fees form
  const [feeMultiplier, setFeeMultiplier] = useState('')
  const [feeFixed, setFeeFixed] = useState('')
  const [feeSub, setFeeSub] = useState('')

  // Subscription form
  const [subMonth, setSubMonth] = useState('')
  const [subAmount, setSubAmount] = useState('')

  // Contatos (WhatsApp auth phones)
  const [authPhones, setAuthPhones] = useState<AuthPhone[]>([])
  const [phonesLoading, setPhonesLoading] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [newPhoneCompany, setNewPhoneCompany] = useState('')
  const [newPhoneExtId, setNewPhoneExtId] = useState('')
  const [addingPhone, setAddingPhone] = useState(false)
  // Instances for contact registration
  const [instances, setInstances] = useState<Instance[]>([])
  const [instancesLoading, setInstancesLoading] = useState(false)
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<number[]>([])

  // Create client form
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createSlug, setCreateSlug] = useState('')
  const [createSlugError, setCreateSlugError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // LocalDB per client
  const [clientDbs, setClientDbs] = useState<LocalDb[]>([])
  const [clientDbsLoading, setClientDbsLoading] = useState(false)
  const [clientDbDialog, setClientDbDialog] = useState(false)
  const [editingClientDb, setEditingClientDb] = useState<LocalDb | null>(null)
  const [clientDbForm, setClientDbForm] = useState(EMPTY_DB_FORM)
  const [savingClientDb, setSavingClientDb] = useState(false)
  const [deletingClientDb, setDeletingClientDb] = useState<string | null>(null)

  const canAccess = !!(isMaster || isParent)

  const generateClientInvite = async () => {
    if (!selectedTenant) return
    setClientInviteLoading(true)
    try {
      const res = await api.post<{ invite_url: string }>('/invites-generate-client', {
        tenant_id: selectedTenant.tenant_id,
      })
      setClientInviteUrl(res.invite_url)
      setClientInviteOpen(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar convite')
    } finally {
      setClientInviteLoading(false)
    }
  }

  const generateChildUserInvite = async (child: RelChildSummary) => {
    setChildUserInviteTarget(child)
    setChildUserInviteLoading(true)
    setChildUserInviteUrl(null)
    setChildUserInviteOpen(true)
    try {
      const res = await api.post<{ invite_url: string }>('/invites-generate', {
        tenant_id: child.child_tenant_id,
      })
      setChildUserInviteUrl(res.invite_url)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar convite')
      setChildUserInviteOpen(false)
    } finally {
      setChildUserInviteLoading(false)
    }
  }

  const load = () => {
    if (!selectedTenant) return
    setLoading(true)
    api.get<{ children: RelChildSummary[] }>(`/tenants-list-children?tenant_id=${selectedTenant.tenant_id}`)
      .then(r => setClients(r.children ?? []))
      .catch(() => toast.error('Erro ao carregar clientes'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!canAccess) { router.push('/dashboard'); return }
    load()
  }, [selectedTenant])

  const loadAuthPhones = async (child: RelChildSummary) => {
    if (!selectedTenant) return
    setPhonesLoading(true)
    try {
      const res = await api.get<{ phones: AuthPhone[] }>(
        `/authphones-list?parent_tenant_id=${selectedTenant.tenant_id}&child_tenant_id=${child.child_tenant_id}`
      )
      setAuthPhones((res.phones || []).filter(p => p.whatsapp_phone_number))
    } catch { toast.error('Erro ao carregar contatos') }
    finally { setPhonesLoading(false) }
  }

  const loadInstances = async () => {
    if (!selectedTenant) return
    setInstancesLoading(true)
    try {
      const res = await api.get<{ instances: Instance[] }>(`/instances-list?tenant_id=${selectedTenant.tenant_id}`)
      setInstances((res.instances || []).filter(i => i.instance_channel === 'whatsapp'))
    } catch { toast.error('Erro ao carregar instâncias') }
    finally { setInstancesLoading(false) }
  }

  const toggleInstanceId = (id: number) => {
    setSelectedInstanceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const addPhone = async () => {
    if (!active || !selectedTenant || !newPhone.trim() || !newPhoneCompany.trim() || !newPhoneExtId.trim()) return
    if (selectedInstanceIds.length === 0) {
      toast.error('Selecione ao menos uma instância')
      return
    }
    setAddingPhone(true)
    try {
      await Promise.all(selectedInstanceIds.map(instanceId =>
        api.post('/authphones-create', {
          parent_tenant_id: selectedTenant.tenant_id,
          child_tenant_id: active.child_tenant_id,
          phone_number: newPhone.trim(),
          external_company_name: newPhoneCompany.trim(),
          external_id: newPhoneExtId.trim(),
          instance_id: instanceId,
        })
      ))
      toast.success('Contato adicionado')
      setNewPhone(''); setNewPhoneCompany(''); setNewPhoneExtId(''); setSelectedInstanceIds([])
      loadAuthPhones(active)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar contato')
    } finally { setAddingPhone(false) }
  }

  const deletePhone = async (phoneId: number) => {
    if (!selectedTenant) return
    try {
      await api.post('/authphones-delete', { parent_tenant_id: selectedTenant.tenant_id, phone_id: phoneId })
      toast.success('Número removido')
      if (active) loadAuthPhones(active)
    } catch { toast.error('Erro ao remover contato') }
  }

  const loadClientDbs = async (child: RelChildSummary) => {
    setClientDbsLoading(true)
    try {
      const res = await api.get<{ local_dbs: LocalDb[] }>(`/localdb-list?tenant_id=${child.child_tenant_id}`)
      setClientDbs(res.local_dbs || [])
    } catch { toast.error('Erro ao carregar bancos de dados') }
    finally { setClientDbsLoading(false) }
  }

  const saveClientDb = async () => {
    if (!active) return
    if (!clientDbForm.ldb_name || !clientDbForm.ldb_type) {
      toast.error('Nome e tipo são obrigatórios')
      return
    }
    setSavingClientDb(true)
    try {
      const payload = {
        ...clientDbForm,
        tenant_id: active.child_tenant_id,
        ldb_port: clientDbForm.ldb_port ? Number(clientDbForm.ldb_port) : null,
        ...(editingClientDb ? { ldb_id: editingClientDb.ldb_id } : {}),
      }
      if (editingClientDb) {
        await api.post('/localdb-update', payload)
        toast.success('Banco atualizado!')
      } else {
        await api.post('/localdb-create', payload)
        toast.success('Banco criado!')
      }
      setClientDbDialog(false)
      loadClientDbs(active)
    } catch { toast.error('Erro ao salvar banco') }
    finally { setSavingClientDb(false) }
  }

  const deleteClientDb = async (ldbId: string) => {
    if (!active) return
    setDeletingClientDb(ldbId)
    try {
      await api.post('/localdb-delete', { ldb_id: ldbId, tenant_id: active.child_tenant_id })
      toast.success('Banco removido')
      setClientDbs(prev => prev.filter(d => d.ldb_id !== ldbId))
    } catch { toast.error('Erro ao remover banco') }
    finally { setDeletingClientDb(null) }
  }

  const createClient = async () => {
    if (!selectedTenant || !createName.trim() || !createSlug.trim()) return
    setCreateSlugError('')
    if (!isValidSlug(createSlug)) {
      setCreateSlugError('Slug deve conter apenas letras minúsculas, números e hífens')
      return
    }
    setCreateLoading(true)
    try {
      const newTenant = await api.post<{ tenant_id: number }>('/tenants-create', {
        name: createName.trim(),
        description: createDesc.trim() || undefined,
        slug: createSlug.trim(),
      })
      await api.post('/tenants-relationships-create', {
        parent_tenant_id: selectedTenant.tenant_id,
        child_tenant_id: newTenant.tenant_id,
      })
      toast.success('Cliente cadastrado!')
      load()
      closeDialog()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar cliente')
    } finally {
      setCreateLoading(false)
    }
  }

  const openDialog = (child: RelChildSummary, mode: DialogMode) => {
    setActive(child)
    setDialogMode(mode)
    if (mode === 'whatsapp') {
      setAuthPhones([])
      setInstances([])
      setNewPhone(''); setNewPhoneCompany(''); setNewPhoneExtId(''); setSelectedInstanceIds([])
      loadAuthPhones(child)
      loadInstances()
    }
    if (mode === 'edit') {
      setEditName(child.rel_name ?? child.child_tenant_name)
      setEditDesc(child.rel_description ?? '')
      setEditExtId(child.rel_external_id ?? '')
    }
    if (mode === 'fees') {
      setFeeMultiplier(child.rel_ai_cost_multiplier?.toString() ?? '')
      setFeeFixed(child.rel_ai_fixed_fee?.toString() ?? '')
      setFeeSub(child.rel_subscription_fee?.toString() ?? '')
    }
    if (mode === 'subscription') {
      const now = new Date()
      setSubMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
      setSubAmount(child.rel_subscription_fee?.toString() ?? '')
    }
    if (mode === 'localdb') {
      setClientDbs([])
      setClientDbDialog(false)
      setEditingClientDb(null)
      setClientDbForm(EMPTY_DB_FORM)
      loadClientDbs(child)
    }
    setCreditAmount('')
    setCreditDesc('')
  }

  const closeDialog = () => { setDialogMode(null); setActive(null) }

  const toggleBlock = async (child: RelChildSummary) => {
    try {
      await api.post('/tenants-update-child', {
        rel_id: child.rel_id,
        is_blocked: !child.rel_is_blocked,
      })
      toast.success(child.rel_is_blocked ? 'Cliente desbloqueado' : 'Cliente bloqueado')
      load()
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  const saveEdit = async () => {
    if (!active) return
    setSaving(true)
    try {
      await api.post('/tenants-update-child', {
        rel_id: active.rel_id,
        name: editName,
        description: editDesc,
        external_id: editExtId,
      })
      toast.success('Dados atualizados')
      load(); closeDialog()
    } catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  const saveCredits = async () => {
    if (!active) return
    setSaving(true)
    try {
      await api.post('/tenants-child-credits', {
        rel_id: active.rel_id,
        amount: parseFloat(creditAmount),
        description: creditDesc,
      })
      toast.success('Créditos adicionados')
      load(); closeDialog()
    } catch { toast.error('Erro ao adicionar créditos') }
    finally { setSaving(false) }
  }

  const saveFees = async () => {
    if (!active) return
    setSaving(true)
    try {
      await api.post('/tenants-update-child', {
        rel_id: active.rel_id,
        ai_cost_multiplier: feeMultiplier ? parseFloat(feeMultiplier) : null,
        ai_fixed_fee: feeFixed ? parseFloat(feeFixed) : null,
        subscription_fee: feeSub ? parseFloat(feeSub) : null,
      })
      toast.success('Taxas atualizadas')
      load(); closeDialog()
    } catch { toast.error('Erro ao salvar taxas') }
    finally { setSaving(false) }
  }

  const unlinkChild = async () => {
    if (!active || !selectedTenant) return
    setSaving(true)
    try {
      await api.post('/tenants-relationships-delete', {
        rel_id: active.rel_id,
        parent_tenant_id: selectedTenant.tenant_id,
      })
      toast.success('Vínculo removido')
      load(); closeDialog()
    } catch { toast.error('Erro ao desvincular') }
    finally { setSaving(false) }
  }

  const saveSubscription = async () => {
    if (!active) return
    setSaving(true)
    try {
      await api.post('/tenants-child-subscriptions', {
        rel_id: active.rel_id,
        reference_month: subMonth,
        amount: parseFloat(subAmount),
      })
      toast.success('Mensalidade registrada')
      load(); closeDialog()
    } catch { toast.error('Erro ao registrar mensalidade') }
    finally { setSaving(false) }
  }

  if (!canAccess) return null

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Sub-tenants vinculados a esta conta.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setCreateName(''); setCreateDesc(''); setCreateSlug(''); setCreateSlugError(''); setDialogMode('create') }} size="sm" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar cliente
          </Button>
          <Button onClick={generateClientInvite} disabled={clientInviteLoading} size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            {clientInviteLoading ? 'Gerando...' : 'Convidar por link'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum cliente vinculado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <Input
            placeholder="Pesquisar por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          {clients.filter(c =>
            !search ||
            (c.child_tenant_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (c.rel_name ?? '').toLowerCase().includes(search.toLowerCase())
          ).map(child => (
            <Card key={child.rel_id} className={child.rel_is_blocked ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {child.rel_name ?? child.child_tenant_name}
                        {child.rel_is_blocked && <span className="ml-2 text-xs text-destructive font-normal">(bloqueado)</span>}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={child.credits_status === 'positive' ? 'secondary' : 'destructive'} className="text-xs">
                          R$ {child.rel_credits.toFixed(2)}
                        </Badge>
                        {child.subscription_status !== 'none' && (
                          <Badge variant={child.subscription_status === 'paid' ? 'outline' : 'destructive'} className="text-xs">
                            {child.subscription_status === 'paid' ? 'mensalidade em dia' : 'mensalidade atrasada'}
                          </Badge>
                        )}
                        {child.rel_external_id && (
                          <span className="text-xs text-muted-foreground font-mono">{child.rel_external_id}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => openDialog(child, 'edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Créditos" onClick={() => openDialog(child, 'credits')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Taxas" onClick={() => openDialog(child, 'fees')}>
                      <CreditCard className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Mensalidade" onClick={() => openDialog(child, 'subscription')}>
                      <Receipt className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title={child.rel_is_blocked ? 'Desbloquear' : 'Bloquear'} onClick={() => toggleBlock(child)}>
                      {child.rel_is_blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" title="Contatos" onClick={() => openDialog(child, 'whatsapp')}>
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Convidar usuário" onClick={() => generateChildUserInvite(child)}>
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Bancos de dados locais" onClick={() => openDialog(child, 'localdb')}>
                      <Database className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Desvincular" onClick={() => openDialog(child, 'unlink')}>
                      <Unlink2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: Edit name/desc/ext_id */}
      <Dialog open={dialogMode === 'edit'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar cliente</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>External ID</Label>
              <Input value={editExtId} onChange={e => setEditExtId(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add credits */}
      <Dialog open={dialogMode === 'credits'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar créditos — {active?.rel_name ?? active?.child_tenant_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" min="0.01" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={creditDesc} onChange={e => setCreditDesc(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={saveCredits} disabled={saving || !creditAmount}>{saving ? 'Salvando...' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Fees */}
      <Dialog open={dialogMode === 'fees'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Taxas — {active?.rel_name ?? active?.child_tenant_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">Deixe em branco para usar os valores padrão do sistema.</p>
            <div className="space-y-1.5">
              <Label>Multiplicador de custo IA</Label>
              <Input type="number" step="0.01" min="0" value={feeMultiplier} onChange={e => setFeeMultiplier(e.target.value)} placeholder="ex: 7.0" />
            </div>
            <div className="space-y-1.5">
              <Label>Taxa fixa de IA (R$)</Label>
              <Input type="number" step="0.001" min="0" value={feeFixed} onChange={e => setFeeFixed(e.target.value)} placeholder="ex: 0.05" />
            </div>
            <div className="space-y-1.5">
              <Label>Mensalidade padrão (R$)</Label>
              <Input type="number" step="0.01" min="0" value={feeSub} onChange={e => setFeeSub(e.target.value)} placeholder="ex: 200.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={saveFees} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Unlink client */}
      <Dialog open={dialogMode === 'unlink'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Desvincular cliente</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja desvincular <strong>{active?.rel_name ?? active?.child_tenant_name}</strong>?
              O tenant passará a ser independente e não aparecerá mais nesta lista.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button variant="destructive" onClick={unlinkChild} disabled={saving}>
              {saving ? 'Removendo...' : 'Desvincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Contatos */}
      <Dialog open={dialogMode === 'whatsapp'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contatos — {active?.rel_name ?? active?.child_tenant_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Contatos WhatsApp autorizados a interagir com este cliente.</p>

            {phonesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : authPhones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum contato cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {authPhones.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium">{p.whatsapp_phone_number}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                        {p.external_company_name && <span>{p.external_company_name}</span>}
                        {p.external_id && <span className="font-mono">{p.external_id}</span>}
                        {p.instance_name && <span>@ {p.instance_name}</span>}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 size={13} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover contato</AlertDialogTitle>
                          <AlertDialogDescription>Remover o contato <strong>{p.whatsapp_phone_number}</strong>?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePhone(p.id)} className="bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-3 space-y-3">
              <p className="text-sm font-medium">Adicionar contato</p>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">WhatsApp *</Label>
                  <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="5511999999999" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Empresa *</Label>
                    <Input value={newPhoneCompany} onChange={e => setNewPhoneCompany(e.target.value)} placeholder="Nome da empresa" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">External ID *</Label>
                    <Input value={newPhoneExtId} onChange={e => setNewPhoneExtId(e.target.value)} placeholder="Ex: 160" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Instâncias *</Label>
                  {instancesLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Carregando instâncias...
                    </div>
                  ) : instances.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">Nenhuma instância WhatsApp encontrada.</p>
                  ) : (
                    <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
                      {instances.map(inst => (
                        <label key={inst.instance_id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={selectedInstanceIds.includes(inst.instance_id)}
                            onChange={() => toggleInstanceId(inst.instance_id)}
                          />
                          <span className="text-sm">{inst.instance_name}</span>
                          {inst.instance_phone_number && (
                            <span className="text-xs text-muted-foreground ml-auto font-mono">{inst.instance_phone_number}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={addPhone}
                  disabled={addingPhone || !newPhone.trim() || !newPhoneCompany.trim() || !newPhoneExtId.trim() || selectedInstanceIds.length === 0}
                >
                  {addingPhone ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Adicionando...</> : <><Plus className="h-3 w-3 mr-1" />Adicionar</>}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Per-client user invite link */}
      <Dialog open={childUserInviteOpen} onOpenChange={setChildUserInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar usuário — {childUserInviteTarget?.rel_name ?? childUserInviteTarget?.child_tenant_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Compartilhe este link com alguém para que ela crie uma conta e seja vinculada como usuária deste cliente.
            </p>
            {childUserInviteLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando link...
              </div>
            ) : childUserInviteUrl ? (
              <div className="flex gap-2">
                <Input value={childUserInviteUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(childUserInviteUrl)
                  toast.success('Copiado!')
                }}>Copiar</Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Client invite link (global) */}
      <Dialog open={clientInviteOpen} onOpenChange={setClientInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link de convite de cliente</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Compartilhe este link. Quem criar uma conta através dele será vinculado automaticamente como cliente desta empresa.
            </p>
            <div className="flex gap-2">
              <Input value={clientInviteUrl || ''} readOnly className="font-mono text-xs" />
              <Button variant="outline" onClick={() => {
                navigator.clipboard.writeText(clientInviteUrl || '')
                toast.success('Copiado!')
              }}>Copiar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Subscription */}
      <Dialog open={dialogMode === 'subscription'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar mensalidade — {active?.rel_name ?? active?.child_tenant_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Mês de referência</Label>
              <Input type="month" value={subMonth} onChange={e => setSubMonth(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" value={subAmount} onChange={e => setSubAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={saveSubscription} disabled={saving || !subMonth || !subAmount}>{saving ? 'Salvando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create new client */}
      <Dialog open={dialogMode === 'create'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cadastrar cliente</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Estas informações são a sua perspectiva sobre este cliente. O usuário do cliente poderá alterar o nome, descrição e slug depois ao acessar a própria conta.
            </p>
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Ex: Restaurante Central" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>
                Slug * <span className="text-xs text-muted-foreground">(letras minúsculas, números e hífens)</span>
              </Label>
              <Input
                value={createSlug}
                onChange={e => { setCreateSlug(sanitizeSlug(e.target.value)); setCreateSlugError('') }}
                placeholder="restaurante-central"
              />
              {createSlugError && <p className="text-xs text-destructive">{createSlugError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={createClient} disabled={createLoading || !createName.trim() || !createSlug.trim()}>
              {createLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cadastrando...</> : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: LocalDB management per client */}
      <Dialog open={dialogMode === 'localdb'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bancos de dados — {active?.rel_name ?? active?.child_tenant_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Conexões de banco registradas para o UnaragConsole deste cliente.</p>
              <Button size="sm" onClick={() => { setEditingClientDb(null); setClientDbForm(EMPTY_DB_FORM); setClientDbDialog(true) }}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {clientDbsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : clientDbs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Database className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Nenhum banco configurado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clientDbs.map(db => (
                  <div
                    key={db.ldb_id}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/40 cursor-pointer"
                    onClick={() => { setEditingClientDb(db); setClientDbForm({ ldb_name: db.ldb_name, ldb_type: db.ldb_type, ldb_host: db.ldb_host || '', ldb_port: db.ldb_port?.toString() || '', ldb_user: db.ldb_user || '', ldb_pass: '', ldb_database: db.ldb_database || '' }); setClientDbDialog(true) }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{db.ldb_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {db.ldb_type}{db.ldb_host ? ` · ${db.ldb_host}` : ''}{db.ldb_database ? `/${db.ldb_database}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={db.ldb_is_active ? 'default' : 'secondary'} className="text-xs">
                        {db.ldb_is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        disabled={deletingClientDb === db.ldb_id}
                        onClick={e => { e.stopPropagation(); deleteClientDb(db.ldb_id) }}
                      >
                        {deletingClientDb === db.ldb_id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Inner dialog: Create / Edit LocalDB for client */}
      <Dialog open={clientDbDialog} onOpenChange={setClientDbDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClientDb ? 'Editar Banco' : 'Novo Banco de Dados'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                value={clientDbForm.ldb_name}
                onChange={e => setClientDbForm(f => ({ ...f, ldb_name: e.target.value }))}
                placeholder="Ex: ERP Principal"
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={clientDbForm.ldb_type} onValueChange={v => setClientDbForm(f => ({ ...f, ldb_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DB_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label>Host</Label>
                <Input
                  value={clientDbForm.ldb_host}
                  onChange={e => setClientDbForm(f => ({ ...f, ldb_host: e.target.value }))}
                  placeholder="localhost"
                />
              </div>
              <div className="space-y-1">
                <Label>Porta</Label>
                <Input
                  type="number"
                  value={clientDbForm.ldb_port}
                  onChange={e => setClientDbForm(f => ({ ...f, ldb_port: e.target.value }))}
                  placeholder="5432"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Usuário</Label>
              <Input
                value={clientDbForm.ldb_user}
                onChange={e => setClientDbForm(f => ({ ...f, ldb_user: e.target.value }))}
                placeholder="postgres"
              />
            </div>
            <div className="space-y-1">
              <Label>{editingClientDb ? 'Senha (deixe vazio para não alterar)' : 'Senha'}</Label>
              <Input
                type="password"
                value={clientDbForm.ldb_pass}
                onChange={e => setClientDbForm(f => ({ ...f, ldb_pass: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1">
              <Label>Nome do banco</Label>
              <Input
                value={clientDbForm.ldb_database}
                onChange={e => setClientDbForm(f => ({ ...f, ldb_database: e.target.value }))}
                placeholder="mydb"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDbDialog(false)}>Cancelar</Button>
            <Button onClick={saveClientDb} disabled={savingClientDb}>
              {savingClientDb ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
