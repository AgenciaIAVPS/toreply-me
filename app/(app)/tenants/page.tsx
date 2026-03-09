'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Tenant } from '@/lib/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Archive, Link2 } from 'lucide-react'

interface TenantForm {
  name: string
  description: string
  slug: string
}

export default function TenantsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<Tenant | null>(null)
  const [form, setForm] = useState<TenantForm>({ name: '', description: '', slug: '' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  useEffect(() => {
    if (!user?.user_is_master_admin) { router.push('/dashboard'); return }
    load()
  }, [user])

  const load = () => {
    setLoading(true)
    api.get<{ tenants: Tenant[] }>('/tenants-list').then(r => setTenants(r.tenants)).catch(() => toast.error('Erro ao carregar tenants')).finally(() => setLoading(false))
  }

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', description: '', slug: '' })
    setDialogOpen(true)
  }

  const openEdit = (t: Tenant) => {
    setEditTarget(t)
    setForm({ name: t.tenant_name, description: t.tenant_description || '', slug: t.tenant_slug })
    setDialogOpen(true)
  }

  const save = async () => {
    try {
      if (editTarget) {
        await api.post('/tenants-update', { tenant_id: editTarget.tenant_id, ...form })
        toast.success('Tenant atualizado')
      } else {
        await api.post('/tenants-create', form)
        toast.success('Tenant criado')
      }
      setDialogOpen(false)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  const archive = async (t: Tenant) => {
    if (!confirm(`Arquivar "${t.tenant_name}"?`)) return
    try {
      await api.post('/tenants-archive', { tenant_id: t.tenant_id })
      toast.success('Tenant arquivado')
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao arquivar')
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

  if (!user?.user_is_master_admin) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Button onClick={openCreate} size="sm"><Plus className="mr-2 h-4 w-4" />Novo tenant</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <div className="grid gap-3">
          {tenants.filter(t => !t.tenant_is_archived).map(t => (
            <Card key={t.tenant_id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {t.tenant_name}
                      {t.tenant_is_master && <Badge variant="secondary" className="text-xs">Master</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.tenant_slug}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => generateInvite(t)} title="Gerar convite">
                      <Link2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                      <Pencil size={14} />
                    </Button>
                    {!t.tenant_is_master && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => archive(t)}>
                        <Archive size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar tenant' : 'Novo tenant'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Slug (identificador único)</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} />
            </div>
            <Button className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite URL dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Link de convite gerado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Copie e envie este link para convidar alguém:</p>
            <div className="flex gap-2">
              <Input value={inviteUrl || ''} readOnly className="font-mono text-xs" />
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(inviteUrl || ''); toast.success('Copiado!') }}>
                Copiar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
