'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MasterUsersRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/users') }, [])
  return null
}
