'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getPerfil } from '../../../lib/auth'
import Link from 'next/link'

const card = { background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '1.25rem' }
const label = { fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }
const badge = (ativo) => ({ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', fontWeight: 600, background: ativo ? '#ede9fe' : '#fee2e2', color: ativo ? '#5b21b6' : '#991b1b' })

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
      await supabase.from('historico_alteracoes').insert({ familia_id: parseInt(id), tipo_alteracao: 'edicao', descricao: notaHistorico })
    }
    setNotaHistorico(''); setEditando(false); setGuardando(false)
    carregarTudo()
  }

  async function adicionarMembro() {
    if (!novoMembro.trim()) return
    await supabase.from('familia_membros').insert({ familia_id: parseInt(id), nome: novoMembro.trim() })
    await supabase.from('historico_alteracoes').insert({ familia_id: parseInt(id), tipo_alteracao: 'membro_entrada', descricao: `Adicionado membro: ${novoMembro.trim()}` })
    setNovoMembro(''); carregarTudo()
  }

  async function removerMembro(membroId, nome) {
    if (!confirm(`Remover "${nome}"?`)) return
    await supabase.from('familia_membros').delete().eq('id', membroId)
    await supabase.from('historico_alteracoes').insert({ familia_id: parseInt(id), tipo_alteracao: 'membro_saida', descricao: `Removido membro: ${nome}` })
    carregarTudo()
  }

  async function toggleCota(cota) {
    if (!podeEditar) return
    setGuardandoCota(cota.id)
    const novoPago = !cota.pago
    await supabase.from('cotas_pagamentos').update({ pago: novoPago, data_pagamento: novoPago ? new Date().toISOString() : null }).eq('id', cota.id)
    await supabase.from('historico_alteracoes').insert({ familia_id: parseInt(id), tipo_alteracao: 'cota', descricao: novoPago ? `Cota ${cota.ano} paga (${parseFloat(cota.valor_total).toFixed(2)}€)` : `Cota ${cota.ano} marcada como não paga` })
    setGuardandoCota(null); carregarTudo()
  }

  if (loading) return <p style={{color: '#9ca3af', fontSize: '13px', padding: '2rem'}}>A carregar...</p>
  if (!familia) return <p style={{color: '#dc2626', fontSize: '13px', padding: '2rem'}}>Família não encontrada.</p>

  return (
    <div style={{maxWidth: '860px'}}>

      {/* Cabeçalho */}
      <div style={{marginBottom: '1.5rem'}}>
        <Link href="/" style={{fontSize: '13px', color: '#6366f1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '0.75rem'}}>← Voltar</Link>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <div>
            <h1 style={{fontSize: '22px', fontWeight: 500, color: '#111', marginBottom: '4px'}}>{familia.chefe_nome}</h1>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280'}}>
              <span>{familia.lugar?.nome || '—'}</span>
              <span>·</span>
              <span>{familia.freguesia?.nome || '—'}</span>
              <span style={badge(familia.ativo)}>{familia.ativo ? 'Ativa' : 'Inativa'}</span>
            </div>
          </div>
          {podeEditar && (
            <button onClick={() => setEditando(!editando)} style={{
              padding: '0.45rem 1rem', fontSize: '13px', fontWeight: 500,
              border: '1px solid #e5e7eb', borderRadius: '8px',
              background: editando ? '#fef2f2' : 'white',
              color: editando ? '#dc2626' : '#374151', cursor: 'pointer'
            }}>{editando ? 'Cancelar' : 'Editar'}</button>
          )}
        </div>
      </div>

      {/* Edição ou visualização */}
      {podeEditar && editando ? (
        <div style={{...card, marginBottom: '1rem'}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
            <div style={{gridColumn: '1 / -1'}}>
              <span style={label}>Chefe de Família</span>
              <input value={form.chefe_nome} onChange={e => setForm({...form, chefe_nome: e.target.value})} style={{width: '100%'}} />
            </div>
            <div>
              <span style={label}>Lugar</span>
              <select value={form.lugar_id} onChange={e => setForm({...form, lugar_id: e.target.value})} style={{width: '100%'}}>
                <option value="">— sem lugar —</option>
                {lugares.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div>
              <span style={label}>Freguesia</span>
              <select value={form.freguesia_id} onChange={e => setForm({...form, freguesia_id: e.target.value})} style={{width: '100%'}}>
                <option value="">— sem freguesia —</option>
                {freguesias.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div style={{gridColumn: '1 / -1'}}>
              <span style={label}>Morada</span>
              <input value={form.morada} onChange={e => setForm({...form, morada: e.target.value})} style={{width: '100%'}} />
            </div>
            <div style={{gridColumn: '1 / -1'}}>
              <span style={label}>Observações</span>
              <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} rows={3} style={{width: '100%', resize: 'vertical'}} />
            </div>
            <div style={{gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm({...form, ativo: e.target.checked})} style={{width: 'auto', padding: 0}} />
              <label htmlFor="ativo" style={{fontSize: '13px', color: '#374151', cursor: 'pointer'}}>Família ativa</label>
            </div>
            <div style={{gridColumn: '1 / -1'}}>
              <span style={label}>Nota para o histórico (opcional)</span>
              <input value={notaHistorico} onChange={e => setNotaHistorico(e.target.value)} placeholder="ex: Mudança de chefe após falecimento" style={{width: '100%'}} />
            </div>
          </div>
          <button onClick={guardarEdicao} disabled={guardando} style={{
            padding: '0.5rem 1.25rem', fontSize: '13px', fontWeight: 500,
            background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px',
            cursor: 'pointer', opacity: guardando ? 0.6 : 1
          }}>{guardando ? 'A guardar...' : 'Guardar alterações'}</button>
        </div>
      ) : (
        <div style={{...card, marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
          <div>
            <span style={label}>Morada</span>
            <p style={{fontSize: '13px', color: '#374151'}}>{familia.morada || '—'}</p>
          </div>
          <div>
            <span style={label}>Observações</span>
            <p style={{fontSize: '13px', color: '#374151', whiteSpace: 'pre-wrap'}}>{familia.observacoes || '—'}</p>
          </div>
        </div>
      )}

      {/* Agregado Familiar */}
      <div style={{...card, marginBottom: '1rem'}}>
        <h2 style={{fontSize: '15px', fontWeight: 500, color: '#111', marginBottom: '1rem'}}>Agregado Familiar</h2>
        {membros.length === 0 && <p style={{fontSize: '13px', color: '#9ca3af'}}>Sem membros registados.</p>}
        <div style={{marginBottom: podeEditar ? '1rem' : 0}}>
          {membros.map(m => (
            <div key={m.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f9fafb'}}>
              <span style={{fontSize: '13px', color: '#374151'}}>{m.nome}</span>
              {podeEditar && (
                <button onClick={() => removerMembro(m.id, m.nome)} style={{fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px'}}>remover</button>
              )}
            </div>
          ))}
        </div>
        {podeEditar && (
          <div style={{display: 'flex', gap: '8px', marginTop: '0.5rem'}}>
            <input value={novoMembro} onChange={e => setNovoMembro(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarMembro()} placeholder="Nome do novo membro..." style={{flex: 1}} />
            <button onClick={adicionarMembro} style={{padding: '0.5rem 1rem', fontSize: '13px', fontWeight: 500, background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'}}>Adicionar</button>
          </div>
        )}
      </div>

      {/* Cotas */}
      <div style={{...card, marginBottom: '1rem'}}>
        <h2 style={{fontSize: '15px', fontWeight: 500, color: '#111', marginBottom: '1rem'}}>Cotas</h2>
        {cotas.length === 0 ? (
          <p style={{fontSize: '13px', color: '#9ca3af'}}>Sem cotas registadas.</p>
        ) : (
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
            <thead>
              <tr style={{borderBottom: '1px solid #f3f4f6'}}>
                {['Ano', 'Membros', 'Valor', 'Estado', 'Data pagamento', podeEditar ? 'Acção' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{textAlign: h === 'Ano' ? 'left' : 'center', padding: '0.4rem 0.5rem', fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cotas.map(c => (
                <tr key={c.id} style={{borderBottom: '1px solid #f9fafb'}}>
                  <td style={{padding: '0.6rem 0.5rem', fontWeight: 500}}>{c.ano}</td>
                  <td style={{padding: '0.6rem 0.5rem', textAlign: 'center', color: '#6b7280'}}>{c.num_membros}</td>
                  <td style={{padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 500}}>{parseFloat(c.valor_total).toFixed(2)}€</td>
                  <td style={{padding: '0.6rem 0.5rem', textAlign: 'center'}}>
                    <span style={{fontSize: '11px', padding: '3px 9px', borderRadius: '20px', fontWeight: 600, background: c.pago ? '#d1fae5' : '#fee2e2', color: c.pago ? '#065f46' : '#991b1b'}}>
                      {c.pago ? 'Pago' : 'Por pagar'}
                    </span>
                  </td>
                  <td style={{padding: '0.6rem 0.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '12px'}}>
                    {c.data_pagamento ? new Date(c.data_pagamento).toLocaleDateString('pt-PT') : '—'}
                  </td>
                  {podeEditar && (
                    <td style={{padding: '0.6rem 0.5rem', textAlign: 'center'}}>
                      <button onClick={() => toggleCota(c)} disabled={guardandoCota === c.id} style={{
                        fontSize: '12px', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer',
                        border: c.pago ? '1px solid #fca5a5' : '1px solid #a5b4fc',
                        color: c.pago ? '#dc2626' : '#4f46e5', background: 'white',
                        opacity: guardandoCota === c.id ? 0.5 : 1
                      }}>{guardandoCota === c.id ? '...' : c.pago ? 'Anular' : 'Marcar pago'}</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Histórico */}
      <div style={card}>
        <h2 style={{fontSize: '15px', fontWeight: 500, color: '#111', marginBottom: '1rem'}}>Histórico</h2>
        {historico.length === 0 ? (
          <p style={{fontSize: '13px', color: '#9ca3af'}}>Sem alterações registadas.</p>
        ) : (
          <div>
            {historico.map(h => (
              <div key={h.id} style={{borderLeft: '2px solid #e0e7ff', paddingLeft: '0.75rem', marginBottom: '0.75rem'}}>
                <div style={{fontSize: '11px', color: '#9ca3af', marginBottom: '2px'}}>{new Date(h.data_alteracao).toLocaleString('pt-PT')} · <span style={{color: '#a5b4fc'}}>{h.tipo_alteracao}</span></div>
                <div style={{fontSize: '13px', color: '#374151'}}>{h.descricao}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
