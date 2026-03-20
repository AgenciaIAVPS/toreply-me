'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { api } from '@/lib/api'
import { AuthResponse } from '@/lib/types'
import { CheckCircle, Loader2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
  tos: z.literal(true, { message: 'Aceite os Termos de Serviço para continuar' }),
})
type FormData = z.infer<typeof schema>

const DEVICE_API_URL = process.env.NEXT_PUBLIC_DEVICE_API_URL || 'https://device.toreply.me'

function DeviceAuthForm() {
  const searchParams = useSearchParams()
  const connectionUid = searchParams.get('connection_uid') || ''

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!connectionUid) {
      toast.error('connection_uid ausente na URL')
      return
    }
    setLoading(true)
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email: data.email, password: data.password }, { auth: false })

      if (!res.tenants || res.tenants.length === 0) {
        toast.error('Nenhum workspace encontrado para este usuário.')
        return
      }

      const tenant = res.tenants[0]

      // POST to UnaragConsole device API
      await fetch(`${DEVICE_API_URL}/webhook/device-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.tenant_id,
          user_id: res.user.user_id,
          connection_uid: connectionUid,
        }),
      })

      setSuccess(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const redirect = encodeURIComponent(`/device-authentication?connection_uid=${connectionUid}`)
    window.location.href = `${apiUrl}/auth/google?redirect=${redirect}`
  }

  if (success) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-9 w-9 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Autenticado com sucesso!</p>
              <p className="text-sm text-muted-foreground mt-1">Você pode fechar esta janela e voltar ao console.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autenticação do Dispositivo</CardTitle>
        <CardDescription>
          Entre com sua conta toreply.me para autorizar o console local.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!connectionUid && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            Parâmetro <code>connection_uid</code> não encontrado na URL. Reabra o link a partir do console.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <PasswordInput id="password" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="tos"
              {...register('tos')}
              className="mt-0.5 rounded"
            />
            <label htmlFor="tos" className="text-sm text-muted-foreground cursor-pointer">
              Li e aceito os{' '}
              <a href="https://toreply.me/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Termos de Serviço
              </a>
            </label>
          </div>
          {errors.tos && <p className="text-xs text-destructive">{errors.tos.message}</p>}

          <Button type="submit" className="w-full" disabled={loading || !connectionUid}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Autenticando...</> : 'Entrar e Autorizar'}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleLogin} type="button" disabled={!connectionUid}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Entrar com Google
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DeviceAuthenticationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <DeviceAuthForm />
    </Suspense>
  )
}
