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
      <body className="bg-stone-50 text-stone-900 min-h-screen">
        {isLogin ? children : (
          <AuthGuard setPerfil={setPerfil}>
            <nav className="bg-stone-800 text-white px-6 py-4 flex items-center gap-6">
              <span className="font-bold text-lg tracking-wide">⚜ Confraria</span>
              <a href="/" className="text-stone-300 hover:text-white text-sm">Famílias</a>
              {perfil?.papel === 'completo' && (
                <>
                  <a href="/familias/nova" className="text-stone-300 hover:text-white text-sm">+ Nova Família</a>
                  <a href="/configuracoes" className="text-stone-300 hover:text-white text-sm">Configurações</a>
                  <a href="/cotas" className="text-stone-300 hover:text-white text-sm">Cotas</a>
				</>
              )}
              <div className="ml-auto flex items-center gap-4">
                <span className="text-stone-400 text-xs">{perfil?.user?.email}</span>
                <button onClick={logout} className="text-stone-300 hover:text-white text-xs">Sair</button>
              </div>
            </nav>
            <main className="max-w-5xl mx-auto px-4 py-8">
              {children}
            </main>
          </AuthGuard>
        )}
      </body>
    </html>
  )
}