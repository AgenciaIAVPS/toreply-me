'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LogOut, KeyRound, Building2, MailWarning, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export function UserMenu() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { selectedTenant } = useTenant()
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    logout()
    router.push('/login')
  }

  const handleResendVerification = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (resending || resent) return
    setResending(true)
    try {
      await api.post('/auth/resend-verification')
      setResent(true)
    } catch { /* ignore */ } finally {
      setResending(false)
    }
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring relative">
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={user.user_avatar_url || ''} alt={user.user_name} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {getInitials(user.user_name)}
            </AvatarFallback>
          </Avatar>
          {!user.user_email_verified && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="font-medium text-sm">{user.user_name}</p>
          <p className="text-xs text-muted-foreground font-normal truncate">{user.user_email}</p>
          {selectedTenant && (
            <div className="flex items-center gap-1 mt-1">
              <Building2 size={10} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{selectedTenant.tenant_name}</p>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!user.user_email_verified && (
          <>
            <DropdownMenuItem
              className="flex-col items-start gap-1 cursor-default focus:bg-yellow-50 dark:focus:bg-yellow-950"
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <MailWarning className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium">Email não verificado</span>
              </div>
              <p className="text-xs text-muted-foreground pl-6">Verifique seu email para ativar a conta.</p>
              <button
                onClick={handleResendVerification}
                disabled={resending || resent}
                className="mt-1 ml-6 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
                {resent ? 'Email enviado!' : resending ? 'Enviando...' : 'Reenviar verificação'}
              </button>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => router.push('/change-password')}>
          <KeyRound className="mr-2 h-4 w-4" />
          Trocar senha
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
