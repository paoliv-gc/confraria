'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from './supabase'

export default function AuthGuard({ children, setPerfil }) {
  const router = useRouter()
  const pathname = usePathname()
  const [verificado, setVerificado] = useState(false)

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('perfis')
        .select('papel')
        .eq('id', user.id)
        .single()

      setPerfil({ user, papel: data?.papel || 'leitura' })
      setVerificado(true)
    }
    verificar()
  }, [pathname])

  if (!verificado) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">A verificar sessão...</p>
    </div>
  )

  return children
}