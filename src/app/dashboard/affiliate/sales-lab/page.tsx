"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RemovedSalesLabPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/affiliate/marketing-links') }, [router])
  return null
}
