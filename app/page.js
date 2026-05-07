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

  const label_text = selected.length === 0 || selected.length === options.length
    ? `Todas as ${label}`
    : `${selected.length} ${label}`

  const isActive = selected.length > 0 && selected.length < options.length

  return (
    <div ref={ref} style={{position: 'relative'}}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '0.4rem 0.75rem', fontSize: '13px',
        border: isActive ? '1px solid #a5b4fc' : '1px solid #e5e7eb',
        borderRadius: '8px', background: isActive ? '#ede9fe' : 'white',
        color: isActive ? '#5b21b6' : '#374151', cursor: 'pointer',
        whiteSpace: 'nowrap'
      }}>
        {label_text}
        <span style={{fontSize: '10px', color: '#9ca3af'}}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px',
          background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: '200px',
          maxHeight: '260px', overflowY: 'auto', zIndex: 100
        }}>
          <div style={{display: 'flex', gap: '8px', padding: '8px 12px', borderBottom: '1px solid #f3f4f6'}}>
            <button onClick={() => onChange(options.map(o => o.value))} style={{fontSize: '12px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>Todas</button>
            <span style={{color: '#e5e7eb'}}>|</span>
            <button onClick={() => onChange([])} style={{fontSize: '12px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>Nenhuma</button>
          </div>
          {options.map(opt => (
            <label key={opt.value} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', cursor: 'pointer', fontSize: '13px', color: '#374151'}}>
              <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} style={{accentColor: '#6366f1', width: 'auto', padding: 0, border: 'none', boxShadow: 'none'}} />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const cardStyle = {
  background: 'white', borderRadius: '10px',
  border: '1px solid #e5e7eb', padding: '1rem 1.25rem'
}

const statStyle = {
  background: 'white', borderRadius: '10px',
  border: '1px solid #e5e7eb', padding: '0.9rem 1rem'
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

  const membrosFiltrados = termo ? membros.filter(m => m.nome.toLowerCase().includes(termo)) : []
  const temFiltros = filtroLugares.length > 0 || filtroFreguesias.length > 0 || filtroEstado

  const lugaresOpts = lugares.map(l => ({ value: l.id.toString(), label: l.nome }))
  const freguesiasOpts = freguesias.map(f => ({ value: f.id.toString(), label: f.nome }))

  const totalAtivas = familias.filter(f => f.ativo).length
  const totalInativas = familias.filter(f => !f.ativo).length

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
        <h1 style={{fontSize: '22px', fontWeight: 500}}>Famílias</h1>
        {podeEditar && (
          <Link href="/familias/nova" style={{
            background: '#4f46e5', color: 'white', padding: '0.5rem 1rem',
            borderRadius: '8px', fontSize: '13px', textDecoration: 'none',
            fontWeight: 500
          }}>+ Nova Família</Link>
        )}
      </div>

      {/* Cards de resumo */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.5rem'}}>
        <div style={statStyle}>
          <div style={{fontSize: '22px', fontWeight: 500, color: '#4f46e5'}}>{familias.length}</div>
          <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '2px'}}>Total famílias</div>
        </div>
        <div style={statStyle}>
          <div style={{fontSize: '22px', fontWeight: 500, color: '#059669'}}>{totalAtivas}</div>
          <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '2px'}}>Ativas</div>
        </div>
        <div style={statStyle}>
          <div style={{fontSize: '22px', fontWeight: 500, color: '#dc2626'}}>{totalInativas}</div>
          <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '2px'}}>Inativas</div>
        </div>
      </div>

      {/* Pesquisa */}
      <input
        type="text"
        placeholder="Pesquisar por nome do chefe ou membro..."
        value={pesquisa}
        onChange={e => setPesquisa(e.target.value)}
        style={{width: '100%', marginBottom: '0.75rem'}}
      />

      {/* Filtros */}
      <div style={{display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center'}}>
        <MultiSelect label="freguesias" options={freguesiasOpts} selected={filtroFreguesias} onChange={setFiltroFreguesias} />
        <MultiSelect label="lugares" options={lugaresOpts} selected={filtroLugares} onChange={setFiltroLugares} />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{padding: '0.4rem 0.75rem', fontSize: '13px'}}>
          <option value="">Todos os estados</option>
          <option value="ativa">Ativas</option>
          <option value="inativa">Inativas</option>
        </select>
        {temFiltros && (
          <button onClick={() => { setFiltroLugares([]); setFiltroFreguesias([]); setFiltroEstado('') }}
            style={{fontSize: '12px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline'}}>
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <p style={{color: '#9ca3af', fontSize: '13px'}}>A carregar...</p>
      ) : (
        <>
          {/* Resultados de membros */}
          {termo && membrosFiltrados.length > 0 && (
            <div style={{...cardStyle, marginBottom: '1rem', borderColor: '#c7d2fe'}}>
              <div style={{fontSize: '11px', fontWeight: 600, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem'}}>
                Membros do agregado ({membrosFiltrados.length})
              </div>
              {membrosFiltrados.map(m => (
                <Link key={m.id} href={`/familias/${m.familia_id}`} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', textDecoration: 'none',
                  color: 'inherit'
                }}>
                  <span style={{fontSize: '13px'}}>{m.nome}</span>
                  <span style={{fontSize: '11px', color: '#9ca3af'}}>família de {m.familias?.chefe_nome} →</span>
                </Link>
              ))}
            </div>
          )}

          {/* Tabela */}
          <div style={cardStyle}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
              <thead>
                <tr style={{borderBottom: '1px solid #f3f4f6'}}>
                  <th style={{textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'}}>Nome</th>
                  <th style={{textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'}}>Lugar</th>
                  <th style={{textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'}}>Freguesia</th>
                  <th style={{textAlign: 'center', padding: '0.5rem 0.75rem', fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'}}>Membros</th>
                  <th style={{textAlign: 'center', padding: '0.5rem 0.75rem', fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'}}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {familiasFiltradas.map(f => (
                  <tr key={f.id}
                    onClick={() => window.location.href = `/familias/${f.id}`}
                    style={{borderBottom: '1px solid #f9fafb', cursor: 'pointer', opacity: f.ativo ? 1 : 0.45, transition: 'background 0.1s'}}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{padding: '0.65rem 0.75rem', fontWeight: 500, color: '#111'}}>{f.chefe_nome}</td>
                    <td style={{padding: '0.65rem 0.75rem', color: '#6b7280'}}>{f.lugar?.nome || '—'}</td>
                    <td style={{padding: '0.65rem 0.75rem', color: '#6b7280'}}>{f.freguesia?.nome || '—'}</td>
                    <td style={{padding: '0.65rem 0.75rem', textAlign: 'center', color: '#6b7280'}}>{f.familia_membros?.length || 0}</td>
                    <td style={{padding: '0.65rem 0.75rem', textAlign: 'center'}}>
                      <span style={{
                        fontSize: '11px', padding: '3px 9px', borderRadius: '20px', fontWeight: 600,
                        background: f.ativo ? '#ede9fe' : '#fee2e2',
                        color: f.ativo ? '#5b21b6' : '#991b1b'
                      }}>{f.ativo ? 'Ativa' : 'Inativa'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{padding: '0.75rem', fontSize: '12px', color: '#9ca3af', borderTop: '1px solid #f3f4f6'}}>
              {familiasFiltradas.length} família{familiasFiltradas.length !== 1 ? 's' : ''}{temFiltros && ' (filtrado)'}
            </div>
          </div>
        </>
      )}
    </div>
  )
}