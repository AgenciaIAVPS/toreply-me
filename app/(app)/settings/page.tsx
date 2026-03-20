'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { isValidSlug, sanitizeSlug } from '@/lib/validators'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Plus, Trash2, Database } from 'lucide-react'

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
const EMPTY_FORM = { ldb_name: '', ldb_type: 'postgres', ldb_host: '', ldb_port: '', ldb_user: '', ldb_pass: '', ldb_database: '' }

export default function SettingsPage() {
  const router = useRouter()
  const { user, logout, refreshUser } = useAuth()
  const { selectedTenant, selectedParent, isSubTenant } = useTenant()
  const isAdmin = selectedTenant?.tenant_user_role === 'admin'
  const isAgentsAdmin = selectedTenant?.tenant_user_role === 'agents_admin'
  const isMaster = user?.user_is_master_admin && selectedTenant?.tenant_is_master
  const canManageLocalDbs = isAdmin || isAgentsAdmin || isMaster

  // Empresa form state
  const [tenantName, setTenantName] = useState('')
  const [tenantDescription, setTenantDescription] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [tenantLogoUrl, setTenantLogoUrl] = useState('')
  const [slugError, setSlugError] = useState('')
  const [savingEmpresa, setSavingEmpresa] = useState(false)

  // Master settings state
  const [masterSettings, setMasterSettings] = useState<Record<string, string>>({})
  const [savingMaster, setSavingMaster] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  const MASTER_SETTINGS = [
    { key: 'default_ai_multiplier', label: 'Multiplicador de custo IA (padrão)', placeholder: '7.0' },
    { key: 'default_ai_fixed_fee', label: 'Taxa fixa de IA em R$ (padrão)', placeholder: '0.05' },
    { key: 'default_subscription_fee', label: 'Mensalidade padrão em R$', placeholder: '200.00' },
  ]

  // Conta delete state
  const [confirmText, setConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Local DBs state
  const [localDbs, setLocalDbs] = useState<LocalDb[]>([])
  const [loadingDbs, setLoadingDbs] = useState(false)
  const [dbDialog, setDbDialog] = useState(false)
  const [editingDb, setEditingDb] = useState<LocalDb | null>(null)
  const [dbForm, setDbForm] = useState(EMPTY_FORM)
  const [savingDb, setSavingDb] = useState(false)
  const [deletingDb, setDeletingDb] = useState<string | null>(null)

  useEffect(() => {
    if (selectedTenant) {
      setTenantName(selectedTenant.tenant_name)
      setTenantDescription(selectedTenant.tenant_description || '')
      setTenantSlug(selectedTenant.tenant_slug)
      const logo = selectedTenant.tenant_logo_url
      setTenantLogoUrl((logo && logo !== 'null') ? logo : '')
    }
  }, [selectedTenant])

  useEffect(() => {
    if (!isMaster) return
    api.get<{ settings: { setting_key: string; setting_value: string }[] }>('/master-settings')
      .then(r => {
        const map: Record<string, string> = {}
        r.settings?.forEach(s => { map[s.setting_key] = s.setting_value })
        setMasterSettings(map)
      })
      .catch(() => {})
  }, [isMaster])

  const loadLocalDbs = useCallback(() => {
    if (!selectedTenant || !canManageLocalDbs) return
    setLoadingDbs(true)
    api.get<{ local_dbs: LocalDb[] }>(`/localdb-list?tenant_id=${selectedTenant.tenant_id}`)
      .then(r => setLocalDbs(r.local_dbs || []))
      .catch(() => toast.error('Erro ao carregar bancos locais'))
      .finally(() => setLoadingDbs(false))
  }, [selectedTenant, canManageLocalDbs])

  useEffect(() => { loadLocalDbs() }, [loadLocalDbs])

  const saveMasterSetting = async (key: string, value: string) => {
    setSavingMaster(true)
    try {
      await api.post('/master-settings', { key, value })
      toast.success('Configuração salva')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSavingMaster(false)
    }
  }

  const testUnaragConnection = async () => {
    if (!selectedTenant) return
    setTestingConnection(true)
    try {
      await api.post('/device/tenant-exists', { tenant_id: selectedTenant.tenant_id })
      toast.success('Conexão OK — UnaragConsole respondeu')
    } catch {
      toast.error('Sem resposta do UnaragConsole')
    } finally {
      setTestingConnection(false)
    }
  }

  const openCreateDb = () => {
    setEditingDb(null)
    setDbForm(EMPTY_FORM)
    setDbDialog(true)
  }

  const openEditDb = (db: LocalDb) => {
    setEditingDb(db)
    setDbForm({
      ldb_name: db.ldb_name,
      ldb_type: db.ldb_type,
      ldb_host: db.ldb_host || '',
      ldb_port: db.ldb_port?.toString() || '',
      ldb_user: db.ldb_user || '',
      ldb_pass: '',
      ldb_database: db.ldb_database || '',
    })
    setDbDialog(true)
  }

  const saveDb = async () => {
    if (!selectedTenant) return
    if (!dbForm.ldb_name || !dbForm.ldb_type) {
      toast.error('Nome e tipo são obrigatórios')
      return
    }
    setSavingDb(true)
    try {
      const payload = {
        ...dbForm,
        tenant_id: selectedTenant.tenant_id,
        ldb_port: dbForm.ldb_port ? Number(dbForm.ldb_port) : null,
        ...(editingDb ? { ldb_id: editingDb.ldb_id } : {}),
      }
      if (editingDb) {
        await api.post('/localdb-update', payload)
        toast.success('Banco atualizado!')
      } else {
        await api.post('/localdb-create', payload)
        toast.success('Banco criado!')
      }
      setDbDialog(false)
      loadLocalDbs()
    } catch {
      toast.error('Erro ao salvar banco')
    } finally {
      setSavingDb(false)
    }
  }

  const deleteDb = async (ldbId: string) => {
    if (!selectedTenant) return
    setDeletingDb(ldbId)
    try {
      await api.post('/localdb-delete', { ldb_id: ldbId, tenant_id: selectedTenant.tenant_id })
      toast.success('Banco removido')
      setLocalDbs(prev => prev.filter(d => d.ldb_id !== ldbId))
    } catch {
      toast.error('Erro ao remover banco')
    } finally {
      setDeletingDb(null)
    }
  }

  const saveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return
    setSlugError('')
    if (!isValidSlug(tenantSlug)) {
      setSlugError('Slug deve conter apenas letras minúsculas, números e hífens')
      return
    }
    setSavingEmpresa(true)
    try {
      await api.post('/tenants-update', {
        tenant_id: selectedTenant.tenant_id,
        name: tenantName,
        description: tenantDescription,
        slug: tenantSlug,
        logo_url: tenantLogoUrl || null,
      })
      toast.success('Empresa atualizada!')
      await refreshUser()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar empresa')
    } finally {
      setSavingEmpresa(false)
    }
  }

  const deleteAccount = async () => {
    setDeletingAccount(true)
    try {
      await api.post('/auth/delete-account')
      logout()
      router.push('/login')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao apagar conta')
      setDeletingAccount(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="conta">Conta</TabsTrigger>
          {canManageLocalDbs && <TabsTrigger value="localdb">Bancos Locais</TabsTrigger>}
          {isMaster && <TabsTrigger value="master">Sistema</TabsTrigger>}
        </TabsList>

        <TabsContent value="empresa" className="mt-4">
          {/* RF-011: sub-tenant vê dados do pai em modo read-only, sem slug/logo */}
          {isSubTenant && selectedParent ? (
            <Card>
              <CardHeader>
                <CardTitle>Dados da empresa</CardTitle>
                <CardDescription>Informações do seu parceiro responsável.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={selectedParent.rel_parent_tenant_name} disabled readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={selectedParent.rel_description ?? ''} disabled readOnly placeholder="—" />
                </div>
              </CardContent>
            </Card>
          ) : !isAdmin ? (
            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground">Apenas administradores podem editar as configurações da empresa.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Dados da empresa</CardTitle>
                <CardDescription>Informações do seu tenant visíveis para os membros.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveEmpresa} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenant-name">Nome</Label>
                    <Input
                      id="tenant-name"
                      value={tenantName}
                      onChange={e => setTenantName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-description">Descrição</Label>
                    <Input
                      id="tenant-description"
                      value={tenantDescription}
                      onChange={e => setTenantDescription(e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-slug">
                      Slug <span className="text-xs text-muted-foreground">(letras minúsculas, números e hífens)</span>
                    </Label>
                    <Input
                      id="tenant-slug"
                      value={tenantSlug}
                      onChange={e => { setTenantSlug(sanitizeSlug(e.target.value)); setSlugError('') }}
                      required
                    />
                    {slugError && <p className="text-xs text-destructive">{slugError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-logo">
                      Logo <span className="text-xs text-muted-foreground">(URL da imagem, 200×44px)</span>
                    </Label>
                    <Input
                      id="tenant-logo"
                      type="url"
                      value={tenantLogoUrl}
                      onChange={e => setTenantLogoUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <Button type="submit" disabled={savingEmpresa}>
                    {savingEmpresa ? 'Salvando...' : 'Salvar'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conta" className="mt-4">
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Apagar conta</CardTitle>
              <CardDescription>Esta ação é irreversível. Todos os seus dados serão apagados permanentemente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-delete">
                  Digite <span className="font-mono font-semibold">Quero apagar minha conta</span> para confirmar
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="Quero apagar minha conta"
                />
              </div>
              <Button
                variant="destructive"
                disabled={confirmText !== 'Quero apagar minha conta' || deletingAccount}
                onClick={deleteAccount}
              >
                {deletingAccount ? 'Apagando...' : 'Confirmar exclusão'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {canManageLocalDbs && (
          <TabsContent value="localdb" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Bancos de Dados Locais</CardTitle>
                    <CardDescription className="mt-1">Conexões de banco registradas para o UnaragConsole.</CardDescription>
                  </div>
                  <Button size="sm" onClick={openCreateDb}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDbs ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : localDbs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Database className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">Nenhum banco configurado.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {localDbs.map(db => (
                      <div
                        key={db.ldb_id}
                        className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/40 cursor-pointer"
                        onClick={() => openEditDb(db)}
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
                            disabled={deletingDb === db.ldb_id}
                            onClick={e => { e.stopPropagation(); deleteDb(db.ldb_id) }}
                          >
                            {deletingDb === db.ldb_id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Trash2 className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog open={dbDialog} onOpenChange={setDbDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingDb ? 'Editar Banco' : 'Novo Banco de Dados'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label>Nome *</Label>
                    <Input
                      value={dbForm.ldb_name}
                      onChange={e => setDbForm(f => ({ ...f, ldb_name: e.target.value }))}
                      placeholder="Ex: ERP Principal"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo *</Label>
                    <Select value={dbForm.ldb_type} onValueChange={v => setDbForm(f => ({ ...f, ldb_type: v }))}>
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
                        value={dbForm.ldb_host}
                        onChange={e => setDbForm(f => ({ ...f, ldb_host: e.target.value }))}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Porta</Label>
                      <Input
                        type="number"
                        value={dbForm.ldb_port}
                        onChange={e => setDbForm(f => ({ ...f, ldb_port: e.target.value }))}
                        placeholder="5432"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Usuário</Label>
                    <Input
                      value={dbForm.ldb_user}
                      onChange={e => setDbForm(f => ({ ...f, ldb_user: e.target.value }))}
                      placeholder="postgres"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{editingDb ? 'Senha (deixe vazio para não alterar)' : 'Senha'}</Label>
                    <Input
                      type="password"
                      value={dbForm.ldb_pass}
                      onChange={e => setDbForm(f => ({ ...f, ldb_pass: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Nome do banco</Label>
                    <Input
                      value={dbForm.ldb_database}
                      onChange={e => setDbForm(f => ({ ...f, ldb_database: e.target.value }))}
                      placeholder="mydb"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDbDialog(false)}>Cancelar</Button>
                  <Button onClick={saveDb} disabled={savingDb}>
                    {savingDb ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {isMaster && (
          <TabsContent value="master" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações globais de IA</CardTitle>
                <CardDescription>Valores padrão usados quando um tenant não tem taxas específicas configuradas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {MASTER_SETTINGS.map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={masterSettings[key] ?? ''}
                        onChange={e => setMasterSettings(s => ({ ...s, [key]: e.target.value }))}
                        placeholder={placeholder}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingMaster}
                        onClick={() => saveMasterSetting(key, masterSettings[key] ?? '')}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sistema</CardTitle>
                <CardDescription>Configurações gerais exibidas no frontend para todos os usuários.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Link dos termos de uso</Label>
                  <p className="text-xs text-muted-foreground">URL exibida no checkbox de cadastro de novos usuários</p>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={masterSettings['tos_url'] ?? ''}
                      onChange={e => setMasterSettings(s => ({ ...s, tos_url: e.target.value }))}
                      placeholder="https://..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={savingMaster}
                      onClick={() => saveMasterSetting('tos_url', masterSettings['tos_url'] ?? '')}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integração UnaragAPI</CardTitle>
                <CardDescription>URL base do UnaragConsole (dispositivo local do cliente).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>URL do UnaragAPI</Label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={masterSettings['device_api_url'] ?? ''}
                      onChange={e => setMasterSettings(s => ({ ...s, device_api_url: e.target.value }))}
                      placeholder="https://device.toreply.me"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={savingMaster}
                      onClick={() => saveMasterSetting('device_api_url', masterSettings['device_api_url'] ?? '')}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={testingConnection}
                  onClick={testUnaragConnection}
                >
                  {testingConnection ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testando...</> : 'Testar Conexão'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
