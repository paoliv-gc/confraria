'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getPerfil } from '../../lib/auth'
import Link from 'next/link'

const card = { background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '1.25rem' }
const stat = { background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '0.9rem 1rem' }

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
    async function init() { const p = await getPerfil(); setPerfil(p); await carregarAnos() }
    init()
  }, [])

  useEffect(() => { if (anoSel) carregarCotas() }, [anoSel])

  async function carregarAnos() {
    const { data } = await supabase.from('cotas_config').select('ano, valor_por_membro').order('ano', { ascending: false })
    if (data?.length > 0) { setAnos(data.map(d => d.ano)); setAnoSel(data[0].ano); setConfig(data[0]) }
  }

  async function carregarCotas() {
    setLoading(true)
    const [{ data }, { data: cfg }] = await Promise.all([
      supabase.from('cotas_pagamentos').select(`id, ano, num_membros, valor_total, pago, data_pagamento, familias(id, chefe_nome, ativo, lugar:lugar_id(nome), freguesia:freguesia_id(nome))`).eq('ano', anoSel).order('familias(chefe_nome)'),
      supabase.from('cotas_config').select('*').eq('ano', anoSel).single()
    ])
    setCotas(data || [])
    if (cfg) { setConfig(cfg); setNovoValor(cfg.valor_por_membro.toString()) }
    setLoading(false)
  }

  async function togglePago(cota) {
    if (!podeEditar) return
    setGuardando(cota.id)
    const novoPago = !cota.pago
    await supabase.from('cotas_pagamentos').update({ pago: novoPago, data_pagamento: novoPago ? new Date().toISOString() : null }).eq('id', cota.id)
    setGuardando(null); carregarCotas()
  }

  async function guardarNovoValor() {
    const val = parseFloat(novoValor)
    if (isNaN(val) || val <= 0) return alert('Valor inválido')
    await supabase.from('cotas_config').update({ valor_por_membro: val }).eq('ano', anoSel)
    setEditandoValor(false); carregarCotas()
  }

  async function criarAno() {
    const novoAno = Math.max(...anos) + 1
    if (!confirm(`Criar cotas para ${novoAno} para todas as famílias ativas?`)) return
    const { data: familias } = await supabase.from('familias').select('id, familia_membros(id)').eq('ativo', true)
    await supabase.from('cotas_config').insert({ ano: novoAno, valor_por_membro: config?.valor_por_membro || 5.00 })
    const valorMembro = config?.valor_por_membro || 5.00
    await supabase.from('cotas_pagamentos').insert(familias.map(f => ({ familia_id: f.id, ano: novoAno, num_membros: 1 + (f.familia_membros?.length || 0), valor_total: (1 + (f.familia_membros?.length || 0)) * valorMembro, pago: false })))
    await carregarAnos(); setAnoSel(novoAno)
  }

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
    <div>
      {/* Cabeçalho */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <h1 style={{fontSize: '22px', fontWeight: 500}}>Cotas</h1>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <select value={anoSel} onChange={e => setAnoSel(parseInt(e.target.value))} style={{fontSize: '13px'}}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {podeEditar && (
            <button onClick={criarAno} style={{padding: '0.45rem 1rem', fontSize: '13px', fontWeight: 500, background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'}}>
              + Ano {Math.max(...anos) + 1}
            </button>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.5rem'}}>
        <div style={stat}>
          <div style={{fontSize: '22px', fontWeight: 500, color: '#4f46e5'}}>{cotasAtivas.length}</div>
          <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '2px'}}>Famílias ativas</div>
        </div>
        <div style={stat}>
          <div style={{fontSize: '22px', fontWeight: 500, color: '#059669'}}>{numPagos}</div>
          <div style={{fontSize: '12px', color: '#059669', fontWeight: 500}}>{totalPago.toFixed(2)}€</div>
          <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '2px'}}>Pagas</div>
        </div>
        <div style={stat}>
          <div style={{fontSize: '22px', fontWeight: 500, color: '#dc2626'}}>{numNaoPagos}</div>
          <div style={{fontSize: '12px', color: '#dc2626', fontWeight: 500}}>{totalPorCobrar.toFixed(2)}€</div>
          <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '2px'}}>Por cobrar</div>
        </div>
        <div style={stat}>
          {editandoValor && podeEditar ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <input value={novoValor} onChange={e => setNovoValor(e.target.value)} style={{width: '60px', fontSize: '13px', padding: '4px 8px'}} />
              <button onClick={guardarNovoValor} style={{color: '#059669', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px'}}>✓</button>
              <button onClick={() => setEditandoValor(false)} style={{color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px'}}>✕</button>
            </div>
          ) : (
            <div style={{display: 'flex', alignItems: 'baseline', gap: '6px'}}>
              <div style={{fontSize: '22px', fontWeight: 500, color: '#374151'}}>{config?.valor_por_membro}€</div>
              {podeEditar && <button onClick={() => setEditandoValor(true)} style={{fontSize: '11px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline'}}>editar</button>}
            </div>
          )}
          <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '2px'}}>Valor por membro</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{display: 'flex', gap: '8px', marginBottom: '1.5rem'}}>
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar família..." style={{flex: 1}} />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{fontSize: '13px'}}>
          <option value="ativo">Só ativas</option>
          <option value="">Todas (incl. inativas)</option>
          <option value="pago">Pagas</option>
          <option value="nao_pago">Por cobrar</option>
        </select>
      </div>

      {/* Tabela */}
      {loading ? <p style={{color: '#9ca3af', fontSize: '13px'}}>A carregar...</p> : (
        <div style={card}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
            <thead>
              <tr style={{borderBottom: '1px solid #f3f4f6'}}>
                {['Família', 'Lugar', 'Freguesia', 'Membros', 'Valor', 'Estado', 'Data', podeEditar ? 'Acção' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{textAlign: h === 'Família' ? 'left' : 'center', padding: '0.5rem 0.75rem', fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cotasFiltradas.map(c => (
                <tr key={c.id} style={{borderBottom: '1px solid #f9fafb', opacity: c.familias?.ativo ? 1 : 0.4}}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{padding: '0.65rem 0.75rem'}}>
                    <Link href={`/familias/${c.familias?.id}`} style={{fontWeight: 500, color: '#111', textDecoration: 'none'}}>{c.familias?.chefe_nome}</Link>
                  </td>
                  <td style={{padding: '0.65rem 0.75rem', textAlign: 'center', color: '#6b7280'}}>{c.familias?.lugar?.nome || '—'}</td>
                  <td style={{padding: '0.65rem 0.75rem', textAlign: 'center', color: '#6b7280'}}>{c.familias?.freguesia?.nome || '—'}</td>
                  <td style={{padding: '0.65rem 0.75rem', textAlign: 'center', color: '#6b7280'}}>{c.num_membros}</td>
                  <td style={{padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 500}}>{parseFloat(c.valor_total).toFixed(2)}€</td>
                  <td style={{padding: '0.65rem 0.75rem', textAlign: 'center'}}>
					<span style={{fontSize: '11px', padding: '3px 9px', borderRadius: '20px', fontWeight: 600, whiteSpace: 'nowrap', background: c.pago ? '#d1fae5' : '#fee2e2', color: c.pago ? '#065f46' : '#991b1b'}}>
						{c.pago ? 'Pago' : 'Por pagar'}
					</span>
				  </td>                  
				  <td style={{padding: '0.65rem 0.75rem', textAlign: 'center', color: '#9ca3af', fontSize: '12px'}}>
                    {c.data_pagamento ? new Date(c.data_pagamento).toLocaleDateString('pt-PT') : '—'}
                  </td>
                  {podeEditar && (
                    <td style={{padding: '0.65rem 0.75rem', textAlign: 'center'}}>
                      <button onClick={() => togglePago(c)} disabled={guardando === c.id} style={{
                        fontSize: '12px', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer',
                        border: c.pago ? '1px solid #fca5a5' : '1px solid #a5b4fc',
                        color: c.pago ? '#dc2626' : '#4f46e5', background: 'white',
                        opacity: guardando === c.id ? 0.5 : 1
                      }}>{guardando === c.id ? '...' : c.pago ? 'Anular' : 'Marcar pago'}</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{padding: '0.75rem', fontSize: '12px', color: '#9ca3af', borderTop: '1px solid #f3f4f6'}}>
            {cotasFiltradas.length} família{cotasFiltradas.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
