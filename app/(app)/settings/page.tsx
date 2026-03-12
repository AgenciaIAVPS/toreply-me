'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const router = useRouter()
  const { logout, refreshUser } = useAuth()
  const { selectedTenant } = useTenant()
  const isAdmin = selectedTenant?.tenant_user_role === 'admin'

  // Empresa form state
  const [tenantName, setTenantName] = useState('')
  const [tenantDescription, setTenantDescription] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [savingEmpresa, setSavingEmpresa] = useState(false)

  // Conta delete state
  const [confirmText, setConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    if (selectedTenant) {
      setTenantName(selectedTenant.tenant_name)
      setTenantDescription(selectedTenant.tenant_description || '')
      setTenantSlug(selectedTenant.tenant_slug)
    }
  }, [selectedTenant])

  const saveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return
    setSavingEmpresa(true)
    try {
      await api.put('/tenants-update', {
        tenant_id: selectedTenant.tenant_id,
        name: tenantName,
        description: tenantDescription,
        slug: tenantSlug,
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
        </TabsList>

        <TabsContent value="empresa" className="mt-4">
          {!isAdmin ? (
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
                    <Label htmlFor="tenant-slug">Slug</Label>
                    <Input
                      id="tenant-slug"
                      value={tenantSlug}
                      onChange={e => setTenantSlug(e.target.value)}
                      required
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
      </Tabs>
    </div>
  )
}
