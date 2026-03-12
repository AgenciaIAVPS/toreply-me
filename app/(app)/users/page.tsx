'use client'

import { useEffect, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { TenantUser } from '@/lib/types'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { UserPlus, Link2, UserMinus } from 'lucide-react'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function UsersPage() {
  const { user } = useAuth()
  const { selectedTenant } = useTenant()
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const isAdmin = selectedTenant?.tenant_user_role === 'admin'

  useEffect(() => {
    if (!selectedTenant) return
    setLoading(true)
    api.get<{ users: TenantUser[] }>(`/users-list?tenant_id=${selectedTenant.tenant_id}`).then(r => setUsers(r.users)).catch(() => toast.error('Erro ao carregar usuários')).finally(() => setLoading(false))
  }, [selectedTenant])

  const changeRole = async (userId: number, role: string) => {
    try {
      await api.post('/users-update-role', { user_id: userId, tenant_id: selectedTenant?.tenant_id, role })
      setUsers(u => u.map(x => x.user_id === userId ? { ...x, tenant_user_role: role as 'admin' | 'normal' } : x))
      toast.success('Permissão atualizada')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar permissão')
    }
  }

  const removeUser = async (userId: number) => {
    try {
      await api.post('/users-remove', { user_id: userId, tenant_id: selectedTenant?.tenant_id })
      setUsers(prev => prev.filter(u => u.user_id !== userId))
      toast.success('Usuário removido do tenant')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover usuário')
    }
  }

  const generateInvite = async () => {
    try {
      const res = await api.post<{ invite_url: string }>('/invites-generate', { tenant_id: selectedTenant?.tenant_id })
      setInviteUrl(res.invite_url)
      setInviteOpen(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar convite')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários</h1>
        {isAdmin && (
          <Button onClick={generateInvite} size="sm">
            <UserPlus className="mr-2 h-4 w-4" />Convidar usuário
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <Card key={u.user_id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.user_avatar_url || ''} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(u.user_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {u.user_name}
                        {u.user_id === user?.user_id && <Badge variant="secondary" className="text-xs">Você</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!u.user_email_verified && (
                      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">Email não verificado</Badge>
                    )}
                    <Badge variant={u.tenant_user_role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {u.tenant_user_role === 'admin' ? 'Admin' : 'Normal'}
                    </Badge>
                    {isAdmin && u.user_id !== user?.user_id && (
                      <Select value={u.tenant_user_role} onValueChange={v => changeRole(u.user_id, v)}>
                        <SelectTrigger className="w-[90px] h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {isAdmin && u.user_id !== user?.user_id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <UserMinus size={14} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover usuário</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remover <strong>{u.user_name}</strong> do tenant? O usuário perderá o acesso até receber um novo convite.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeUser(u.user_id)} className="bg-destructive hover:bg-destructive/90">
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Convidar usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2"><Link2 size={14} />Link de convite</p>
              <div className="flex gap-2">
                <Input value={inviteUrl || ''} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(inviteUrl || ''); toast.success('Copiado!') }}>
                  Copiar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
