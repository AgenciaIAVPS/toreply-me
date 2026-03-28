'use client'

import { useEffect, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddCreditsModal } from '@/components/credits/AddCreditsModal'
import { Zap, TrendingDown, TrendingUp, Plus } from 'lucide-react'

interface LedgerEntry {
  id: string
  type: 'deposit' | 'deduction'
  amount: number
  description: string
  date: string
}

interface BalanceData {
  balance: number
  total_deposited: number
  total_deducted: number
  ledger: LedgerEntry[]
}

export default function CreditsPage() {
  const { selectedTenant, selectedParent, isSubTenant } = useTenant()
  const [data, setData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = () => {
    if (!selectedTenant) return
    setLoading(true)
    let balanceUrl: string
    if (isSubTenant && selectedParent) {
      balanceUrl = `/credits/balance?rel_id=${selectedParent.rel_id}`
    } else {
      balanceUrl = `/credits/balance?tenant_id=${selectedTenant.tenant_id}`
    }
    api.get<BalanceData>(balanceUrl).then(setData).catch(() => toast.error('Erro ao carregar saldo')).finally(() => setLoading(false))
  }

  useEffect(() => { if (selectedTenant) load() }, [selectedTenant, selectedParent, isSubTenant])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Créditos</h1>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />Adicionar créditos
        </Button>
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando...</p> : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Saldo atual</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono">
                  R$ {data?.balance.toFixed(2) ?? '0,00'}
                </p>
                {(data?.balance ?? 0) <= 0 && (
                  <Badge variant="destructive" className="mt-1 text-xs">Sem créditos</Badge>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Total depositado</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-green-600">
                  R$ {data?.total_deposited.toFixed(2) ?? '0,00'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Total consumido</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-red-600">
                  R$ {data?.total_deducted.toFixed(2) ?? '0,00'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Histórico</h2>
            <div className="space-y-2">
              {data?.ledger.map(entry => (
                <div key={entry.id} className="flex items-center justify-between py-2 px-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    {entry.type === 'deposit'
                      ? <TrendingUp size={14} className="text-green-500" />
                      : <TrendingDown size={14} className="text-red-500" />}
                    <span className="text-sm">{entry.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono font-medium ${entry.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'deposit' ? '+' : ''}R$ {Math.abs(entry.amount).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
              {!data?.ledger.length && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma movimentação ainda.</p>
              )}
            </div>
          </div>
        </>
      )}

      {showAdd && (
        <AddCreditsModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => load()}
          tenantId={selectedTenant?.tenant_id}
        />
      )}
    </div>
  )
}
