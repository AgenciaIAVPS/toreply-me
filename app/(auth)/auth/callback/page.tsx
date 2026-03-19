'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { User, Tenant } from '@/lib/types'
import { toast } from 'sonner'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    const isNewAccount = searchParams.get('new_account') === '1'

    if (!token) {
      toast.error('Falha na autenticação com Google')
      router.push('/login')
      return
    }

    localStorage.setItem('trm_token', token)
    api.get<{ user: User; tenants: Tenant[] }>('/auth/me')
      .then(res => {
        login({ token, user: res.user, tenants: res.tenants })
        if (isNewAccount && res.tenants.length === 1) {
          // New Google user — redirect to setup to configure workspace name/slug/logo
          router.push('/setup')
        } else if (res.tenants.length <= 1) {
          router.push('/dashboard')
        } else {
          router.push('/select-tenant')
        }
      })
      .catch(() => {
        localStorage.removeItem('trm_token')
        toast.error('Falha ao carregar dados do usuário')
        router.push('/login')
      })
  }, [searchParams, login, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Autenticando com Google...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
