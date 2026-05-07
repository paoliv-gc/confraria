'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getPerfil } from '../lib/auth'
import Link from 'next/link'

function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(val) {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val))
    else onChange([...selected, val])
  }

  function selectAll() { onChange(options.map(o => o.value)) }
  function clearAll() { onChange([]) }

  const label_text = selected.length === 0
    ? `Todas as ${label}`
    : selected.length === options.length
    ? `Todas as ${label}`
    : `${selected.length} ${label} seleccionada${selected.length > 1 ? 's' : ''}`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`border rounded px-3 py-2 text-sm text-left min-w-[180px] flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-stone-400 ${selected.length > 0 && selected.length < options.length ? 'border-stone-500 bg-stone-50' : 'border-gray-300 bg-white'}`}>
        <span className="truncate">{label_text}</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded shadow-lg min-w-[220px] max-h-72 overflow-y-auto">
          <div className="flex gap-2 px-3 py-2 border-b border-gray-100">
            <button onClick={selectAll} className="text-xs text-stone-600 hover:text-stone-800 underline">Todas</button>
            <span className="text-gray-300">|</span>
            <button onClick={clearAll} className="text-xs text-stone-600 hover:text-stone-800 underline">Nenhuma</button>
          </div>
          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 px-3 py-2 hover:bg-stone-50 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="accent-stone-700"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [familias, setFamilias] = useState([])
  const [membros, setMembros] = useState([])
  const [lugares, setLugares] = useState([])
  const [freguesias, setFreguesias] = useState([])
  const [pesquisa, setPesquisa] = useState('')
  const [filtroLugares, setFiltroLugares] = useState([])
  const [filtroFreguesias, setFiltroFreguesias] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState(null)

  const podeEditar = perfil?.papel === 'completo'

  useEffect(() => {
    async function init() {
      const p = await getPerfil()
      setPerfil(p)
      await carregarTudo()
    }
    init()
  }, [])

  async function carregarTudo() {
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
    if (filtroLugares.length > 0 && !filtroLugares.includes(f.lugar?.id?.toString())) return false
    if (filtroFreguesias.length > 0 && !filtroFreguesias.includes(f.freguesia?.id?.toString())) return false
    if (filtroEstado === 'ativa' && !f.ativo) return false
    if (filtroEstado === 'inativa' && f.ativo) return false
    return true
  })

  const membrosFiltrados = termo
    ? membros.filter(m => m.nome.toLowerCase().includes(termo))
    : []

  const temFiltros = filtroLugares.length > 0 || filtroFreguesias.length > 0 || filtroEstado

  function limparFiltros() {
    setFiltroLugares([])
    setFiltroFreguesias([])
    setFiltroEstado('')
  }

  const lugaresOpts = lugares.map(l => ({ value: l.id.toString(), label: l.nome }))
  const freguesiasOpts = freguesias.map(f => ({ value: f.id.toString(), label: f.nome }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Famílias</h1>
        {podeEditar && (
          <Link href="/familias/nova"
            className="bg-stone-800 text-white px-4 py-2 rounded hover:bg-stone-700 text-sm">
            + Nova Família
          </Link>
        )}
      </div>

      <input
        type="text"
        placeholder="Pesquisar por nome do chefe ou membro..."
        value={pesquisa}
        onChange={e => setPesquisa(e.target.value)}
        className="w-full border border-gray-300 rounded px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-stone-400"
      />

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <MultiSelect
          label="freguesias"
          options={freguesiasOpts}
          selected={filtroFreguesias}
          onChange={setFiltroFreguesias}
        />
        <MultiSelect
          label="lugares"
          options={lugaresOpts}
          selected={filtroLugares}
          onChange={setFiltroLugares}
        />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white">
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