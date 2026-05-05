'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'

export default function NovaFamilia() {
  const router = useRouter()
  const [lugares, setLugares] = useState([])
  const [freguesias, setFreguesias] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    chefe_nome: '',
    lugar_id: '',
    freguesia_id: '',
    morada: '',
    observacoes: '',
  })
  const [membros, setMembros] = useState([''])

  useEffect(() => {
    async function carregar() {
      const [lugRes, freqRes] = await Promise.all([
        supabase.from('lugares').select('id, nome').order('nome'),
        supabase.from('freguesias').select('id, nome').order('nome'),
      ])
      setLugares(lugRes.data || [])
      setFreguesias(freqRes.data || [])
    }
    carregar()
  }, [])

  function atualizarMembro(index, valor) {
    const novos = [...membros]
    novos[index] = valor
    setMembros(novos)
  }

  function adicionarLinhaMembro() {
    setMembros([...membros, ''])
  }

  function removerLinhaMembro(index) {
    setMembros(membros.filter((_, i) => i !== index))
  }

  async function guardar() {
    if (!form.chefe_nome.trim()) return alert('O nome do chefe de família é obrigatório.')
    setGuardando(true)

    const { data, error } = await supabase.from('familias').insert({
      chefe_nome: form.chefe_nome.trim().toUpperCase(),
      lugar_id: form.lugar_id || null,
      freguesia_id: form.freguesia_id || null,
      morada: form.morada || null,
      observacoes: form.observacoes || null,
    }).select().single()

    if (error) {
      alert('Erro ao guardar: ' + error.message)
      setGuardando(false)
      return
    }

    const membrosValidos = membros.filter(m => m.trim())
    if (membrosValidos.length > 0) {
      await supabase.from('familia_membros').insert(
        membrosValidos.map(nome => ({ familia_id: data.id, nome: nome.trim() }))
      )
    }

    await supabase.from('historico_alteracoes').insert({
      familia_id: data.id,
      tipo_alteracao: 'criacao',
      descricao: 'Família criada.',
    })

    router.push(`/familias/${data.id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">← Voltar</Link>
        <h1 className="text-2xl font-bold text-stone-800 mt-1">Nova Família</h1>
      </div>

      <div className="bg-white rounded shadow p-6 space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Chefe de Família *</label>
          <input value={form.chefe_nome} onChange={e => setForm({...form, chefe_nome: e.target.value})}
            placeholder="Nome completo"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lugar</label>
            <select value={form.lugar_id} onChange={e => setForm({...form, lugar_id: e.target.value})}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
              <option value="">— sem lugar —</option>
              {lugares.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Freguesia</label>
            <select value={form.freguesia_id} onChange={e => setForm({...form, freguesia_id: e.target.value})}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
              <option value="">— sem freguesia —</option>
              {freguesias.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Morada</label>
          <input value={form.morada} onChange={e => setForm({...form, morada: e.target.value})}
            placeholder="Rua, número, código postal"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Observações</label>
          <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}
            rows={3} placeholder="Notas adicionais"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
        </div>
      </div>

      <div className="bg-white rounded shadow p-6 space-y-3">
        <h2 className="font-semibold text-stone-700">Agregado Familiar</h2>
        {membros.map((m, i) => (
          <div key={i} className="flex gap-2">
            <input value={m} onChange={e => atualizarMembro(i, e.target.value)}
              placeholder={`Membro ${i + 1}`}
              className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
            {membros.length > 1 && (
              <button onClick={() => removerLinhaMembro(i)}
                className="text-red-400 hover:text-red-600 text-sm px-2">✕</button>
            )}
          </div>
        ))}
        <button onClick={adicionarLinhaMembro}
          className="text-sm text-stone-600 hover:text-stone-800 underline">
          + Adicionar membro
        </button>
      </div>

      <button onClick={guardar} disabled={guardando}
        className="w-full bg-stone-800 text-white py-3 rounded hover:bg-stone-700 font-medium disabled:opacity-50">
        {guardando ? 'A guardar...' : 'Criar Família'}
      </button>
    </div>
  )
}