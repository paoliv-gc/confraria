'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getPerfil } from '../../lib/auth'
import Link from 'next/link'

export default function Cotas() {
  const [cotas, setCotas] = useState([])
  const [config, setConfig] = useState(null)
  const [anoSel, setAnoSel] = useState(2025)
  const [anos, setAnos] = useState([2025])
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState(null)
  const [pesquisa, setPesquisa] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('ativo')
  const [guardando, setGuardando] = useState(null)
  const [editandoValor, setEditandoValor] = useState(false)
  const [novoValor, setNovoValor] = useState('')

  const podeEditar = perfil?.papel === 'completo'

  useEffect(() => {
    async function init() {
      const p = await getPerfil()
      setPerfil(p)
      await carregarAnos()
    }
    init()
  }, [])

  useEffect(() => {
    if (anoSel) carregarCotas()
  }, [anoSel])

  async function carregarAnos() {
    const { data } = await supabase
      .from('cotas_config')
      .select('ano, valor_por_membro')
      .order('ano', { ascending: false })
    if (data && data.length > 0) {
      setAnos(data.map(d => d.ano))
      setAnoSel(data[0].ano)
      setConfig(data[0])
    }
  }

  async function carregarCotas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('cotas_pagamentos')
      .select(`
        id, ano, num_membros, valor_total, pago, data_pagamento, observacoes,
        familias(id, chefe_nome, ativo, lugar:lugar_id(nome), freguesia:freguesia_id(nome))
      `)
      .eq('ano', anoSel)
      .order('familias(chefe_nome)')

    const { data: cfg } = await supabase
      .from('cotas_config')
      .select('*')
      .eq('ano', anoSel)
      .single()

    if (!error) setCotas(data || [])
    if (cfg) { setConfig(cfg); setNovoValor(cfg.valor_por_membro.toString()) }
    setLoading(false)
  }

  async function togglePago(cota) {
    if (!podeEditar) return
    setGuardando(cota.id)
    const novoPago = !cota.pago
    await supabase.from('cotas_pagamentos').update({
      pago: novoPago,
      data_pagamento: novoPago ? new Date().toISOString() : null,
    }).eq('id', cota.id)
    setGuardando(null)
    carregarCotas()
  }

  async function guardarNovoValor() {
    const val = parseFloat(novoValor)
    if (isNaN(val) || val <= 0) return alert('Valor inválido')
    await supabase.from('cotas_config').update({ valor_por_membro: val }).eq('ano', anoSel)
    setEditandoValor(false)
    carregarCotas()
  }

  async function criarAno() {
    const novoAno = Math.max(...anos) + 1
    if (!confirm(`Criar cotas para ${novoAno} para todas as famílias ativas?`)) return

    const { data: familias } = await supabase
      .from('familias')
      .select('id, familia_membros(id)')
      .eq('ativo', true)

    await supabase.from('cotas_config').insert({
      ano: novoAno,
      valor_por_membro: config?.valor_por_membro || 5.00
    })

    const valorMembro = config?.valor_por_membro || 5.00
    const inserts = familias.map(f => ({
      familia_id: f.id,
      ano: novoAno,
      num_membros: 1 + (f.familia_membros?.length || 0),
      valor_total: (1 + (f.familia_membros?.length || 0)) * valorMembro,
      pago: false,
    }))

    await supabase.from('cotas_pagamentos').insert(inserts)
    await carregarAnos()
    setAnoSel(novoAno)
  }

  // Só conta ativos para os totais
  const cotasAtivas = cotas.filter(c => c.familias?.ativo)
  const totalPago = cotasAtivas.filter(c => c.pago).reduce((s, c) => s + parseFloat(c.valor_total), 0)
  const totalPorCobrar = cotasAtivas.filter(c => !c.pago).reduce((s, c) => s + parseFloat(c.valor_total), 0)
  const numPagos = cotasAtivas.filter(c => c.pago).length
  const numNaoPagos = cotasAtivas.filter(c => !c.pago).length

  const cotasFiltradas = cotas.filter(c => {
    if (pesquisa && !c.familias?.chefe_nome?.toLowerCase().includes(pesquisa.toLowerCase())) return false
    if (filtroEstado === 'ativo' && !c.familias?.ativo) return false
    if (filtroEstado === 'pago' && (!c.pago || !c.familias?.ativo)) return false
    if (filtroEstado === 'nao_pago' && (c.pago || !c.familias?.ativo)) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Cotas</h1>
        <div className="flex items-center gap-3">
          <select value={anoSel} onChange={e => setAnoSel(parseInt(e.target.value))}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {podeEditar && (
            <button onClick={criarAno}
              className="bg-stone-800 text-white px-4 py-2 rounded hover:bg-stone-700 text-sm">
              + Ano {Math.max(...anos) + 1}
            </button>
          )}
        </div>
      </div>

      {/* Resumo — só famílias ativas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded shadow p-4">
          <p className="text-xs text-gray-400 uppercase">Famílias ativas</p>
          <p className="text-2xl font-bold text-stone-800">{cotasAtivas.length}</p>
        </div>
        <div className="bg-green-50 rounded shadow p-4">
          <p className="text-xs text-green-600 uppercase">Pagas</p>
          <p className="text-2xl font-bold text-green-700">{numPagos}</p>
          <p className="text-sm text-green-600">{totalPago.toFixed(2)}€</p>
        </div>
        <div className="bg-red-50 rounded shadow p-4">
          <p className="text-xs text-red-500 uppercase">Por cobrar</p>
          <p className="text-2xl font-bold text-red-600">{numNaoPagos}</p>
          <p className="text-sm text-red-500">{totalPorCobrar.toFixed(2)}€</p>
        </div>
        <div className="bg-stone-50 rounded shadow p-4">
          <p className="text-xs text-gray-400 uppercase">Valor/membro</p>
          {editandoValor && podeEditar ? (
            <div className="flex gap-1 mt-1">
              <input value={novoValor} onChange={e => setNovoValor(e.target.value)}
                className="w-16 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400" />
              <button onClick={guardarNovoValor} className="text-green-600 text-xs hover:text-green-800">✓</button>
              <button onClick={() => setEditandoValor(false)} className="text-gray-400 text-xs hover:text-gray-600">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-stone-800">{config?.valor_por_membro}€</p>
              {podeEditar && (
                <button onClick={() => setEditandoValor(true)}
                  className="text-xs text-stone-400 hover:text-stone-600">editar</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)}
          placeholder="Pesquisar família..."
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 flex-1 min-w-[200px]" />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
          <option value="ativo">Só ativas</option>
          <option value="">Todas (incl. inativas)</option>
          <option value="pago">Pagas</option>
          <option value="nao_pago">Por cobrar</option>
        </select>
      </div>

      {/* Tabela */}
      {loading ? (
        <p className="text-gray-500">A carregar...</p>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-stone-600 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3">Família</th>
                <th className="text-left px-4 py-3">Lugar</th>
                <th className="text-left px-4 py-3">Freguesia</th>
                <th className="text-center px-4 py-3">Membros</th>
                <th className="text-center px-4 py-3">Valor</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-center px-4 py-3">Data</th>
                {podeEditar && <th className="text-center px-4 py-3">Acção</th>}
              </tr>
            </thead>
            <tbody>
              {cotasFiltradas.map(c => (
                <tr key={c.id}
                  className={`border-t border-gray-100 hover:bg-stone-50 ${!c.familias?.ativo ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3">
                    <Link href={`/familias/${c.familias?.id}`} className="hover:underline font-medium">
                      {c.familias?.chefe_nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.familias?.lugar?.nome || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.familias?.freguesia?.nome || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.num_membros}</td>
                  <td className="px-4 py-3 text-center font-medium">{parseFloat(c.valor_total).toFixed(2)}€</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${c.pago ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {c.pago ? 'Pago' : 'Por pagar'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">
                    {c.data_pagamento ? new Date(c.data_pagamento).toLocaleDateString('pt-PT') : '—'}
                  </td>
                  {podeEditar && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => togglePago(c)}
                        disabled={guardando === c.id}
                        className={`text-xs px-3 py-1 rounded border ${c.pago
                          ? 'border-red-300 text-red-500 hover:bg-red-50'
                          : 'border-green-400 text-green-600 hover:bg-green-50'
                        } disabled:opacity-50`}>
                        {guardando === c.id ? '...' : c.pago ? 'Anular' : 'Marcar pago'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">
            {cotasFiltradas.length} família{cotasFiltradas.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}