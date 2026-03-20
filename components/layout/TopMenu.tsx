'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { UserMenu } from './UserMenu'
import { TenantSwitcher } from './TenantSwitcher'
import { CreditsBadge } from './CreditsBadge'
import { EmailBanner } from './EmailBanner'
import { Menu, X, ArrowLeftRight } from 'lucide-react'

export function TopMenu() {
  const { user, tenants } = useAuth()
  const { selectedTenant, selectedParent, isSubTenant } = useTenant()
  const router = useRouter()
  const isAdmin = selectedTenant?.tenant_user_role === 'admin'
  const isAgentsAdmin = selectedTenant?.tenant_user_role === 'agents_admin'
  const isMaster = user?.user_is_master_admin && selectedTenant?.tenant_is_master
  const isParent = selectedTenant?.tenant_is_parent
  const [mobileOpen, setMobileOpen] = useState(false)

  // Visual identity: sub-tenant sees parent's branding (RF-050/051/052/053)
  const displayName = isSubTenant && selectedParent
    ? selectedParent.rel_parent_tenant_name
    : selectedTenant?.tenant_name ?? 'toreply.me'

  const displayLogo = isSubTenant && selectedParent
    ? selectedParent.rel_parent_tenant_logo_url
    : selectedTenant?.tenant_logo_url

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', show: true },
    { href: '/users', label: 'Usuários', show: !!selectedTenant && (!isSubTenant || !!isAdmin) },
    { href: '/clients', label: 'Clientes', show: !!isAdmin && !isSubTenant && !!(isParent || isMaster) },
    { href: '/agents', label: 'Agentes', show: !!selectedTenant },
    { href: '/instances', label: 'Instâncias', show: !!selectedTenant && (!!isAdmin || !!isAgentsAdmin || !!isMaster) },
    { href: '/conversations', label: 'Conversas', show: !!selectedTenant },
    { href: '/contacts', label: 'Contatos', show: !!selectedTenant },
    { href: '/payments', label: 'Pagamentos', show: !!isAdmin },
    { href: '/tenants', label: 'Tenants', show: !!isMaster },
    { href: '/settings', label: 'Configurações', show: !!selectedTenant },
  ]

  return (
    <>
      {user && !user.user_email_verified && <EmailBanner />}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo / Brand */}
          <Link href="/dashboard" className="flex items-center gap-2">
            {displayLogo && displayLogo !== 'null' ? (
              <Image
                src={displayLogo}
                alt={displayName}
                width={200}
                height={44}
                className="object-contain max-h-8"
                unoptimized
              />
            ) : (
              <span className="font-semibold text-sm">{displayName}</span>
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
            {isSubTenant && (selectedTenant?.tenant_parents?.length ?? 0) > 1 && (
              <button
                onClick={() => {
                  localStorage.removeItem('trm_parent_rel_id')
                  router.push('/select-parent')
                }}
                title="Trocar de contexto"
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftRight size={16} />
              </button>
            )}
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
