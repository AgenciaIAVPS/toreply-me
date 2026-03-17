'use client'

import { useEffect, useState } from 'react'
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

export default function SettingsPage() {
  const router = useRouter()
  const { user, logout, refreshUser } = useAuth()
  const { selectedTenant, selectedParent, isSubTenant } = useTenant()
  const isAdmin = selectedTenant?.tenant_user_role === 'admin'
  const isMaster = user?.user_is_master_admin && selectedTenant?.tenant_is_master

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

  const MASTER_SETTINGS = [
    { key: 'default_ai_multiplier', label: 'Multiplicador de custo IA (padrão)', placeholder: '7.0' },
    { key: 'default_ai_fixed_fee', label: 'Taxa fixa de IA em R$ (padrão)', placeholder: '0.05' },
    { key: 'default_subscription_fee', label: 'Mensalidade padrão em R$', placeholder: '200.00' },
  ]

  // Conta delete state
  const [confirmText, setConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

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
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
