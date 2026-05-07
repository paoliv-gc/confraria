'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar() {
    setLoading(true)
    setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErro('Email ou password incorrectos.')
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      <div className="bg-white rounded shadow p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="text-3xl mb-2">⚜</div>
          <h1 className="text-xl font-bold text-stone-800">Confraria</h1>
          <p className="text-sm text-gray-500">Gestão de famílias</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>
        </div>

        {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}

        <button onClick={entrar} disabled={loading}
          className="w-full bg-stone-800 text-white py-2 rounded hover:bg-stone-700 font-medium disabled:opacity-50">
          {loading ? 'A entrar...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}