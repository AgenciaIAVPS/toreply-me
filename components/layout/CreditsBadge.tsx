'use client'

import { useEffect, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, AlertTriangle } from 'lucide-react'
import { AddCreditsModal } from '@/components/credits/AddCreditsModal'

export function CreditsBadge() {
  const { selectedTenant } = useTenant()
  const [credits, setCredits] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (!selectedTenant) return
    api.get<{ tenant_credits: number }>('/credits/balance')
      .then(r => setCredits(r?.tenant_credits ?? null))
      .catch(() => {})
  }, [selectedTenant])

  if (credits === null) return null

  const isLow = credits <= 0

  return (
    <>
      <div className="flex items-center gap-1">
        {isLow ? (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertTriangle size={10} />
            Sem créditos
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs font-mono">
            R$ {(credits ?? 0).toFixed(2)}
          </Badge>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAdd(true)} title="Adicionar créditos">
          <Plus size={12} />
        </Button>
      </div>
      {showAdd && <AddCreditsModal onClose={() => setShowAdd(false)} onSuccess={c => setCredits(c)} />}
    </>
  )
}
