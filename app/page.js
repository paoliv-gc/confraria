'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

export default function Home() {
  const [familias, setFamilias] = useState([])
  const [pesquisa, setPesquisa] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarFamilias()
  }, [])

  async function carregarFamilias() {
    setLoading(true)
    const { data, error } = await supabase
      .from('familias')
      .select(`
        id, chefe_nome, ativo,
        lugar:lugar_id(nome),
        freguesia:freguesia_id(nome),
        familia_membros(id)
      `)
      .order('chefe_nome')

    if (error) console.error(error)
    if (!error) setFamilias(data)
    setLoading(false)
  }

  const filtradas = familias.filter(f =>
    f.chefe_nome.toLowerCase().includes(pesquisa.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Famílias</h1>
        <Link href="/familias/nova"
          className="bg-stone-800 text-white px-4 py-2 rounded hover:bg-stone-700 text-sm">
          + Nova Família
        </Link>
      </div>

      <input
        type="text"
        placeholder="Pesquisar por nome..."
        value={pesquisa}
        onChange={e => setPesquisa(e.target.value)}
        className="w-full border border-gray-300 rounded px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-stone-400"
      />

      {loading ? (
        <p className="text-gray-500">A carregar...</p>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-stone-600 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Lugar</th>
                <th className="text-left px-4 py-3">Freguesia</th>
                <th className="text-center px-4 py-3">Membros</th>
                <th className="text-center px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <tr key={f.id}
                  className={`border-t border-gray-100 hover:bg-stone-50 cursor-pointer ${!f.ativo ? 'opacity-50' : ''}`}
                  onClick={() => window.location.href = `/familias/${f.id}`}>
                  <td className="px-4 py-3 font-medium">{f.chefe_nome}</td>
                  <td className="px-4 py-3 text-gray-600">{f.lugar?.nome || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{f.freguesia?.nome || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{f.familia_membros?.length || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${f.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {f.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">
            {filtradas.length} família{filtradas.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}