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

export default function SetupPage() {
  const { refreshUser } = useAuth()
  const { selectedTenant } = useTenant()
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pre-populate with existing tenant data
  useEffect(() => {
    if (!selectedTenant) return
    setName(selectedTenant.tenant_name || '')
    setSlug(selectedTenant.tenant_slug || '')
    setDescription(selectedTenant.tenant_description || '')
    const logo = selectedTenant.tenant_logo_url
    setLogoUrl((logo && logo !== 'null') ? logo : '')
  }, [selectedTenant])

  function handleSlugChange(value: string) {
    setSlug(sanitizeSlug(value))
  }

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
    if (!selectedTenant) {
      setError('Nenhum workspace encontrado')
      return
    }

    setLoading(true)
    try {
      await api.post('/tenants-self-update', {
        tenant_id: selectedTenant.tenant_id,
        name: name.trim(),
        description: description.trim() || undefined,
        slug,
        logo_url: logoUrl.trim() || undefined,
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

  function handleSkip() {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configure seu workspace</CardTitle>
          <CardDescription>
            Personalize o nome e as informações do seu workspace antes de começar.
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
                onChange={e => handleSlugChange(e.target.value)}
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

            <div className="space-y-1.5">
              <Label htmlFor="logo">URL da logo <span className="text-xs text-muted-foreground">(200×44px)</span></Label>
              <Input
                id="logo"
                type="url"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..."
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar e continuar
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleSkip}
              disabled={loading}
            >
              Pular por agora
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
