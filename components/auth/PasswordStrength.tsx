'use client'

import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Rule {
  label: string
  test: (v: string) => boolean
}

const rules: Rule[] = [
  { label: 'Mínimo 8 caracteres', test: v => v.length >= 8 },
  { label: 'Pelo menos 1 letra maiúscula', test: v => /[A-Z]/.test(v) },
  { label: 'Pelo menos 1 caractere especial (!@#$%...)', test: v => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v) },
]

export function validatePassword(password: string): boolean {
  return rules.every(r => r.test(password))
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  return (
    <ul className="mt-2 space-y-1">
      {rules.map(rule => {
        const ok = rule.test(password)
        return (
          <li key={rule.label} className={cn('flex items-center gap-2 text-xs', ok ? 'text-green-600' : 'text-muted-foreground')}>
            {ok ? <Check size={12} className="shrink-0" /> : <X size={12} className="shrink-0" />}
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
