'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { SystemSetting } from '@/lib/types'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export default function MasterSettingsPage() {
  const { user } = useAuth()
  const { selectedTenant } = useTenant()
  const router = useRouter()
  const isMaster = user?.user_is_master_admin && selectedTenant?.tenant_is_master

  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isMaster) { router.push('/dashboard'); return }
    api.get<{ settings: SystemSetting[] }>('/master-settings')
      .then(r => {
        const map: Record<string, string> = {}
        r.settings?.forEach(s => { map[s.setting_key] = s.setting_value })
        setSettings(map)
      })
      .catch(() => toast.error('Erro ao carregar configurações'))
      .finally(() => setLoading(false))
  }, [isMaster])

  const saveSetting = async (key: string, value: string) => {
    setSaving(true)
    try {
      await api.post('/master-settings', { key, value })
      toast.success('Configuração salva')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (!isMaster) return null

  const SETTINGS = [
    { key: 'default_ai_multiplier', label: 'Multiplicador de custo IA (padrão)', placeholder: '7.0' },
    { key: 'default_ai_fixed_fee', label: 'Taxa fixa de IA em R$ (padrão)', placeholder: '0.05' },
    { key: 'default_subscription_fee', label: 'Mensalidade padrão em R$', placeholder: '200.00' },
  ]

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Configurações Master</h1>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Configurações globais de IA</CardTitle>
            <CardDescription>Valores padrão usados quando um tenant não tem taxas específicas configuradas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {SETTINGS.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={settings[key] ?? ''}
                    onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                    placeholder={placeholder}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => saveSetting(key, settings[key] ?? '')}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
