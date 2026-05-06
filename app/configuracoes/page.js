'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Configuracoes() {
  const [lugares, setLugares] = useState([])
  const [freguesias, setFreguesias] = useState([])
  const [novoLugar, setNovoLugar] = useState('')
  const [novaFreguesia, setNovaFreguesia] = useState('')
  const [editandoLugar, setEditandoLugar] = useState(null)
  const [editandoFreguesia, setEditandoFreguesia] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [l, f] = await Promise.all([
      supabase.from('lugares').select('*').order('nome'),
      supabase.from('freguesias').select('*').order('nome'),
    ])
    setLugares(l.data || [])
    setFreguesias(f.data || [])
  }

  async function adicionarLugar() {
    if (!novoLugar.trim()) return
    await supabase.from('lugares').insert({ nome: novoLugar.trim() })
    setNovoLugar('')
    carregar()
  }

  async function adicionarFreguesia() {
    if (!novaFreguesia.trim()) return
    await supabase.from('freguesias').insert({ nome: novaFreguesia.trim() })
    setNovaFreguesia('')
    carregar()
  }

  async function guardarLugar(id, nome) {
    if (!nome.trim()) return
    await supabase.from('lugares').update({ nome: nome.trim() }).eq('id', id)
    setEditandoLugar(null)
    carregar()
  }

  async function guardarFreguesia(id, nome) {
    if (!nome.trim()) return
    await supabase.from('freguesias').update({ nome: nome.trim() }).eq('id', id)
    setEditandoFreguesia(null)
    carregar()
  }

  async function apagarLugar(id, nome) {
    if (!confirm(`Apagar "${nome}"? As famílias associadas ficarão sem lugar.`)) return
    await supabase.from('lugares').delete().eq('id', id)
    carregar()
  }

  async function apagarFreguesia(id, nome) {
    if (!confirm(`Apagar "${nome}"? As famílias associadas ficarão sem freguesia.`)) return
    await supabase.from('freguesias').delete().eq('id', id)
    carregar()
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-stone-800">Configurações</h1>

      {/* Lugares */}
      <div className="bg-white rounded shadow p-6">
        <h2 className="font-semibold text-stone-700 mb-4">Lugares</h2>

        <div className="flex gap-2 mb-4">
          <input value={novoLugar} onChange={e => setNovoLugar(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionarLugar()}
            placeholder="Novo lugar..."
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
          <button onClick={adicionarLugar}
            className="bg-stone-800 text-white px-4 py-2 rounded hover:bg-stone-700 text-sm">
            Adicionar
          </button>
        </div>

        <ul className="divide-y divide-gray-100">
          {lugares.map(l => (
            <li key={l.id} className="flex items-center justify-between py-2">
              {editandoLugar?.id === l.id ? (
                <div className="flex gap-2 flex-1">
                  <input value={editandoLugar.nome}
                    onChange={e => setEditandoLugar({...editandoLugar, nome: e.target.value})}
                    onKeyDown={e => e.key === 'Enter' && guardarLugar(l.id, editandoLugar.nome)}
                    className="flex-1 border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                  <button onClick={() => guardarLugar(l.id, editandoLugar.nome)}
                    className="text-green-600 hover:text-green-800 text-sm">guardar</button>
                  <button onClick={() => setEditandoLugar(null)}
                    className="text-gray-400 hover:text-gray-600 text-sm">cancelar</button>
                </div>
              ) : (
                <>
                  <span className="text-sm">{l.nome}</span>
                  <div className="flex gap-3">
                    <button onClick={() => setEditandoLugar({id: l.id, nome: l.nome})}
                      className="text-stone-500 hover:text-stone-700 text-xs">editar</button>
                    <button onClick={() => apagarLugar(l.id, l.nome)}
                      className="text-red-400 hover:text-red-600 text-xs">apagar</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Freguesias */}
      <div className="bg-white rounded shadow p-6">
        <h2 className="font-semibold text-stone-700 mb-4">Freguesias</h2>

        <div className="flex gap-2 mb-4">
          <input value={novaFreguesia} onChange={e => setNovaFreguesia(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionarFreguesia()}
            placeholder="Nova freguesia..."
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
          <button onClick={adicionarFreguesia}
            className="bg-stone-800 text-white px-4 py-2 rounded hover:bg-stone-700 text-sm">
            Adicionar
          </button>
        </div>

        <ul className="divide-y divide-gray-100">
          {freguesias.map(f => (
            <li key={f.id} className="flex items-center justify-between py-2">
              {editandoFreguesia?.id === f.id ? (
                <div className="flex gap-2 flex-1">
                  <input value={editandoFreguesia.nome}
                    onChange={e => setEditandoFreguesia({...editandoFreguesia, nome: e.target.value})}
                    onKeyDown={e => e.key === 'Enter' && guardarFreguesia(f.id, editandoFreguesia.nome)}
                    className="flex-1 border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                  <button onClick={() => guardarFreguesia(f.id, editandoFreguesia.nome)}
                    className="text-green-600 hover:text-green-800 text-sm">guardar</button>
                  <button onClick={() => setEditandoFreguesia(null)}
                    className="text-gray-400 hover:text-gray-600 text-sm">cancelar</button>
                </div>
              ) : (
                <>
                  <span className="text-sm">{f.nome}</span>
                  <div className="flex gap-3">
                    <button onClick={() => setEditandoFreguesia({id: f.id, nome: f.nome})}
                      className="text-stone-500 hover:text-stone-700 text-xs">editar</button>
                    <button onClick={() => apagarFreguesia(f.id, f.nome)}
                      className="text-red-400 hover:text-red-600 text-xs">apagar</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}