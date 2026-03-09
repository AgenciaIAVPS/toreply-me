'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LogOut, KeyRound, Building2 } from 'lucide-react'
import { api } from '@/lib/api'

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export function UserMenu() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { selectedTenant } = useTenant()

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    logout()
    router.push('/login')
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={user.user_avatar_url || ''} alt={user.user_name} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {getInitials(user.user_name)}
            </AvatarFallback>
          </Avatar>
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
