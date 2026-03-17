'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useTenant } from '@/contexts/TenantContext'

interface Props {
  onClose: () => void
  currentMonth: string
  fee: number
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function SubscriptionPaymentModal({ onClose, currentMonth, fee }: Props) {
  const { selectedTenant } = useTenant()
  const [loading, setLoading] = useState(false)

  const [year, month] = currentMonth.split('-')
  const displayMonth = `${MONTH_NAMES[parseInt(month) - 1]}/${year}`

  const handlePay = async () => {
    setLoading(true)
    try {
      const res = await api.post<{ checkout_url: string }>('/payments/create', {
        amount: fee,
        payment_type: 'subscription',
        reference_month: currentMonth,
        tenant_id: selectedTenant?.tenant_id,
      })
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pagar mensalidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Mensalidade referente a <strong>{displayMonth}</strong>
          </p>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">R$ {fee.toFixed(2)}</p>
          </div>
          <Button className="w-full" onClick={handlePay} disabled={loading}>
            {loading ? 'Aguarde...' : 'Pagar via MercadoPago'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            O status será atualizado automaticamente após confirmação do pagamento.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
