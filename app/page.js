'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

export default function Home() {
  const [familias, setFamilias] = useState([])
  const [membros, setMembros] = useState([])
  const [lugares, setLugares] = useState([])
  const [freguesias, setFreguesias] = useState([])
  const [pesquisa, setPesquisa] = useState('')
  const [filtroLugar, setFiltroLugar] = useState('')
  const [filtroFreguesia, setFiltroFreguesia] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregarTudo() }, [])

  async function carregarTudo() {
    setLoading(true)
    const [famRes, memRes, lugRes, freqRes] = await Promise.all([
      supabase.from('familias').select(`id, chefe_nome, ativo, lugar:lugar_id(id,nome), freguesia:freguesia_id(id,nome), familia_membros(id)`).order('chefe_nome'),
      supabase.from('familia_membros').select('id, nome, familia_id, familias(id, chefe_nome)').order('nome'),
      supabase.from('lugares').select('id, nome').order('nome'),
      supabase.from('freguesias').select('id, nome').order('nome'),
    ])
    if (!famRes.error) setFamilias(famRes.data)
    if (!memRes.error) setMembros(memRes.data)
    setLugares(lugRes.data || [])
    setFreguesias(freqRes.data || [])
    setLoading(false)
  }

  const termo = pesquisa.toLowerCase().trim()

  const familiasFiltradas = familias.filter(f => {
    if (termo && !f.chefe_nome.toLowerCase().includes(termo)) return false
    if (filtroLugar && f.lugar?.id !== parseInt(filtroLugar)) return false
    if (filtroFreguesia && f.freguesia?.id !== parseInt(filtroFreguesia)) return false
    if (filtroEstado === 'ativa' && !f.ativo) return false
    if (filtroEstado === 'inativa' && f.ativo) return false
    return true
  })

  const membrosFiltrados = termo
    ? membros.filter(m => m.nome.toLowerCase().includes(termo))
    : []

  const temFiltros = filtroLugar || filtroFreguesia || filtroEstado

  function limparFiltros() {
    setFiltroLugar('')
    setFiltroFreguesia('')
    setFiltroEstado('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Famílias</h1>
        <Link href="/familias/nova"
          className="bg-stone-800 text-white px-4 py-2 rounded hover:bg-stone-700 text-sm">
          + Nova Família
        </Link>
      </div>

      {/* Pesquisa */}
      <input
        type="text"
        placeholder="Pesquisar por nome do chefe ou membro..."
        value={pesquisa}
        onChange={e => setPesquisa(e.target.value)}
        className="w-full border border-gray-300 rounded px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-stone-400"
      />

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={filtroFreguesia} onChange={e => setFiltroFreguesia(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
          <option value="">Todas as freguesias</option>
          {freguesias.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>

        <select value={filtroLugar} onChange={e => setFiltroLugar(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
          <option value="">Todos os lugares</option>
          {lugares.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>

        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
          <option value="">Todos os estados</option>
          <option value="ativa">Ativas</option>
          <option value="inativa">Inativas</option>
        </select>

        {temFiltros && (
          <button onClick={limparFiltros}
            className="text-sm text-stone-500 hover:text-stone-700 underline px-2">
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">A carregar...</p>
      ) : (
        <>
          {/* Resultados de membros */}
          {termo && membrosFiltrados.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded shadow mb-6 overflow-hidden">
              <div className="px-4 py-2 bg-amber-100 text-amber-800 text-xs font-semibold uppercase">
                Membros do agregado ({membrosFiltrados.length})
              </div>
              <ul className="divide-y divide-amber-100">
                {membrosFiltrados.map(m => (
                  <li key={m.id}>
                    <Link href={`/familias/${m.familia_id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-amber-100 text-sm">
                      <span className="text-stone-800">{m.nome}</span>
                      <span className="text-stone-500 text-xs">família de {m.familias?.chefe_nome} →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tabela de famílias */}
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
                {familiasFiltradas.map((f) => (
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
              {familiasFiltradas.length} família{familiasFiltradas.length !== 1 ? 's' : ''}
              {temFiltros && ' (filtrado)'}
            </div>
          </div>
        </>
      )}
    </div>
  )
}