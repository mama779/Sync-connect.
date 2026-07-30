"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RemovedSalesLabPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/admin/marketing-links') }, [router])
  return null
}
