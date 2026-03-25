'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { isValidSlug, sanitizeSlug } from '@/lib/validators'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

export default function SetupWorkspacePage() {
  const { refreshUser } = useAuth()
  const { selectedTenant } = useTenant()
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (selectedTenant) {
      setName(selectedTenant.tenant_name)
      setDescription(selectedTenant.tenant_description || '')
      setSlug(selectedTenant.tenant_slug)
    }
  }, [selectedTenant])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }
    if (!slug) {
      setError('Identificador é obrigatório')
      return
    }
    if (!isValidSlug(slug)) {
      setError('Identificador deve conter apenas letras minúsculas, números e hífens')
      return
    }
    if (!selectedTenant) return

    setLoading(true)
    try {
      await api.post('/tenants-update', {
        tenant_id: selectedTenant.tenant_id,
        name: name.trim(),
        description: description.trim() || undefined,
        slug,
      })
      await refreshUser()
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar workspace'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configure seu workspace</CardTitle>
          <CardDescription>
            Personalize os dados do seu tenant. Você pode alterar isso depois em Configurações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome do workspace *</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Minha Empresa"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">
                Identificador *{' '}
                <span className="text-xs text-muted-foreground">(letras minúsculas, números e hífens)</span>
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={e => { setSlug(sanitizeSlug(e.target.value)); setError('') }}
                placeholder="minha-empresa"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descreva brevemente seu workspace"
                rows={2}
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar e continuar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                disabled={loading}
              >
                Pular
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
