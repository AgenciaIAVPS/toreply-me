'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { Agent, AgentStep, AgentResponseVariable } from '@/lib/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Loader2, Bot } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type StepDraft = Omit<AgentStep, 'steps_id' | 'agent_steps_order'> & {
  _localId: string
  steps_id?: number
  agent_steps_order: number
}

type VarDraft = Omit<AgentResponseVariable, 'arv_id' | 'arv_agent_id'> & {
  _localId: string
  arv_id?: number
}

type AgentForm = {
  agents_name: string
  agents_description: string
  agents_response_type: 'llm' | 'math'
  agents_is_global: boolean
  agents_is_close_agent: boolean
  agents_min_chars: string
  agents_max_chars: string
  agents_data_type_description: string
  agents_data_to_report: string
  agents_extra_rules: string
  agents_response_set_data: string
  agents_response_api_payload_template: string
  agents_response_format_data: string
}

const defaultForm: AgentForm = {
  agents_name: '',
  agents_description: '',
  agents_response_type: 'llm',
  agents_is_global: false,
  agents_is_close_agent: false,
  agents_min_chars: '',
  agents_max_chars: '',
  agents_data_type_description: '',
  agents_data_to_report: '',
  agents_extra_rules: '',
  agents_response_set_data: '',
  agents_response_api_payload_template: '',
  agents_response_format_data: '',
}

const defaultStep = (): StepDraft => ({
  _localId: Math.random().toString(36).slice(2),
  steps_name: '',
  steps_api_method: 'POST',
  steps_api_endpoint: '',
  steps_api_headers: null,
  steps_api_payload_template: null,
  steps_pre_sql: null,
  steps_pre_script: null,
  steps_post_script: null,
  steps_post_sql: null,
  agent_steps_order: 0,
})

