'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MasterSettingsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/settings') }, [])
  return null
}
