'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { MasterUser } from '@/lib/types'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import Image from 'next/image'

export default function MasterUsersPage() {
  const { user } = useAuth()
  const { selectedTenant } = useTenant()
  const router = useRouter()
  const isMaster = user?.user_is_master_admin && selectedTenant?.tenant_is_master

  const [masters, setMasters] = useState<MasterUser[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)

  useEffect(() => {
    if (!isMaster) { router.push('/dashboard'); return }
    load()
  }, [isMaster])

  const load = () => {
    setLoading(true)
    api.get<{ users: MasterUser[] }>('/master-users')
      .then(r => setMasters(r.users || []))
      .catch(() => toast.error('Erro ao carregar usuários master'))
      .finally(() => setLoading(false))
  }

  const toggle = async (u: MasterUser) => {
    setToggling(u.user_id)
    try {
      await api.post('/master-users', { user_id: u.user_id, is_master: !u.user_is_master_admin })
      toast.success(u.user_is_master_admin ? 'Acesso master revogado' : 'Acesso master concedido')
      load()
    } catch {
      toast.error('Erro ao alterar permissão')
    } finally {
      setToggling(null)
    }
  }

  if (!isMaster) return null

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Usuários Master</h1>
      <p className="text-sm text-muted-foreground">Usuários com acesso de administrador master ao sistema.</p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : masters.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário master encontrado.</p>
      ) : (
        <div className="space-y-2">
          {masters.map(u => (
            <Card key={u.user_id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {u.user_avatar_url ? (
                      <Image src={u.user_avatar_url} alt={u.user_name} width={32} height={32} className="rounded-full shrink-0" unoptimized />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium">
                        {u.user_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.user_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <ShieldCheck size={10} /> Master
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={toggling === u.user_id || u.user_id === user?.user_id}
                      onClick={() => toggle(u)}
                      title={u.user_id === user?.user_id ? 'Não é possível revogar seu próprio acesso' : 'Revogar acesso master'}
                    >
                      {toggling === u.user_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ShieldOff size={13} className="text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
