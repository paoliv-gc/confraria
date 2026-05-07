'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getPerfil } from '../../../lib/auth'
import Link from 'next/link'

export default function DetalheFamily() {
  const { id } = useParams()

  const [familia, setFamilia] = useState(null)
  const [membros, setMembros] = useState([])
  const [historico, setHistorico] = useState([])
  const [lugares, setLugares] = useState([])
  const [freguesias, setFreguesias] = useState([])
  const [cotas, setCotas] = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({})
  const [novoMembro, setNovoMembro] = useState('')
  const [notaHistorico, setNotaHistorico] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardandoCota, setGuardandoCota] = useState(null)
  const [perfil, setPerfil] = useState(null)

  const podeEditar = perfil?.papel === 'completo'

  useEffect(() => {
    async function init() {
      const p = await getPerfil()
      setPerfil(p)
      await carregarTudo()
    }
    init()
  }, [id])

  async function carregarTudo() {
    setLoading(true)
    const [famRes, membRes, histRes, lugRes, freqRes, cotasRes] = await Promise.all([
      supabase.from('familias').select(`id, chefe_nome, ativo, observacoes, morada, lugar:lugar_id(id,nome), freguesia:freguesia_id(id,nome)`).eq('id', id).single(),
      supabase.from('familia_membros').select('*').eq('familia_id', id).order('id'),
      supabase.from('historico_alteracoes').select('*').eq('familia_id', id).order('data_alteracao', { ascending: false }),
      supabase.from('lugares').select('id, nome').order('nome'),
      supabase.from('freguesias').select('id, nome').order('nome'),
      supabase.from('cotas_pagamentos').select('*').eq('familia_id', id).order('ano', { ascending: false }),
    ])
    if (famRes.data) {
      setFamilia(famRes.data)
      setForm({
        chefe_nome: famRes.data.chefe_nome,
        lugar_id: famRes.data.lugar?.id || '',
        freguesia_id: famRes.data.freguesia?.id || '',
        morada: famRes.data.morada || '',
        observacoes: famRes.data.observacoes || '',
        ativo: famRes.data.ativo,
      })
    }
    setMembros(membRes.data || [])
    setHistorico(histRes.data || [])
    setLugares(lugRes.data || [])
    setFreguesias(freqRes.data || [])
    setCotas(cotasRes.data || [])
    setLoading(false)
  }

  async function guardarEdicao() {
    setGuardando(true)
    await supabase.from('familias').update({
      chefe_nome: form.chefe_nome,
      lugar_id: form.lugar_id || null,
      freguesia_id: form.freguesia_id || null,
      morada: form.morada || null,
      observacoes: form.observacoes || null,
      ativo: form.ativo,
      data_atualizacao: new Date().toISOString(),
    }).eq('id', id)

    if (notaHistorico) {
      await supabase.from('historico_alteracoes').insert({
        familia_id: parseInt(id),
        tipo_alteracao: 'edicao',
        descricao: notaHistorico,
      })
    }
    setNotaHistorico('')
    setEditando(false)
    setGuardando(false)
    carregarTudo()
  }

  async function adicionarMembro() {
    if (!novoMembro.trim()) return
    await supabase.from('familia_membros').insert({ familia_id: parseInt(id), nome: novoMembro.trim() })
    await supabase.from('historico_alteracoes').insert({
      familia_id: parseInt(id),
      tipo_alteracao: 'membro_entrada',
      descricao: `Adicionado membro: ${novoMembro.trim()}`,
    })
    setNovoMembro('')
    carregarTudo()
  }

  async function removerMembro(membroId, nome) {
    if (!confirm(`Remover "${nome}"?`)) return
    await supabase.from('familia_membros').delete().eq('id', membroId)
    await supabase.from('historico_alteracoes').insert({
      familia_id: parseInt(id),
      tipo_alteracao: 'membro_saida',
      descricao: `Removido membro: ${nome}`,
    })
    carregarTudo()
  }

  async function toggleCota(cota) {
    if (!podeEditar) return
    setGuardandoCota(cota.id)
    const novoPago = !cota.pago
    await supabase.from('cotas_pagamentos').update({
      pago: novoPago,
      data_pagamento: novoPago ? new Date().toISOString() : null,
    }).eq('id', cota.id)
    await supabase.from('historico_alteracoes').insert({
      familia_id: parseInt(id),
      tipo_alteracao: 'cota',
      descricao: novoPago
        ? `Cota ${cota.ano} marcada como paga (${parseFloat(cota.valor_total).toFixed(2)}€)`
        : `Cota ${cota.ano} marcada como não paga`,
    })
    setGuardandoCota(null)
    carregarTudo()
  }

  if (loading) return <p className="text-gray-500">A carregar...</p>
  if (!familia) return <p className="text-red-500">Família não encontrada.</p>

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">← Voltar</Link>
          <h1 className="text-2xl font-bold text-stone-800 mt-1">{familia.chefe_nome}</h1>
          <p className="text-sm text-gray-500">
            {familia.lugar?.nome || '—'} · {familia.freguesia?.nome || '—'}
            <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${familia.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {familia.ativo ? 'Ativa' : 'Inativa'}
            </span>
          </p>
        </div>
        {podeEditar && (
          <button onClick={() => setEditando(!editando)}
            className="bg-stone-800 text-white px-4 py-2 rounded hover:bg-stone-700 text-sm">
            {editando ? 'Cancelar' : 'Editar'}
          </button>
        )}
      </div>

      {/* Formulário edição */}
      {podeEditar && editando ? (
        <div className="bg-white rounded shadow p-6 space-y-4">
          <h2 className="font-semibold text-stone-700">Editar Família</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Chefe de Família</label>
              <input value={form.chefe_nome} onChange={e => setForm({...form, chefe_nome: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
            </div>
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
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Morada</label>
              <input value={form.morada} onChange={e => setForm({...form, morada: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Observações</label>
              <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}
                rows={3} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm({...form, ativo: e.target.checked})} />
              <label htmlFor="ativo" className="text-sm text-gray-700">Família ativa</label>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Nota para o histórico (opcional)</label>
              <input value={notaHistorico} onChange={e => setNotaHistorico(e.target.value)}
                placeholder="ex: Mudança de chefe de família após falecimento"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
            </div>
          </div>
          <button onClick={guardarEdicao} disabled={guardando}
            className="bg-stone-800 text-white px-6 py-2 rounded hover:bg-stone-700 text-sm disabled:opacity-50">
            {guardando ? 'A guardar...' : 'Guardar alterações'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded shadow p-6 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400 text-xs">Morada</span><p>{familia.morada || '—'}</p></div>
          <div><span className="text-gray-400 text-xs">Observações</span><p className="whitespace-pre-wrap">{familia.observacoes || '—'}</p></div>
        </div>
      )}

      {/* Agregado Familiar */}
      <div className="bg-white rounded shadow p-6">
        <h2 className="font-semibold text-stone-700 mb-4">Agregado Familiar</h2>
        <ul className="space-y-2 mb-4">
          {membros.length === 0 && <li className="text-gray-400 text-sm">Sem membros registados.</li>}
          {membros.map(m => (
            <li key={m.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
              <span>{m.nome}</span>
              {podeEditar && (
                <button onClick={() => removerMembro(m.id, m.nome)}
                  className="text-red-400 hover:text-red-600 text-xs">remover</button>
              )}
            </li>
          ))}
        </ul>
        {podeEditar && (
          <div className="flex gap-2">
            <input value={novoMembro} onChange={e => setNovoMembro(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarMembro()}
              placeholder="Nome do novo membro..."
              className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
            <button onClick={adicionarMembro}
              className="bg-stone-800 text-white px-4 py-2 rounded hover:bg-stone-700 text-sm">
              Adicionar
            </button>
          </div>
        )}
      </div>

      {/* Cotas */}
      <div className="bg-white rounded shadow p-6">
        <h2 className="font-semibold text-stone-700 mb-4">Cotas</h2>
        {cotas.length === 0 ? (
          <p className="text-gray-400 text-sm">Sem cotas registadas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left py-2">Ano</th>
                <th className="text-center py-2">Membros</th>
                <th className="text-center py-2">Valor</th>
                <th className="text-center py-2">Estado</th>
                <th className="text-center py-2">Data pagamento</th>
                {podeEditar && <th className="text-center py-2">Acção</th>}
              </tr>
            </thead>
            <tbody>
              {cotas.map(c => (
                <tr key={c.id} className="border-b border-gray-50">
                  <td className="py-2 font-medium">{c.ano}</td>
                  <td className="py-2 text-center text-gray-600">{c.num_membros}</td>
                  <td className="py-2 text-center font-medium">{parseFloat(c.valor_total).toFixed(2)}€</td>
                  <td className="py-2 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${c.pago ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {c.pago ? 'Pago' : 'Por pagar'}
                    </span>
                  </td>
                  <td className="py-2 text-center text-gray-400 text-xs">
                    {c.data_pagamento ? new Date(c.data_pagamento).toLocaleDateString('pt-PT') : '—'}
                  </td>
                  {podeEditar && (
                    <td className="py-2 text-center">
                      <button
                        onClick={() => toggleCota(c)}
                        disabled={guardandoCota === c.id}
                        className={`text-xs px-3 py-1 rounded border ${c.pago
                          ? 'border-red-300 text-red-500 hover:bg-red-50'
                          : 'border-green-400 text-green-600 hover:bg-green-50'
                        } disabled:opacity-50`}>
                        {guardandoCota === c.id ? '...' : c.pago ? 'Anular' : 'Marcar pago'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Histórico */}
      <div className="bg-white rounded shadow p-6">
        <h2 className="font-semibold text-stone-700 mb-4">Histórico</h2>
        {historico.length === 0 ? (
          <p className="text-gray-400 text-sm">Sem alterações registadas.</p>
        ) : (
          <ul className="space-y-3">
            {historico.map(h => (
              <li key={h.id} className="text-sm border-l-2 border-stone-200 pl-3">
                <span className="text-xs text-gray-400">{new Date(h.data_alteracao).toLocaleString('pt-PT')}</span>
                <p className="text-gray-700">{h.descricao}</p>
                <span className="text-xs text-stone-400">{h.tipo_alteracao}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}