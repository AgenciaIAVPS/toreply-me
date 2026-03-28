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
  const isSubscriptionClient = String(selectedTenant?.tenant_is_subscription_client) === 'true'
  const subPaidCurrentMonth = String(selectedTenant?.tenant_sub_paid_current_month) === 'true'
  const fee = selectedTenant?.tenant_subscription_fee
    ?? balance.subscriptions?.find(s => s.reference_month === currentMonth && s.status === 'pending')?.amount
    ?? null
  const isSubOverdue = isSubscriptionClient && !subPaidCurrentMonth

  return (
    <>
      <div className="flex items-center gap-1">
        {isSubOverdue && (
          <button onClick={() => setShowSub(true)} className="focus:outline-none">
            <span className="min-[800px]:hidden flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white cursor-pointer hover:opacity-90">
              <CalendarClock size={11} />
            </span>
            <Badge
              variant="outline"
              className="gap-1 text-xs border-orange-500 text-orange-600 cursor-pointer hover:bg-orange-50 hidden min-[800px]:inline-flex"
            >
              <CalendarClock size={10} />
              Mensalidade em atraso
            </Badge>
          </button>
        )}
        {isLow ? (
          <button onClick={() => setShowAdd(true)} className="focus:outline-none">
            <span className="min-[800px]:hidden flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground cursor-pointer hover:opacity-90">
              <AlertTriangle size={11} />
            </span>
            <Badge variant="destructive" className="gap-1 text-xs cursor-pointer hover:opacity-90 hidden min-[800px]:inline-flex">
              <AlertTriangle size={10} />
              Sem créditos
            </Badge>
          </button>
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
