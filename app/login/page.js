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
    <div style={{minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '2.5rem 2rem', width: '100%', maxWidth: '380px'}}>

        {/* Logo */}
        <div style={{textAlign: 'center', marginBottom: '2rem'}}>
          <div style={{width: '44px', height: '44px', borderRadius: '10px', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontSize: '22px'}}>⚜</div>
          <h1 style={{fontSize: '18px', fontWeight: 500, color: '#111', marginBottom: '4px'}}>Confraria</h1>
          <p style={{fontSize: '13px', color: '#9ca3af'}}>Gestão de famílias</p>
        </div>

        {/* Formulário */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem'}}>
          <div>
            <label style={{fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '4px'}}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              style={{width: '100%'}} autoFocus />
          </div>
          <div>
            <label style={{fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '4px'}}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              style={{width: '100%'}} />
          </div>
        </div>

        {erro && (
          <div style={{background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '13px', color: '#dc2626', marginBottom: '1rem'}}>
            {erro}
          </div>
        )}

        <button onClick={entrar} disabled={loading} style={{
          width: '100%', padding: '0.6rem', fontSize: '14px', fontWeight: 500,
          background: loading ? '#a5b4fc' : '#4f46e5', color: 'white',
          border: 'none', borderRadius: '8px', cursor: loading ? 'default' : 'pointer'
        }}>
          {loading ? 'A entrar...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}