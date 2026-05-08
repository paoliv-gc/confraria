'use client'

import './globals.css'
import { useState } from 'react'
import AuthGuard from '../lib/AuthGuard'
import { usePathname } from 'next/navigation'
import { logout } from '../lib/auth'

export default function RootLayout({ children }) {
  const [perfil, setPerfil] = useState(null)
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  return (
    <html lang="pt">
      <body className="min-h-screen" style={{background: '#f8fafc', color: '#111'}}>
        {isLogin ? children : (
          <AuthGuard setPerfil={setPerfil}>
            <nav style={{background: 'white', borderBottom: '1px solid #e5e7eb', height: '48px', display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: '1.5rem', position: 'sticky', top: 0, zIndex: 50}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: '#111'}}>
                <div style={{width: '9px', height: '9px', borderRadius: '50%', background: '#4f46e5'}}></div>
                Confraria
              </div>
              <a href="/" style={{fontSize: '13px', color: pathname === '/' ? '#4f46e5' : '#9ca3af', textDecoration: 'none', borderBottom: pathname === '/' ? '2px solid #4f46e5' : 'none', paddingBottom: pathname === '/' ? '2px' : '0'}}>Famílias</a>
              <a href="/cotas" style={{fontSize: '13px', color: pathname === '/cotas' ? '#4f46e5' : '#9ca3af', textDecoration: 'none', borderBottom: pathname === '/cotas' ? '2px solid #4f46e5' : 'none', paddingBottom: pathname === '/cotas' ? '2px' : '0'}}>Cotas</a>
              {perfil?.papel === 'completo' && (
                <>
                  <a href="/familias/nova" style={{fontSize: '13px', color: pathname === '/familias/nova' ? '#4f46e5' : '#9ca3af', textDecoration: 'none'}}>+ Nova Família</a>
                  <a href="/configuracoes" style={{fontSize: '13px', color: pathname === '/configuracoes' ? '#4f46e5' : '#9ca3af', textDecoration: 'none'}}>Configurações</a>
				  <a href="/relatorios" style={{fontSize: '13px', color: pathname === '/relatorios' ? '#4f46e5' : '#9ca3af', textDecoration: 'none', borderBottom: pathname === '/relatorios' ? '2px solid #4f46e5' : 'none', paddingBottom: pathname === '/relatorios' ? '2px' : '0'}}>Relatórios</a>
				</>
              )}
              <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <span style={{fontSize: '12px', color: '#9ca3af'}}>{perfil?.user?.email}</span>
                <button onClick={logout} style={{fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer'}}>Sair</button>
              </div>
            </nav>
            <main style={{maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem'}}>
              {children}
            </main>
          </AuthGuard>
        )}
      </body>
    </html>
  )
}