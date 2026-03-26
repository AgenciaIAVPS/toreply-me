'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { Instance, Agent } from '@/lib/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Loader2, QrCode, Wifi, WifiOff, Smartphone, RefreshCw } from 'lucide-react'

type InstanceForm = {
  instance_name: string
  instance_phone_number: string
  instance_agent_selection_mode: 'fixed' | 'dynamic'
  instance_current_agent_id: string
  instance_conversation_timeout_minutes: string
  instance_only_auth: boolean
  instance_no_auth_message: string
}

const defaultForm: InstanceForm = {
  instance_name: '',
  instance_phone_number: '',
  instance_agent_selection_mode: 'fixed',
  instance_current_agent_id: '',
  instance_conversation_timeout_minutes: '120',
  instance_only_auth: false,
  instance_no_auth_message: '',
}

function StatusBadge({ instance }: { instance: Instance }) {
  if (instance.evolution_connected) {
    return <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200">Conectado</Badge>
  }
  if (instance.instance_status === 'blocked') {
    return <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
  }
  if (instance.instance_status === 'active') {
    return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">Ativo (desconectado)</Badge>
  }
  return <Badge variant="secondary" className="text-xs">Inativo</Badge>
}

export default function InstancesPage() {
  const { user } = useAuth()
  const { selectedTenant } = useTenant()

  const isAdmin = selectedTenant?.tenant_user_role === 'admin'
  const isMasterAdmin = !!user?.user_is_master_admin
  const canManage = isAdmin || isMasterAdmin

  const [instances, setInstances] = useState<Instance[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  // Form dialog
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Instance | null>(null)
  const [form, setForm] = useState<InstanceForm>(defaultForm)
  const [saving, setSaving] = useState(false)

  // QR Code dialog
  const [qrOpen, setQrOpen] = useState(false)
  const [qrInstance, setQrInstance] = useState<Instance | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrConnected, setQrConnected] = useState(false)
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadInstances = useCallback(() => {
    if (!selectedTenant) return
    setLoading(true)
    api.get<{ instances: Instance[] }>(`/instances-list?tenant_id=${selectedTenant.tenant_id}`)
      .then(r => setInstances(r.instances || []))
      .catch(() => toast.error('Erro ao carregar instâncias'))
      .finally(() => setLoading(false))
  }, [selectedTenant])

  useEffect(() => {
    loadInstances()
    if (selectedTenant) {
      api.get<{ agents: Agent[] }>(`/agents-list?tenant_id=${selectedTenant.tenant_id}`)
        .then(r => setAgents(r.agents || []))
        .catch(() => {})
    }
  }, [loadInstances, selectedTenant])

  const openCreate = () => {
    setEditing(null)
    setForm(defaultForm)
    setOpen(true)
  }

  const openEdit = (inst: Instance) => {
    setEditing(inst)
    setForm({
      instance_name: inst.instance_name,
      instance_phone_number: inst.instance_phone_number || '',
      instance_agent_selection_mode: inst.instance_agent_selection_mode,
      instance_current_agent_id: inst.instance_current_agent_id?.toString() || '',
      instance_conversation_timeout_minutes: inst.instance_conversation_timeout_minutes.toString(),
      instance_only_auth: inst.instance_only_auth,
      instance_no_auth_message: inst.instance_no_auth_message || '',
    })
    setOpen(true)
  }

  const save = async () => {
    if (!form.instance_name.trim()) { toast.error('Nome da instância é obrigatório'); return }
    if (!selectedTenant) return
    setSaving(true)
    try {
      const payload = {
        tenant_id: selectedTenant.tenant_id,
        instance_name: form.instance_name,
        instance_phone_number: form.instance_phone_number || null,
        instance_agent_selection_mode: form.instance_agent_selection_mode,
        instance_current_agent_id: form.instance_current_agent_id ? parseInt(form.instance_current_agent_id) : null,
        instance_conversation_timeout_minutes: parseInt(form.instance_conversation_timeout_minutes) || 120,
        instance_only_auth: form.instance_only_auth,
        instance_no_auth_message: form.instance_no_auth_message || null,
      }

      if (editing) {
        await api.post('/instances-update', { ...payload, instance_id: editing.instance_id })
        toast.success('Instância atualizada')
        setOpen(false)
        loadInstances()
      } else {
        await api.post('/instances-create', payload)
        toast.success('Instância criada com sucesso')
        setOpen(false)
        // Recarrega a lista e abre o QR Code da nova instância automaticamente
        try {
          const res = await api.get<{ instances: Instance[] }>(`/instances-list?tenant_id=${selectedTenant.tenant_id}`)
          const all = res.instances || []
          setInstances(all)
          const newInst = all.find(i => i.instance_name === form.instance_name)
          if (newInst) openQrCode(newInst)
        } catch {
          loadInstances()
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar instância')
    } finally {
      setSaving(false)
    }
  }

  const deleteInstance = async (inst: Instance) => {
    try {
      await api.post('/instances-delete', { instance_id: inst.instance_id, tenant_id: selectedTenant?.tenant_id })
      toast.success('Instância excluída')
      loadInstances()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir instância')
    }
  }

  // ─── QR Code ──────────────────────────────────────────────────────────────

  const stopQrPoll = () => {
    if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null }
  }

  const checkQrStatus = useCallback(async (instId: number) => {
    if (!selectedTenant) return
    try {
      const res = await api.get<{ state: string }>(`/instances-status?tenant_id=${selectedTenant.tenant_id}&instance_id=${instId}`)
      if (res.state === 'open') {
        setQrConnected(true)
        stopQrPoll()
        // Aguarda 2s para Evolution API propagar o estado antes de recarregar
        setTimeout(() => loadInstances(), 2000)
      }
    } catch { /* ignore */ }
  }, [selectedTenant, loadInstances])

  const openQrCode = async (inst: Instance) => {
    if (!selectedTenant) return
    setQrInstance(inst)
    setQrCode(null)
    setQrConnected(false)
    setQrOpen(true)
    setQrLoading(true)
    try {
      const res = await api.get<unknown>(`/instances-qrcode?tenant_id=${selectedTenant.tenant_id}&instance_id=${inst.instance_id}`)
      let qr: string | null = null

      // Evolution API returns an array: [{ base64: "data:image/png;base64,...", code: "...", ... }]
      if (Array.isArray(res) && res.length > 0) {
        const item = res[0] as { base64?: string; code?: string }
        qr = item.base64 || null
      } else if (res && typeof res === 'object') {
        const obj = res as { qrcode?: string | { base64?: string }; base64?: string }
        if (typeof obj.base64 === 'string' && obj.base64) {
          qr = obj.base64
        } else if (obj.qrcode && typeof obj.qrcode === 'object') {
          qr = (obj.qrcode as { base64?: string }).base64 || null
        } else if (typeof obj.qrcode === 'string' && obj.qrcode) {
          qr = obj.qrcode
        }
      } else if (typeof res === 'string' && res) {
        qr = res
      }

      setQrCode(qr)
    } catch {
      toast.error('Erro ao obter QR Code')
    } finally {
      setQrLoading(false)
    }

    // Poll status every 3s
    qrPollRef.current = setInterval(() => checkQrStatus(inst.instance_id), 3000)
  }

  const closeQrDialog = (wasConnected?: boolean) => {
    stopQrPoll()
    setQrOpen(false)
    setQrInstance(null)
    setQrCode(null)
    setQrConnected(false)
    // Se fechou após conectar (via botão ou X), recarrega a lista
    if (wasConnected) setTimeout(() => loadInstances(), 1500)
  }

  useEffect(() => () => stopQrPoll(), [])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Instâncias WhatsApp</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadInstances} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {canManage && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />Nova Instância
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Smartphone className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhuma instância cadastrada.</p>
          {canManage && <p className="text-xs mt-1">Clique em &quot;Nova Instância&quot; para começar.</p>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {instances.map(inst => (
            <Card key={inst.instance_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-snug truncate">{inst.instance_name}</p>
                    {inst.instance_phone_number && (
                      <p className="text-xs text-muted-foreground">{inst.instance_phone_number}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {inst.evolution_connected ? (
                      <Wifi size={14} className="text-green-500 mt-0.5" />
                    ) : (
                      <WifiOff size={14} className="text-muted-foreground mt-0.5" />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  <StatusBadge instance={inst} />
                  <Badge variant="outline" className="text-xs">{inst.instance_agent_selection_mode === 'dynamic' ? 'Dinâmico' : 'Fixo'}</Badge>
                  {inst.agent_name && <Badge variant="secondary" className="text-xs truncate max-w-[120px]">{inst.agent_name}</Badge>}
                </div>

                <div className="flex gap-1 flex-wrap">
                  {!inst.evolution_connected && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openQrCode(inst)}>
                      <QrCode size={12} className="mr-1" />QR Code
                    </Button>
                  )}
                  {canManage && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(inst)}>
                        <Pencil size={12} className="mr-1" />Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
                            <Trash2 size={12} className="mr-1" />Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir instância</AlertDialogTitle>
                            <AlertDialogDescription>
                              Excluir <strong>{inst.instance_name}</strong>? A instância será removida do Evolution API e do banco de dados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteInstance(inst)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Instância' : 'Nova Instância'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome da instância *</Label>
              <Input
                value={form.instance_name}
                onChange={e => setForm(f => ({ ...f, instance_name: e.target.value }))}
                placeholder="minha-instancia"
                disabled={!!editing}
              />
              {!editing && <p className="text-xs text-muted-foreground">Apenas letras minúsculas, números e hífens.</p>}
            </div>

            <div className="space-y-1">
              <Label>Número WhatsApp</Label>
              <Input
                value={form.instance_phone_number}
                onChange={e => setForm(f => ({ ...f, instance_phone_number: e.target.value }))}
                placeholder="5511999999999"
              />
            </div>

            <div className="space-y-1">
              <Label>Modo de agente</Label>
              <Select value={form.instance_agent_selection_mode} onValueChange={v => setForm(f => ({ ...f, instance_agent_selection_mode: v as 'fixed' | 'dynamic' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixo</SelectItem>
                  <SelectItem value="dynamic">Dinâmico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.instance_agent_selection_mode === 'fixed' && (
              <div className="space-y-1">
                <Label>Agente fixo</Label>
                <Select
                  value={form.instance_current_agent_id}
                  onValueChange={v => setForm(f => ({ ...f, instance_current_agent_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar agente..." /></SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.agents_id} value={a.agents_id.toString()}>{a.agents_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Timeout da conversa (minutos)</Label>
              <Input
                type="number"
                value={form.instance_conversation_timeout_minutes}
                onChange={e => setForm(f => ({ ...f, instance_conversation_timeout_minutes: e.target.value }))}
                placeholder="120"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Somente autenticação</p>
                <p className="text-xs text-muted-foreground">Exige autenticação antes de responder</p>
              </div>
              <Switch
                checked={form.instance_only_auth}
                onCheckedChange={v => setForm(f => ({ ...f, instance_only_auth: v }))}
              />
            </div>

            {form.instance_only_auth && (
              <div className="space-y-1">
                <Label>Mensagem de não autenticado</Label>
                <Textarea
                  value={form.instance_no_auth_message}
                  onChange={e => setForm(f => ({ ...f, instance_no_auth_message: e.target.value }))}
                  rows={2}
                  placeholder="Para continuar, você precisa se autenticar..."
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onOpenChange={() => closeQrDialog(qrConnected)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conectar {qrInstance?.instance_name}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {qrConnected ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Wifi className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm font-medium text-green-600">WhatsApp conectado com sucesso!</p>
                <Button onClick={() => closeQrDialog(true)}>Fechar</Button>
              </div>
            ) : qrLoading ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Obtendo QR Code...</p>
              </div>
            ) : qrCode ? (
              <>
                <div className="border rounded-lg p-2 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      qrCode.startsWith('data:')
                        ? qrCode
                        : qrCode.startsWith('<svg') || qrCode.startsWith('<?xml')
                          ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode)}`
                          : `data:image/png;base64,${qrCode}`
                    }
                    alt="QR Code WhatsApp"
                    className="w-56 h-56 object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo e escaneie o QR Code.
                </p>
                <p className="text-xs text-muted-foreground">Aguardando conexão...</p>
                <Button variant="outline" size="sm" onClick={() => qrInstance && openQrCode(qrInstance)}>
                  <RefreshCw size={13} className="mr-1" />Atualizar QR Code
                </Button>
              </>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">Não foi possível obter o QR Code.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => qrInstance && openQrCode(qrInstance)}>
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
