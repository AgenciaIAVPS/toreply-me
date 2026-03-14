'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { CreditBalance } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2 } from 'lucide-react'

export default function PaymentsPage() {
  const { selectedTenant } = useTenant()
  const router = useRouter()
  const isAdmin = selectedTenant?.tenant_user_role === 'admin'

  const [data, setData] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin) { router.push('/dashboard'); return }
    if (!selectedTenant) return
    api.get<CreditBalance>(`/credits/balance?tenant_id=${selectedTenant.tenant_id}`)
      .then(r => setData(r))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedTenant, isAdmin])

  if (!isAdmin) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) return <p className="text-sm text-muted-foreground">Erro ao carregar dados financeiros.</p>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">Histórico financeiro do tenant {selectedTenant?.tenant_name}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo atual</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className={`text-xl font-bold ${data.balance < 0 ? 'text-destructive' : ''}`}>
              R$ {data.balance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total depositado</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-xl font-bold text-green-600">R$ {data.total_deposited.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total consumido</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-xl font-bold text-orange-600">R$ {data.total_deducted.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subs">
        <TabsList>
          <TabsTrigger value="subs">Mensalidades</TabsTrigger>
          <TabsTrigger value="credits">Créditos</TabsTrigger>
          <TabsTrigger value="ai">Custos de IA</TabsTrigger>
        </TabsList>

        {/* Subscriptions */}
        <TabsContent value="subs" className="mt-3">
          <Card>
            <CardContent className="p-0">
              {data.subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-6">Nenhuma mensalidade registrada.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Mês</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Origem</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Data pag.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subscriptions.map(s => (
                      <tr key={s.sub_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono">{s.reference_month}</td>
                        <td className="px-4 py-2">R$ {s.amount.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <Badge variant={s.status === 'paid' ? 'secondary' : 'outline'}>
                            {s.status === 'paid' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {s.origin === 'manual' ? 'Inserido manualmente' : 'Pago online'}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {s.date_paid ? new Date(s.date_paid).toLocaleDateString('pt-BR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits deposits */}
        <TabsContent value="credits" className="mt-3">
          <Card>
            <CardContent className="p-0">
              {data.ledger.filter(l => l.type === 'deposit').length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-6">Nenhum crédito adicionado.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Data</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ledger.filter(l => l.type === 'deposit').map(l => (
                      <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 text-muted-foreground">{new Date(l.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-2 text-green-600 font-medium">+ R$ {l.amount.toFixed(2)}</td>
                        <td className="px-4 py-2">{l.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI costs by day */}
        <TabsContent value="ai" className="mt-3">
          <Card>
            <CardContent className="p-0">
              {data.ai_costs.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-6">Nenhum custo de IA registrado.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Dia</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Custo total (R$)</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Chamadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ai_costs.map(c => (
                      <tr key={c.date} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono">{new Date(c.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-2 text-orange-600">R$ {c.total_deduction.toFixed(4)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
