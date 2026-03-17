'use client'

import { useEffect, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, AlertTriangle, CalendarClock } from 'lucide-react'
import { AddCreditsModal } from '@/components/credits/AddCreditsModal'
import { SubscriptionPaymentModal } from '@/components/credits/SubscriptionPaymentModal'
import { CreditBalance } from '@/lib/types'

export function CreditsBadge() {
  const { selectedTenant } = useTenant()
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showSub, setShowSub] = useState(false)

  useEffect(() => {
    if (!selectedTenant) return
    setBalance(null)
    api.get<CreditBalance>(`/credits/balance?tenant_id=${selectedTenant.tenant_id}`)
      .then(r => setBalance(r))
      .catch(() => {})
  }, [selectedTenant])

  if (balance === null) return null

  const credits = balance.tenant_credits ?? 0
  const isLow = credits <= 0
  const currentMonth = new Date().toISOString().slice(0, 7)
  const fee = selectedTenant?.tenant_subscription_fee ?? null
  const isSubOverdue = fee !== null &&
    !balance.subscriptions?.find(s => s.reference_month === currentMonth && s.status === 'paid')

  return (
    <>
      <div className="flex items-center gap-1">
        {isSubOverdue && (
          <button onClick={() => setShowSub(true)} className="focus:outline-none">
            <Badge
              variant="outline"
              className="gap-1 text-xs border-orange-500 text-orange-600 cursor-pointer hover:bg-orange-50"
            >
              <CalendarClock size={10} />
              Mensalidade em atraso
            </Badge>
          </button>
        )}
        {isLow ? (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertTriangle size={10} />
            Você está sem créditos, insira créditos
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs font-mono">
            R$ {credits.toFixed(2)}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowAdd(true)}
          title="Adicionar créditos"
        >
          <Plus size={12} />
        </Button>
      </div>
      {showAdd && (
        <AddCreditsModal
          onClose={() => setShowAdd(false)}
          onSuccess={c => setBalance(b => b ? { ...b, tenant_credits: c } : b)}
        />
      )}
      {showSub && fee !== null && (
        <SubscriptionPaymentModal
          onClose={() => setShowSub(false)}
          currentMonth={currentMonth}
          fee={fee}
        />
      )}
    </>
  )
}
