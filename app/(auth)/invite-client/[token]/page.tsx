'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { PasswordStrength, validatePassword } from '@/components/auth/PasswordStrength'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { AuthResponse } from '@/lib/types'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  tenant_name: z.string().min(2, 'Nome da empresa deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().refine(validatePassword, 'Senha não atende aos requisitos'),
  confirmPassword: z.string(),
  tosAccepted: z.literal(true, { message: 'Você deve aceitar os termos de uso' }),
}).refine(d => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function InviteClientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [tosUrl, setTosUrl] = useState('')

  useEffect(() => {
    api.get<{ tos_url?: string }>('/system-config', { auth: false })
      .then(d => { if (d.tos_url) setTosUrl(d.tos_url) })
      .catch(() => {})
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await api.post<AuthResponse>('/auth/register-client', {
        name: data.name,
        tenant_name: data.tenant_name,
        email: data.email,
        password: data.password,
        invite_token: token,
      }, { auth: false })
      login(res)
      router.push('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta de cliente</CardTitle>
        <CardDescription>Você foi convidado. Preencha os dados para começar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" placeholder="Seu nome" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="tenant_name">Nome da empresa</Label>
            <Input id="tenant_name" placeholder="Nome da sua empresa" {...register('tenant_name')} />
            {errors.tenant_name && <p className="text-xs text-destructive">{errors.tenant_name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              {...register('password', { onChange: e => setPassword(e.target.value) })}
            />
            <PasswordStrength password={password} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <PasswordInput id="confirmPassword" placeholder="••••••••" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="tosAccepted"
                className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                {...register('tosAccepted')}
              />
              <Label htmlFor="tosAccepted" className="text-sm leading-relaxed cursor-pointer font-normal">
                Concordo com os{' '}
                <a
                  href={tosUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary font-medium"
                  onClick={e => { if (!tosUrl) e.preventDefault() }}
                >
                  termos de uso
                </a>
                {' '}do serviço
              </Label>
            </div>
            {errors.tosAccepted && <p className="text-xs text-destructive">{errors.tosAccepted.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta e entrar'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">Entrar</Link>
        </p>
      </CardFooter>
    </Card>
  )
}
