'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { RelChildSummary } from '@/lib/types'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Building2, Lock, Unlock, Plus, Pencil, CreditCard, Receipt, UserPlus } from 'lucide-react'

type DialogMode = 'edit' | 'credits' | 'fees' | 'subscription' | null

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

  // Client invite link
  const [clientInviteUrl, setClientInviteUrl] = useState<string | null>(null)
  const [clientInviteOpen, setClientInviteOpen] = useState(false)
  const [clientInviteLoading, setClientInviteLoading] = useState(false)

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

  const openDialog = (child: RelChildSummary, mode: DialogMode) => {
    setActive(child)
    setDialogMode(mode)
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
        <Button onClick={generateClientInvite} disabled={clientInviteLoading} size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          {clientInviteLoading ? 'Gerando...' : 'Convidar por link'}
        </Button>
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
          {clients.map(child => (
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

      {/* Dialog: Client invite link */}
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
    </div>
  )
}
