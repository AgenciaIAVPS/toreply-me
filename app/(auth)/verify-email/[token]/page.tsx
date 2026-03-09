'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

export default function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get<{ message: string }>(`/auth/verify-email?token=${token}`, { auth: false })
      .then(res => {
        setStatus('success')
        setMessage(res.message || 'Email verificado com sucesso!')
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.message || 'Link inválido ou expirado.')
      })
  }, [token])

  return (
    <Card>
      <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando seu email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div>
              <p className="font-medium">{message}</p>
              <p className="text-sm text-muted-foreground mt-1">Sua conta está ativa.</p>
            </div>
            <Link href="/login" className="text-sm text-primary hover:underline font-medium">
              Ir para o login
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive" />
            <div>
              <p className="font-medium">Erro na verificação</p>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Voltar para o login
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
