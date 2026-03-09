'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const PRESETS = [5, 50, 100, 250]

interface Props {
  onClose: () => void
  onSuccess: (newBalance: number) => void
}

export function AddCreditsModal({ onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleCheckout = async (value: number) => {
    if (value < 5) {
      toast.error('Valor mínimo é R$ 5,00')
      return
    }
    setLoading(true)
    try {
      const res = await api.post<{ checkout_url: string }>('/payments/create', { amount: value })
      window.open(res.checkout_url, '_blank')
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar pagamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar créditos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione um valor ou insira um valor personalizado:
          </p>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map(p => (
              <Button
                key={p}
                variant="outline"
                onClick={() => handleCheckout(p)}
                disabled={loading}
                className="text-sm"
              >
                R$ {p}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Valor personalizado (R$)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="5"
                step="0.01"
                placeholder="Ex: 75.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <Button
                onClick={() => handleCheckout(parseFloat(amount))}
                disabled={loading || !amount}
              >
                Pagar
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Pagamento processado via MercadoPago. Os créditos serão adicionados automaticamente após confirmação.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
