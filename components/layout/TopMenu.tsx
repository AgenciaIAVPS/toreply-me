'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { UserMenu } from './UserMenu'
import { TenantSwitcher } from './TenantSwitcher'
import { CreditsBadge } from './CreditsBadge'
import { EmailBanner } from './EmailBanner'

export function TopMenu() {
  const { user, tenants } = useAuth()
  const { selectedTenant } = useTenant()
  const isAdmin = selectedTenant?.tenant_user_role === 'admin'
  const isMaster = user?.user_is_master_admin && selectedTenant?.tenant_is_master

  return (
    <>
      {user && !user.user_email_verified && <EmailBanner />}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="toreply.me"
              width={120}
              height={36}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            {selectedTenant && (
              <Link href="/users" className="text-muted-foreground hover:text-foreground transition-colors">
                Usuários
              </Link>
            )}
            {isMaster && (
              <Link href="/tenants" className="text-muted-foreground hover:text-foreground transition-colors">
                Tenants
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAdmin && <CreditsBadge />}
            {tenants.length > 1 && <TenantSwitcher />}
            <UserMenu />
          </div>
        </div>
      </header>
    </>
  )
}
