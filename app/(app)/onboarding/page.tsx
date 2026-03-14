'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { isValidSlug, sanitizeSlug } from '@/lib/validators'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const { refreshUser } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      setError('Identificador deve conter apenas letras minúsculas e hífens')
      return
    }

    setLoading(true)
    try {
      await api.post('/tenants-self-create', {
        name: name.trim(),
        description: description.trim() || undefined,
        slug,
        logo_url: logoUrl.trim() || undefined,
      })
      await refreshUser()
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar workspace'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar seu workspace</CardTitle>
          <CardDescription>
            Configure o seu primeiro workspace para começar a usar o toreply.me
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
                <span className="text-xs text-muted-foreground">(apenas letras minúsculas e hífens)</span>
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
              Criar workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
