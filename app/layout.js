import './globals.css'

export const metadata = {
  title: 'Confraria',
  description: 'Gestão da Confraria',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body className="bg-stone-50 text-stone-900 min-h-screen">
        <nav className="bg-stone-800 text-white px-6 py-4 flex items-center gap-6">
          <span className="font-bold text-lg tracking-wide">⚜ Confraria</span>
          <a href="/" className="text-stone-300 hover:text-white text-sm">Famílias</a>
          <a href="/familias/nova" className="text-stone-300 hover:text-white text-sm">+ Nova Família</a>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}