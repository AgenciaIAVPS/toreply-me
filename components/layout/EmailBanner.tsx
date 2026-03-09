'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'

export function EmailBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!user || user.user_email_verified || dismissed) return null

  const resend = async () => {
    setLoading(true)
    try {
      await api.post('/auth/resend-verification')
      toast.success('Email de verificação reenviado!')
    } catch {
      toast.error('Erro ao reenviar email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-yellow-800 text-sm">
        <AlertTriangle size={14} className="shrink-0" />
        <span>Email não verificado. Verifique sua caixa de entrada.</span>
        <Button
          variant="link"
          size="sm"
          className="text-yellow-800 underline p-0 h-auto text-sm"
          onClick={resend}
          disabled={loading}
        >
          {loading ? 'Enviando...' : 'Reenviar email'}
        </Button>
      </div>
      <button onClick={() => setDismissed(true)} className="text-yellow-600 hover:text-yellow-800">
        <X size={14} />
      </button>
    </div>
  )
}
