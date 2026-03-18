'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Tenant, SubscriptionEntry } from '@/lib/types'
import { isValidSlug, sanitizeSlug } from '@/lib/validators'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Archive, Link2, Lock, Unlock, DollarSign, Settings2, RotateCcw, CreditCard, GitBranch } from 'lucide-react'

interface TenantForm {
  name: string
  description: string
  slug: string
  logo_url: string
}

export default function TenantsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filter, setFilter] = useState<'all' | 'blocked' | 'negative_credits' | 'overdue_subscription'>('all')
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [editTarget, setEditTarget] = useState<Tenant | null>(null)
  const [form, setForm] = useState<TenantForm>({ name: '', description: '', slug: '', logo_url: '' })
  const [slugError, setSlugError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  // Credits dialog
  const [creditsTarget, setCreditsTarget] = useState<Tenant | null>(null)
  const [creditsAmount, setCreditsAmount] = useState('')
  const [creditsDesc, setCreditsDesc] = useState('')
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [creditsLoading, setCreditsLoading] = useState(false)

  // Rates dialog
  const [ratesTarget, setRatesTarget] = useState<Tenant | null>(null)
  const [ratesMult, setRatesMult] = useState('')
  const [ratesFixed, setRatesFixed] = useState('')
  const [ratesSub, setRatesSub] = useState('')
  const [ratesOpen, setRatesOpen] = useState(false)
  const [ratesLoading, setRatesLoading] = useState(false)

  // Link (relationship) dialog
  const [linkTarget, setLinkTarget] = useState<Tenant | null>(null)
  const [linkParentId, setLinkParentId] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)

  // Subscriptions dialog
  const [subTarget, setSubTarget] = useState<Tenant | null>(null)
  const [subList, setSubList] = useState<SubscriptionEntry[]>([])
  const [subMonth, setSubMonth] = useState('')
  const [subAmount, setSubAmount] = useState('')
  const [subOpen, setSubOpen] = useState(false)
  const [subLoading, setSubLoading] = useState(false)

  useEffect(() => {
    if (!user?.user_is_master_admin) { router.push('/dashboard'); return }
    load('all')
    load('archived')
  }, [user])

  const [activeList, setActiveList] = useState<Tenant[]>([])
  const [archivedList, setArchivedList] = useState<Tenant[]>([])

  const load = (f: string) => {
    setLoading(true)
    api.get<{ tenants: Tenant[] }>(`/tenants-list?filter=${f}`)
      .then(r => {
        if (f === 'archived') setArchivedList(r.tenants)
        else setActiveList(r.tenants)
      })
      .catch(() => toast.error('Erro ao carregar tenants'))
      .finally(() => setLoading(false))
  }

  const reload = () => { load('all'); load('archived') }

  // Filter active list
  const filteredActive = activeList.filter(t => {
    if (filter === 'blocked') return t.tenant_is_blocked
    if (filter === 'negative_credits') return Number(t.tenant_credits ?? 0) < 0
    if (filter === 'overdue_subscription') return !!t.tenant_subscription_fee && !t.tenant_sub_paid_current_month
    return true
  })

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', description: '', slug: '', logo_url: '' })
    setSlugError('')
    setDialogOpen(true)
  }

  const openEdit = (t: Tenant) => {
    setEditTarget(t)
    const logo = t.tenant_logo_url
    setForm({ name: t.tenant_name, description: t.tenant_description || '', slug: t.tenant_slug, logo_url: (logo && logo !== 'null') ? logo : '' })
    setSlugError('')
    setDialogOpen(true)
  }

  const save = async () => {
    setSlugError('')
    if (!isValidSlug(form.slug)) {
      setSlugError('Slug deve conter apenas letras minúsculas, números e hífens')
      return
    }
    try {
      if (editTarget) {
        await api.post('/tenants-update', { tenant_id: editTarget.tenant_id, ...form, logo_url: form.logo_url || null })
        toast.success('Tenant atualizado')
      } else {
        await api.post('/tenants-create', { ...form, logo_url: form.logo_url || null })
        toast.success('Tenant criado')
      }
      setDialogOpen(false)
      reload()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  const archive = async (t: Tenant) => {
    if (!confirm(`Arquivar "${t.tenant_name}"?`)) return
    try {
      await api.post('/tenants-archive', { tenant_id: t.tenant_id })
      toast.success('Tenant arquivado')
      reload()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao arquivar')
    }
  }

  const unarchive = async (t: Tenant) => {
    try {
      await api.post('/tenants-unarchive', { tenant_id: t.tenant_id })
      toast.success('Tenant desarquivado')
      reload()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desarquivar')
    }
  }

  const toggleBlock = async (t: Tenant) => {
    const block = !t.tenant_is_blocked
    try {
      await api.post('/tenants-block', { tenant_id: t.tenant_id, block })
      toast.success(block ? 'Tenant bloqueado' : 'Tenant desbloqueado')
      reload()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar bloqueio')
    }
  }

  const generateInvite = async (t: Tenant) => {
    try {
      const res = await api.post<{ invite_url: string }>('/invites-generate', { tenant_id: t.tenant_id })
      setInviteUrl(res.invite_url)
      setInviteOpen(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar convite')
    }
  }

  const openCredits = (t: Tenant) => {
    setCreditsTarget(t)
    setCreditsAmount('')
    setCreditsDesc('')
    setCreditsOpen(true)
  }

  const saveCredits = async () => {
    if (!creditsTarget) return
    setCreditsLoading(true)
    try {
      await api.post('/credits-manual', {
        tenant_id: creditsTarget.tenant_id,
        amount: parseFloat(creditsAmount),
        description: creditsDesc || 'Inserido manualmente',
      })
      toast.success('Créditos adicionados')
      setCreditsOpen(false)
      reload()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao inserir créditos')
    } finally {
      setCreditsLoading(false)
    }
  }

  const openRates = (t: Tenant) => {
    setRatesTarget(t)
    setRatesMult(t.tenant_ai_cost_multiplier !== null ? String(t.tenant_ai_cost_multiplier) : '')
    setRatesFixed(t.tenant_ai_fixed_fee !== null ? String(t.tenant_ai_fixed_fee) : '')
    setRatesSub(t.tenant_subscription_fee !== null ? String(t.tenant_subscription_fee) : '')
    setRatesOpen(true)
  }

  const saveRates = async () => {
    if (!ratesTarget) return
    setRatesLoading(true)
    try {
      await api.post('/tenants-rates', {
        tenant_id: ratesTarget.tenant_id,
        ai_cost_multiplier: ratesMult !== '' ? parseFloat(ratesMult) : null,
        ai_fixed_fee: ratesFixed !== '' ? parseFloat(ratesFixed) : null,
        subscription_fee: ratesSub !== '' ? parseFloat(ratesSub) : null,
      })
      toast.success('Taxas atualizadas')
      setRatesOpen(false)
      reload()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar taxas')
    } finally {
      setRatesLoading(false)
    }
  }

  const openLink = (t: Tenant) => {
    setLinkTarget(t)
    setLinkParentId('')
    setLinkOpen(true)
  }

  const saveLink = async () => {
    if (!linkTarget || !linkParentId) return
    setLinkLoading(true)
    try {
      await api.post('/tenants-relationships-create', {
        parent_tenant_id: parseInt(linkParentId),
        child_tenant_id: linkTarget.tenant_id,
      })
      toast.success('Relação criada')
      setLinkOpen(false)
      reload()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar relação')
    } finally {
      setLinkLoading(false)
    }
  }

  const openSubs = async (t: Tenant) => {
    setSubTarget(t)
    setSubMonth(new Date().toISOString().slice(0, 7))
    setSubAmount(t.tenant_subscription_fee !== null ? String(t.tenant_subscription_fee) : '')
    setSubOpen(true)
    try {
      const res = await api.get<{ subscriptions: SubscriptionEntry[] }>(`/subscriptions-list?tenant_id=${t.tenant_id}`)
      setSubList(res.subscriptions)
    } catch {
      setSubList([])
    }
  }

  const paySubscription = async () => {
    if (!subTarget) return
    setSubLoading(true)
    try {
      await api.post('/subscriptions-pay', {
        tenant_id: subTarget.tenant_id,
        reference_month: subMonth,
        amount: parseFloat(subAmount),
      })
      toast.success('Mensalidade registrada')
      const res = await api.get<{ subscriptions: SubscriptionEntry[] }>(`/subscriptions-list?tenant_id=${subTarget.tenant_id}`)
      setSubList(res.subscriptions)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar mensalidade')
    } finally {
      setSubLoading(false)
    }
  }

  if (!user?.user_is_master_admin) return null

  const TenantCard = ({ t, archived = false }: { t: Tenant; archived?: boolean }) => {
    // Children: tenants in the active list whose tenant_parents include this tenant as parent
    const children = activeList.filter(c =>
      c.tenant_id !== t.tenant_id &&
      (c.tenant_parents ?? []).some(p => p.rel_parent_tenant_id === t.tenant_id)
    )
    return (
    <Card key={t.tenant_id} className={t.tenant_is_blocked ? 'border-destructive/50' : ''}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex flex-wrap items-center gap-1.5">
              {t.tenant_name}
              {t.tenant_is_master && <Badge variant="secondary" className="text-xs">Master</Badge>}
              {t.tenant_is_blocked && <Badge variant="destructive" className="text-xs">Bloqueado</Badge>}
              {Number(t.tenant_credits ?? 0) < 0 && <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Crédito negativo</Badge>}
              {t.tenant_subscription_fee !== null && !t.tenant_sub_paid_current_month && <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">Mensalidade atrasada</Badge>}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{t.tenant_slug}</p>
            <p className="text-xs text-muted-foreground">Saldo: <span className={Number(t.tenant_credits ?? 0) < 0 ? 'text-destructive font-medium' : ''}>R$ {Number(t.tenant_credits ?? 0).toFixed(2)}</span></p>
            {/* Parent info */}
            {(t.tenant_parents ?? []).length > 0 && (
              <p className="text-xs text-blue-600 mt-0.5">
                Filho de: {(t.tenant_parents ?? []).map(p => p.rel_parent_tenant_name).join(', ')}
              </p>
            )}
            {/* Children info */}
            {children.length > 0 && (
              <p className="text-xs text-purple-600 mt-0.5">
                Filhos: {children.map(c => c.tenant_name).join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!archived ? (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => generateInvite(t)} title="Gerar convite"><Link2 size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)} title="Editar"><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCredits(t)} title="Inserir créditos"><DollarSign size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openRates(t)} title="Definir taxas"><Settings2 size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSubs(t)} title="Mensalidades"><CreditCard size={13} /></Button>
                {!t.tenant_is_master && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => openLink(t)} title="Vincular como filho de..."><GitBranch size={13} /></Button>
                )}
                <Button variant="ghost" size="icon" className={`h-7 w-7 ${t.tenant_is_blocked ? 'text-green-600' : 'text-orange-500'}`} onClick={() => toggleBlock(t)} title={t.tenant_is_blocked ? 'Desbloquear' : 'Bloquear'}>
                  {t.tenant_is_blocked ? <Unlock size={13} /> : <Lock size={13} />}
                </Button>
                {!t.tenant_is_master && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => archive(t)} title="Arquivar"><Archive size={13} /></Button>
                )}
              </>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => unarchive(t)} title="Desarquivar"><RotateCcw size={13} /></Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Button onClick={openCreate} size="sm"><Plus className="mr-2 h-4 w-4" />Novo tenant</Button>
      </div>

      <Tabs defaultValue="ativos">
        <TabsList>
          <TabsTrigger value="ativos">Ativos</TabsTrigger>
          <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 'blocked', 'negative_credits', 'overdue_subscription'] as const).map(f => (
              <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
                {f === 'all' ? 'Todos' : f === 'blocked' ? 'Bloqueados' : f === 'negative_credits' ? 'Crédito negativo' : 'Mensalidade atrasada'}
              </Button>
            ))}
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <div className="grid gap-2">
              {filteredActive.length === 0 && <p className="text-sm text-muted-foreground">Nenhum tenant encontrado.</p>}
              {filteredActive.map(t => <TenantCard key={t.tenant_id} t={t} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="arquivados" className="mt-3">
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <div className="grid gap-2">
              {archivedList.length === 0 && <p className="text-sm text-muted-foreground">Nenhum tenant arquivado.</p>}
              {archivedList.map(t => <TenantCard key={t.tenant_id} t={t} archived />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? 'Editar tenant' : 'Novo tenant'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Slug <span className="text-xs text-muted-foreground">(letras minúsculas, números e hífens)</span></Label>
              <Input value={form.slug} onChange={e => { setForm(f => ({ ...f, slug: sanitizeSlug(e.target.value) })); setSlugError('') }} />
              {slugError && <p className="text-xs text-destructive">{slugError}</p>}
            </div>
            <div className="space-y-1">
              <Label>Logo URL <span className="text-xs text-muted-foreground">(200×44px)</span></Label>
              <Input type="url" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
            </div>
            <Button className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Link de convite</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Copie e envie este link:</p>
            <div className="flex gap-2">
              <Input value={inviteUrl || ''} readOnly className="font-mono text-xs" />
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(inviteUrl || ''); toast.success('Copiado!') }}>Copiar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credits dialog */}
      <Dialog open={creditsOpen} onOpenChange={setCreditsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Inserir créditos — {creditsTarget?.tenant_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input type="number" min="0.01" step="0.01" value={creditsAmount} onChange={e => setCreditsAmount(e.target.value)} placeholder="50.00" />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={creditsDesc} onChange={e => setCreditsDesc(e.target.value)} placeholder="Inserido manualmente" />
            </div>
            <Button className="w-full" onClick={saveCredits} disabled={creditsLoading || !creditsAmount}>
              {creditsLoading ? 'Salvando...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rates dialog */}
      <Dialog open={ratesOpen} onOpenChange={setRatesOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Taxas de IA — {ratesTarget?.tenant_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Deixe em branco para usar as configurações globais.</p>
            <div className="space-y-1">
              <Label>Multiplicador de custo IA</Label>
              <Input type="number" min="0" step="0.01" value={ratesMult} onChange={e => setRatesMult(e.target.value)} placeholder="ex: 7.0 (global)" />
            </div>
            <div className="space-y-1">
              <Label>Taxa fixa IA (R$)</Label>
              <Input type="number" min="0" step="0.001" value={ratesFixed} onChange={e => setRatesFixed(e.target.value)} placeholder="ex: 0.05 (global)" />
            </div>
            <div className="space-y-1">
              <Label>Mensalidade (R$)</Label>
              <Input type="number" min="0" step="0.01" value={ratesSub} onChange={e => setRatesSub(e.target.value)} placeholder="ex: 200.00 (global)" />
            </div>
            <Button className="w-full" onClick={saveRates} disabled={ratesLoading}>
              {ratesLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link (relationship) dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Vincular como filho — {linkTarget?.tenant_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecione o tenant <strong>pai</strong> que irá controlar <strong>{linkTarget?.tenant_name}</strong>.
            </p>
            <div className="space-y-1">
              <Label>Tenant pai</Label>
              <Select value={linkParentId} onValueChange={setLinkParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {activeList
                    .filter(t => t.tenant_id !== linkTarget?.tenant_id)
                    .map(t => (
                      <SelectItem key={t.tenant_id} value={String(t.tenant_id)}>
                        {t.tenant_name} ({t.tenant_slug})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveLink} disabled={linkLoading || !linkParentId}>
              {linkLoading ? 'Criando...' : 'Criar relação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscriptions dialog */}
      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Mensalidades — {subTarget?.tenant_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Mês de referência</Label>
                <Input type="month" value={subMonth} onChange={e => setSubMonth(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Valor (R$)</Label>
                <Input type="number" min="0.01" step="0.01" value={subAmount} onChange={e => setSubAmount(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={paySubscription} disabled={subLoading || !subMonth || !subAmount}>
              {subLoading ? 'Registrando...' : 'Registrar pago (manual)'}
            </Button>
            {subList.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground">Histórico</p>
                {subList.map(s => (
                  <div key={s.sub_id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                    <span className="font-mono">{s.reference_month}</span>
                    <span>R$ {s.amount.toFixed(2)}</span>
                    <Badge variant={s.status === 'paid' ? 'secondary' : 'outline'} className="text-xs">
                      {s.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                    <span className="text-muted-foreground">{s.origin === 'manual' ? 'Manual' : 'Online'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
