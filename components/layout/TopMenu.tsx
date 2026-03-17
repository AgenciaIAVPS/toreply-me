'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { UserMenu } from './UserMenu'
import { TenantSwitcher } from './TenantSwitcher'
import { CreditsBadge } from './CreditsBadge'
import { EmailBanner } from './EmailBanner'
import { Menu, X } from 'lucide-react'

export function TopMenu() {
  const { user, tenants } = useAuth()
  const { selectedTenant } = useTenant()
  const isAdmin = selectedTenant?.tenant_user_role === 'admin'
  const isMaster = user?.user_is_master_admin && selectedTenant?.tenant_is_master
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', show: true },
    { href: '/users', label: 'Usuários', show: !!selectedTenant },
    { href: '/tenants', label: 'Tenants', show: !!isMaster },
    { href: '/payments', label: 'Pagamentos', show: !!isAdmin },
    { href: '/settings', label: 'Configurações', show: !!selectedTenant },
  ]

  return (
    <>
      {user && !user.user_email_verified && <EmailBanner />}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            {selectedTenant?.tenant_logo_url && selectedTenant.tenant_logo_url !== 'null' ? (
              <Image
                src={selectedTenant.tenant_logo_url}
                alt={selectedTenant.tenant_name}
                width={200}
                height={44}
                className="object-contain max-h-8"
                unoptimized
              />
            ) : (
              <span className="font-semibold text-sm">toreply.me</span>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden min-[800px]:flex items-center gap-6 text-sm">
            {navLinks.filter(l => l.show).map(l => (
              <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAdmin && <CreditsBadge />}
            {tenants.length > 1 && <TenantSwitcher />}
            <UserMenu />
            <button
              className="max-[799px]:flex hidden p-1.5 rounded-md hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="max-[799px]:flex hidden border-t bg-background px-4 py-3 flex-col gap-3 text-sm">
            {navLinks.filter(l => l.show).map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground hover:text-foreground transition-colors py-1"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  )
}