const defaultVar = (): VarDraft => ({
  _localId: Math.random().toString(36).slice(2),
  arv_variable_name: '',
  arv_type: 'string',
  arv_label: '',
  arv_order: 0,
  arv_sanitize: true,
})

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { user } = useAuth()
  const { selectedTenant } = useTenant()

  const isAdmin = selectedTenant?.tenant_user_role === 'admin'
  const isAgentsAdmin = selectedTenant?.tenant_user_role === 'agents_admin'
  const isMasterAdmin = !!user?.user_is_master_admin
  const isMaster = !!(user?.user_is_master_admin && selectedTenant?.tenant_is_master)
  const canEdit = isAgentsAdmin || isMasterAdmin

  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('geral')

  // Form state
  const [form, setForm] = useState<AgentForm>(defaultForm)
  const [steps, setSteps] = useState<StepDraft[]>([])
  const [vars, setVars] = useState<VarDraft[]>([])

  // Step sub-tabs: record of localId → active sub-tab
  const [stepSubTabs, setStepSubTabs] = useState<Record<string, string>>({})

  // Reset activeTab when response type changes away from llm
  useEffect(() => {
    if (form.agents_response_type === 'math' && (activeTab === 'llm_response' || activeTab === 'variaveis')) {
      setActiveTab('geral')
    }
  }, [form.agents_response_type]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadAgents = useCallback(() => {
    if (!selectedTenant) return
    setLoading(true)
    api.get<{ agents: Agent[] }>(`/agents-list?tenant_id=${selectedTenant.tenant_id}`)
      .then(r => setAgents(r.agents || []))
      .catch(() => toast.error('Erro ao carregar agentes'))
      .finally(() => setLoading(false))
  }, [selectedTenant])

  useEffect(() => { loadAgents() }, [loadAgents])

  const openCreate = () => {
    setEditing(null)
    setForm(defaultForm)
    setSteps([])
    setVars([])
    setStepSubTabs({})
    setActiveTab('geral')
    setOpen(true)
  }

  const openEdit = async (agent: Agent) => {
    setEditing(agent)
    setForm({
      agents_name: agent.agents_name,
      agents_description: agent.agents_description || '',
      agents_response_type: agent.agents_response_type,
      agents_is_global: agent.agents_is_global,
      agents_is_close_agent: agent.agents_is_close_agent,
      agents_min_chars: agent.agents_min_chars?.toString() || '',
      agents_max_chars: agent.agents_max_chars?.toString() || '',
      agents_data_type_description: agent.agents_data_type_description || '',
      agents_data_to_report: agent.agents_data_to_report || '',
      agents_extra_rules: agent.agents_extra_rules || '',
      agents_response_set_data: agent.agents_response_set_data || '',
      agents_response_api_payload_template: agent.agents_response_api_payload_template
        ? JSON.stringify(agent.agents_response_api_payload_template, null, 2) : '',
      agents_response_format_data: agent.agents_response_format_data || '',
    })
    setStepSubTabs({})
    setActiveTab('geral')
    setOpen(true)

    // Load steps and vars in parallel
    try {
      const [stepsRes, varsRes] = await Promise.all([
        api.get<{ steps: AgentStep[] }>(`/steps-list?agent_id=${agent.agents_id}`),
        api.get<{ variables: AgentResponseVariable[] }>(`/arv-list?agent_id=${agent.agents_id}`),
      ])
      setSteps((stepsRes.steps || []).map(s => ({ ...s, _localId: Math.random().toString(36).slice(2) })))
      setVars((varsRes.variables || []).map(v => ({ ...v, _localId: Math.random().toString(36).slice(2) })))
    } catch {
      toast.error('Erro ao carregar detalhes do agente')
    }
  }

  const save = async () => {
    if (!form.agents_name.trim()) { toast.error('Nome é obrigatório'); return }
    if (!selectedTenant) return
    setSaving(true)
    try {
      let agentId = editing?.agents_id

      // Parse JSON fields safely
      let parsedPayload = null
      if (form.agents_response_api_payload_template.trim()) {
        try { parsedPayload = JSON.parse(form.agents_response_api_payload_template) }
        catch { toast.error('Template de payload inválido (JSON inválido)'); setSaving(false); return }
      }

      const payload = {
        tenant_id: selectedTenant.tenant_id,
        name: form.agents_name,
        description: form.agents_description || null,
        response_type: form.agents_response_type,
        is_global: form.agents_is_global,
        is_close_agent: form.agents_is_close_agent,
        min_chars: form.agents_min_chars ? parseInt(form.agents_min_chars) : null,
        max_chars: form.agents_max_chars ? parseInt(form.agents_max_chars) : null,
        data_type_description: form.agents_data_type_description || null,
        data_to_report: form.agents_data_to_report || null,
        extra_rules: form.agents_extra_rules || null,
        response_set_data: form.agents_response_set_data || null,
        response_api_payload_template: parsedPayload,
        response_format_data: form.agents_response_format_data || null,
      }

      if (editing) {
        await api.post('/agents-update', { ...payload, agent_id: agentId })
      } else {
        const res = await api.post<{ agent: { agents_id: number } }>('/agents-create', payload)
        agentId = res.agent.agents_id
      }

      // Save steps
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i]
        let parsedHeaders = null, parsedStepPayload = null
        try { if (s.steps_api_headers) parsedHeaders = typeof s.steps_api_headers === 'string' ? JSON.parse(s.steps_api_headers as unknown as string) : s.steps_api_headers } catch { /* ignore */ }
        try { if (s.steps_api_payload_template) parsedStepPayload = typeof s.steps_api_payload_template === 'string' ? JSON.parse(s.steps_api_payload_template as unknown as string) : s.steps_api_payload_template } catch { /* ignore */ }
        await api.post('/steps-upsert', {
          tenant_id: selectedTenant.tenant_id,
          agent_id: agentId,
          step_id: s.steps_id || null,
          name: s.steps_name,
          api_method: s.steps_api_method,
          api_endpoint: s.steps_api_endpoint,
          api_headers: parsedHeaders,
          api_payload_template: parsedStepPayload,
          pre_sql: s.steps_pre_sql || null,
          pre_script: s.steps_pre_script || null,
          post_script: s.steps_post_script || null,
          post_sql: s.steps_post_sql || null,
          order: i,
        })
      }

      // Reorder steps
      if (steps.length > 0 && steps.some(s => s.steps_id)) {
        const ids = steps.filter(s => s.steps_id).map(s => s.steps_id!)
        if (ids.length > 0) {
          await api.post('/steps-reorder', { tenant_id: selectedTenant.tenant_id, agent_id: agentId, step_ids: ids })
        }
      }

      // Save variables
      for (let i = 0; i < vars.length; i++) {
        const v = vars[i]
        await api.post('/arv-upsert', {
          tenant_id: selectedTenant.tenant_id,
          agent_id: agentId,
          variable_name: v.arv_variable_name,
          type: v.arv_type,
          label: v.arv_label,
          order: i,
          sanitize: v.arv_sanitize,
        })
      }

      toast.success(editing ? 'Agente atualizado' : 'Agente criado')
      setOpen(false)
      loadAgents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar agente')
    } finally {
      setSaving(false)
    }
  }

  const deleteAgent = async (agent: Agent) => {
    try {
      await api.post('/agents-delete', { agent_id: agent.agents_id, tenant_id: selectedTenant?.tenant_id })
      toast.success('Agente excluído')
      loadAgents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir agente')
    }
  }

  // ─── Step helpers ──────────────────────────────────────────────────────────
  const moveStep = (idx: number, dir: -1 | 1) => {
    const next = [...steps]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setSteps(next.map((s, i) => ({ ...s, agent_steps_order: i })))
  }

  const updateStep = (localId: string, field: keyof StepDraft, value: unknown) => {
    setSteps(prev => prev.map(s => s._localId === localId ? { ...s, [field]: value } : s))
  }

  const removeStep = (localId: string) => {
    setSteps(prev => prev.filter(s => s._localId !== localId))
  }

  const getStepSubTab = (localId: string) => stepSubTabs[localId] || 'headers'
  const setStepSubTab = (localId: string, tab: string) =>
    setStepSubTabs(prev => ({ ...prev, [localId]: tab }))

  // ─── Var helpers ───────────────────────────────────────────────────────────
  const updateVar = (localId: string, field: keyof VarDraft, value: unknown) => {
    setVars(prev => prev.map(v => v._localId === localId ? { ...v, [field]: value } : v))
  }

  const removeVar = (localId: string) => {
    setVars(prev => prev.filter(v => v._localId !== localId))
  }

  const isLlm = form.agents_response_type === 'llm'

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Agentes</h1>
        {canEdit && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />Novo Agente
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Bot className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum agente cadastrado.</p>
          {canEdit && <p className="text-xs mt-1">Clique em &quot;Novo Agente&quot; para começar.</p>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map(agent => (
            <Card key={agent.agents_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-snug">{agent.agents_name}</p>
                  <div className="flex gap-1 shrink-0">
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(agent)}>
                          <Pencil size={13} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 size={13} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir agente</AlertDialogTitle>
                              <AlertDialogDescription>
                                Excluir <strong>{agent.agents_name}</strong>? Todos os steps vinculados serão removidos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAgent(agent)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    {(isAdmin || !canEdit) && !isMaster && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(agent)}>
                        <Pencil size={13} />
                      </Button>
                    )}
                  </div>
                </div>
                {agent.agents_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{agent.agents_description}</p>
                )}
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">{agent.agents_response_type}</Badge>
                  {agent.agents_is_global && <Badge variant="secondary" className="text-xs">Global</Badge>}
                  {agent.agents_is_close_agent && <Badge variant="secondary" className="text-xs">Fechamento</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Agent Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] w-[1100px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Agente' : 'Novo Agente'}</DialogTitle>
          </DialogHeader>

          {/* Read-only view for non-editors */}
          {!canEdit && editing ? (
            <div className="space-y-3 py-2">
              <div>
                <p className="text-sm font-medium">{editing.agents_name}</p>
                {editing.agents_description && <p className="text-sm text-muted-foreground mt-1">{editing.agents_description}</p>}
              </div>
              <div className="flex gap-1 flex-wrap">
                <Badge variant="outline" className="text-xs">{editing.agents_response_type}</Badge>
                {editing.agents_is_global && <Badge variant="secondary" className="text-xs">Global</Badge>}
                {editing.agents_is_close_agent && <Badge variant="secondary" className="text-xs">Fechamento</Badge>}
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
                <TabsTrigger value="geral">Geral</TabsTrigger>
                {isLlm && <TabsTrigger value="llm_response">Resposta LLM</TabsTrigger>}
                <TabsTrigger value="regras_extras">Regras extras</TabsTrigger>
                {isLlm && <TabsTrigger value="variaveis">Variáveis da resposta</TabsTrigger>}
                <TabsTrigger value="steps">Steps</TabsTrigger>
              </TabsList>

              {/* TAB: GERAL */}
              <TabsContent value="geral" className="space-y-4 mt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Nome *</Label>
                    <Input value={form.agents_name} onChange={e => setForm(f => ({ ...f, agents_name: e.target.value }))} placeholder="Ex: Consulta de vendas" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Descrição</Label>
                    <Textarea value={form.agents_description} onChange={e => setForm(f => ({ ...f, agents_description: e.target.value }))} rows={2} placeholder="Descreva o propósito do agente" />
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo de resposta</Label>
                    <Select value={form.agents_response_type} onValueChange={v => setForm(f => ({ ...f, agents_response_type: v as 'llm' | 'math' }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="llm">LLM</SelectItem>
                        <SelectItem value="math">Math</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={form.agents_is_global} onChange={e => setForm(f => ({ ...f, agents_is_global: e.target.checked }))} className="rounded" />
                      É global
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={form.agents_is_close_agent} onChange={e => setForm(f => ({ ...f, agents_is_close_agent: e.target.checked }))} className="rounded" />
                      Agente de fechamento
                    </label>
                  </div>
                </div>
              </TabsContent>

              {/* TAB: RESPOSTA LLM (só para tipo llm) */}
              {isLlm && (
                <TabsContent value="llm_response" className="space-y-4 mt-4">
                  <div className="space-y-1">
                    <Label>Descrição do tipo de dado</Label>
                    <Textarea value={form.agents_data_type_description} onChange={e => setForm(f => ({ ...f, agents_data_type_description: e.target.value }))} rows={3} placeholder="Descreva o tipo de dado retornado pela API" />
                  </div>
                  <div className="space-y-1">
                    <Label>Dados a reportar</Label>
                    <Textarea value={form.agents_data_to_report} onChange={e => setForm(f => ({ ...f, agents_data_to_report: e.target.value }))} rows={3} placeholder="Quais dados o agente deve reportar ao usuário" />
                  </div>
                  <div className="space-y-1">
                    <Label>Min / Max chars</Label>
                    <div className="flex gap-2 max-w-xs">
                      <Input type="number" placeholder="Min" value={form.agents_min_chars} onChange={e => setForm(f => ({ ...f, agents_min_chars: e.target.value }))} />
                      <Input type="number" placeholder="Max" value={form.agents_max_chars} onChange={e => setForm(f => ({ ...f, agents_max_chars: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Script set_data (JS)</Label>
                    <Textarea value={form.agents_response_set_data} onChange={e => setForm(f => ({ ...f, agents_response_set_data: e.target.value }))} rows={6} className="font-mono text-xs" placeholder="// JavaScript executado após steps" />
                  </div>
                  <div className="space-y-1">
                    <Label>Template de payload LLM (JSON)</Label>
                    <Textarea value={form.agents_response_api_payload_template} onChange={e => setForm(f => ({ ...f, agents_response_api_payload_template: e.target.value }))} rows={6} className="font-mono text-xs" placeholder='{"messages": [...]}' />
                  </div>
                  <div className="space-y-1">
                    <Label>Script de formatação (JS)</Label>
                    <Textarea value={form.agents_response_format_data} onChange={e => setForm(f => ({ ...f, agents_response_format_data: e.target.value }))} rows={6} className="font-mono text-xs" placeholder="// JavaScript para formatar resposta final" />
                  </div>
                </TabsContent>
              )}

              {/* TAB: REGRAS EXTRAS */}
              <TabsContent value="regras_extras" className="mt-4">
                <div className="space-y-1">
                  <Label>Regras extras</Label>
                  <Textarea
                    value={form.agents_extra_rules}
                    onChange={e => setForm(f => ({ ...f, agents_extra_rules: e.target.value }))}
                    className="font-mono text-xs min-h-[400px]"
                    placeholder="Regras adicionais que o agente deve seguir..."
                  />
                </div>
              </TabsContent>

              {/* TAB: VARIÁVEIS DA RESPOSTA (só para tipo llm) */}
              {isLlm && (
                <TabsContent value="variaveis" className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Variáveis de resposta do agente</p>
                    <Button size="sm" variant="outline" onClick={() => setVars(v => [...v, defaultVar()])}>
                      <Plus className="h-3 w-3 mr-1" />Adicionar
                    </Button>
                  </div>
                  {vars.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma variável.</p>
                  ) : (
                    <div className="space-y-2">
                      {vars.map((v, i) => (
                        <div key={v._localId} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Nome var.</Label>
                            <Input value={v.arv_variable_name} onChange={e => updateVar(v._localId, 'arv_variable_name', e.target.value)} className="h-8 text-xs" placeholder="vendas_total" />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Tipo</Label>
                            <Select value={v.arv_type} onValueChange={val => updateVar(v._localId, 'arv_type', val)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">string</SelectItem>
                                <SelectItem value="number">number</SelectItem>
                                <SelectItem value="usd_to_brl">usd→brl</SelectItem>
                                <SelectItem value="json_flatten">json_flatten</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Label</Label>
                            <Input value={v.arv_label} onChange={e => updateVar(v._localId, 'arv_label', e.target.value)} className="h-8 text-xs" placeholder="Total de vendas" />
                          </div>
                          <div className="col-span-1 space-y-1">
                            <Label className="text-xs">Ord.</Label>
                            <Input type="number" value={v.arv_order} onChange={e => updateVar(v._localId, 'arv_order', parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                          </div>
                          <div className="col-span-2 flex items-center gap-1 pt-4">
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                              <input type="checkbox" checked={v.arv_sanitize} onChange={e => updateVar(v._localId, 'arv_sanitize', e.target.checked)} className="rounded" />
                              Sanitizar
                            </label>
                          </div>
                          <div className="col-span-1 flex justify-end pt-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeVar(v._localId)}>
                              <Trash2 size={13} />
                            </Button>
                          </div>
                          <div className="hidden">{i}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}

              {/* TAB: STEPS */}
              <TabsContent value="steps" className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Etapas de execução do agente</p>
                  <Button size="sm" variant="outline" onClick={() => setSteps(s => [...s, { ...defaultStep(), agent_steps_order: s.length }])}>
                    <Plus className="h-3 w-3 mr-1" />Adicionar Step
                  </Button>
                </div>
                {steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum step.</p>
                ) : (
                  <div className="space-y-4">
                    {steps.map((step, idx) => (
                      <div key={step._localId} className="border rounded-md p-4 space-y-4">
                        {/* Step header: order controls + delete */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Step {idx + 1}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveStep(idx, -1)}>
                              <ChevronUp size={13} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === steps.length - 1} onClick={() => moveStep(idx, 1)}>
                              <ChevronDown size={13} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeStep(step._localId)}>
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </div>

                        {/* Nome + Método + Endpoint (always visible) */}
                        <div className="flex gap-3 items-end">
                          <div className="space-y-1 w-48 shrink-0">
                            <Label className="text-xs">Nome *</Label>
                            <Input value={step.steps_name} onChange={e => updateStep(step._localId, 'steps_name', e.target.value)} className="h-8 text-xs" placeholder="Buscar pedidos" />
                          </div>
                          <div className="space-y-1 w-32 shrink-0">
                            <Label className="text-xs">Método</Label>
                            <Select value={step.steps_api_method} onValueChange={v => updateStep(step._localId, 'steps_api_method', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['GET','POST','PUT','PATCH','DELETE'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <Label className="text-xs">Endpoint *</Label>
                            <Input value={step.steps_api_endpoint} onChange={e => updateStep(step._localId, 'steps_api_endpoint', e.target.value)} className="h-8 text-xs font-mono w-full" placeholder="https://..." />
                          </div>
                        </div>

                        {/* Sub-tabs for detailed fields */}
                        <Tabs value={getStepSubTab(step._localId)} onValueChange={tab => setStepSubTab(step._localId, tab)}>
                          <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
                            <TabsTrigger value="headers" className="text-xs">Headers</TabsTrigger>
                            <TabsTrigger value="payload" className="text-xs">Payload</TabsTrigger>
                            <TabsTrigger value="pre_sql" className="text-xs">Pre SQL</TabsTrigger>
                            <TabsTrigger value="pre_script" className="text-xs">Pre Script</TabsTrigger>
                            <TabsTrigger value="post_script" className="text-xs">Post Script</TabsTrigger>
                            <TabsTrigger value="post_sql" className="text-xs">Post SQL</TabsTrigger>
                          </TabsList>

                          <TabsContent value="headers" className="mt-2">
                            <Label className="text-xs text-muted-foreground">Headers (JSON)</Label>
                            <Textarea
                              value={step.steps_api_headers ? JSON.stringify(step.steps_api_headers, null, 2) : ''}
                              onChange={e => { try { updateStep(step._localId, 'steps_api_headers', e.target.value ? JSON.parse(e.target.value) : null) } catch { updateStep(step._localId, 'steps_api_headers', e.target.value as unknown as null) } }}
                              className="font-mono text-xs min-h-[520px] mt-1"
                              placeholder='{"Authorization": "Bearer ..."}'
                            />
                          </TabsContent>

                          <TabsContent value="payload" className="mt-2">
                            <Label className="text-xs text-muted-foreground">Payload template (JSON)</Label>
                            <Textarea
                              value={step.steps_api_payload_template ? JSON.stringify(step.steps_api_payload_template, null, 2) : ''}
                              onChange={e => { try { updateStep(step._localId, 'steps_api_payload_template', e.target.value ? JSON.parse(e.target.value) : null) } catch { updateStep(step._localId, 'steps_api_payload_template', e.target.value as unknown as null) } }}
                              className="font-mono text-xs min-h-[520px] mt-1"
                              placeholder='{"query": "..."}'
                            />
                          </TabsContent>

                          <TabsContent value="pre_sql" className="mt-2">
                            <Label className="text-xs text-muted-foreground">Pre SQL</Label>
                            <Textarea
                              value={step.steps_pre_sql || ''}
                              onChange={e => updateStep(step._localId, 'steps_pre_sql', e.target.value || null)}
                              className="font-mono text-xs min-h-[520px] mt-1"
                              placeholder="SELECT ..."
                            />
                          </TabsContent>

                          <TabsContent value="pre_script" className="mt-2">
                            <Label className="text-xs text-muted-foreground">Pre Script (JS)</Label>
                            <Textarea
                              value={step.steps_pre_script || ''}
                              onChange={e => updateStep(step._localId, 'steps_pre_script', e.target.value || null)}
                              className="font-mono text-xs min-h-[520px] mt-1"
                              placeholder="// JavaScript executado antes da chamada API"
                            />
                          </TabsContent>

                          <TabsContent value="post_script" className="mt-2">
                            <Label className="text-xs text-muted-foreground">Post Script (JS)</Label>
                            <Textarea
                              value={step.steps_post_script || ''}
                              onChange={e => updateStep(step._localId, 'steps_post_script', e.target.value || null)}
                              className="font-mono text-xs min-h-[520px] mt-1"
                              placeholder="// JavaScript executado após a chamada API"
                            />
                          </TabsContent>

                          <TabsContent value="post_sql" className="mt-2">
                            <Label className="text-xs text-muted-foreground">Post SQL</Label>
                            <Textarea
                              value={step.steps_post_sql || ''}
                              onChange={e => updateStep(step._localId, 'steps_post_sql', e.target.value || null)}
                              className="font-mono text-xs min-h-[520px] mt-1"
                              placeholder="INSERT INTO ..."
                            />
                          </TabsContent>
                        </Tabs>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {canEdit && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
