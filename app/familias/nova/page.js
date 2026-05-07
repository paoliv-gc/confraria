'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getPerfil } from '../../../lib/auth'
import Link from 'next/link'

const card = { background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1rem' }
const labelStyle = { fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }

export default function NovaFamilia() {
  const router = useRouter()
  const [lugares, setLugares] = useState([])
  const [freguesias, setFreguesias] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [autorizado, setAutorizado] = useState(false)
  const [form, setForm] = useState({ chefe_nome: '', lugar_id: '', freguesia_id: '', morada: '', observacoes: '' })
  const [membros, setMembros] = useState([''])

  useEffect(() => {
    async function init() {
      const p = await getPerfil()
      if (!p || p.papel !== 'completo') { router.push('/'); return }
      setAutorizado(true)
      const [lugRes, freqRes] = await Promise.all([
        supabase.from('lugares').select('id, nome').order('nome'),
        supabase.from('freguesias').select('id, nome').order('nome'),
      ])
      setLugares(lugRes.data || [])
      setFreguesias(freqRes.data || [])
    }
    init()
  }, [])

  function atualizarMembro(i, val) {
    const novos = [...membros]; novos[i] = val; setMembros(novos)
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

    if (error) { alert('Erro: ' + error.message); setGuardando(false); return }

    const membrosValidos = membros.filter(m => m.trim())
    if (membrosValidos.length > 0) {
      await supabase.from('familia_membros').insert(membrosValidos.map(nome => ({ familia_id: data.id, nome: nome.trim() })))
    }

    // Criar cota do ano actual
    const anoAtual = new Date().getFullYear()
    const { data: cfg } = await supabase.from('cotas_config').select('valor_por_membro').eq('ano', anoAtual).single()
    const valorMembro = cfg?.valor_por_membro || 5.00
    const numMembros = 1 + membrosValidos.length
    await supabase.from('cotas_pagamentos').insert({ familia_id: data.id, ano: anoAtual, num_membros: numMembros, valor_total: numMembros * valorMembro, pago: false })

    await supabase.from('historico_alteracoes').insert({ familia_id: data.id, tipo_alteracao: 'criacao', descricao: 'Família criada.' })
    router.push(`/familias/${data.id}`)
  }

  if (!autorizado) return null

  return (
    <div style={{maxWidth: '700px'}}>
      <Link href="/" style={{fontSize:'13px',color:'#6366f1',textDecoration:'none',display:'inline-block',marginBottom:'0.75rem'}}>← Voltar</Link>
      <h1 style={{fontSize:'22px',fontWeight:500,marginBottom:'1.5rem'}}>Nova Família</h1>

      <div style={card}>
        <h2 style={{fontSize:'15px',fontWeight:500,color:'#111',marginBottom:'1rem'}}>Dados principais</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
          <div style={{gridColumn:'1 / -1'}}>
            <span style={labelStyle}>Chefe de Família *</span>
            <input value={form.chefe_nome} onChange={e => setForm({...form, chefe_nome: e.target.value})}
              placeholder="Nome completo" style={{width:'100%'}} />
          </div>
          <div>
            <span style={labelStyle}>Lugar</span>
            <select value={form.lugar_id} onChange={e => setForm({...form, lugar_id: e.target.value})} style={{width:'100%'}}>
              <option value="">— sem lugar —</option>
              {lugares.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
          <div>
            <span style={labelStyle}>Freguesia</span>
            <select value={form.freguesia_id} onChange={e => setForm({...form, freguesia_id: e.target.value})} style={{width:'100%'}}>
              <option value="">— sem freguesia —</option>
              {freguesias.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div style={{gridColumn:'1 / -1'}}>
            <span style={labelStyle}>Morada</span>
            <input value={form.morada} onChange={e => setForm({...form, morada: e.target.value})}
              placeholder="Rua, número, código postal" style={{width:'100%'}} />
          </div>
          <div style={{gridColumn:'1 / -1'}}>
            <span style={labelStyle}>Observações</span>
            <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}
              rows={3} placeholder="Notas adicionais" style={{width:'100%',resize:'vertical'}} />
          </div>
        </div>
      </div>

      <div style={card}>
        <h2 style={{fontSize:'15px',fontWeight:500,color:'#111',marginBottom:'1rem'}}>Agregado Familiar</h2>
        <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'0.75rem'}}>
          {membros.map((m, i) => (
            <div key={i} style={{display:'flex',gap:'8px'}}>
              <input value={m} onChange={e => atualizarMembro(i, e.target.value)}
                placeholder={`Membro ${i + 1}`} style={{flex:1}} />
              {membros.length > 1 && (
                <button onClick={() => setMembros(membros.filter((_,j) => j !== i))}
                  style={{fontSize:'13px',color:'#dc2626',background:'none',border:'1px solid #fca5a5',borderRadius:'8px',cursor:'pointer',padding:'0 10px'}}>✕</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setMembros([...membros, ''])}
          style={{fontSize:'13px',color:'#6366f1',background:'none',border:'none',cursor:'pointer',textDecoration:'underline',padding:0}}>
          + Adicionar membro
        </button>
      </div>

      <button onClick={guardar} disabled={guardando} style={{
        width:'100%', padding:'0.65rem', fontSize:'14px', fontWeight:500,
        background: guardando ? '#a5b4fc' : '#4f46e5', color:'white',
        border:'none', borderRadius:'10px', cursor:'pointer'
      }}>{guardando ? 'A guardar...' : 'Criar Família'}</button>
    </div>
  )
}
