'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = { background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '1.25rem' }

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
    setNovoLugar(''); carregar()
  }

  async function adicionarFreguesia() {
    if (!novaFreguesia.trim()) return
    await supabase.from('freguesias').insert({ nome: novaFreguesia.trim() })
    setNovaFreguesia(''); carregar()
  }

  async function guardarLugar(id, nome) {
    if (!nome.trim()) return
    await supabase.from('lugares').update({ nome: nome.trim() }).eq('id', id)
    setEditandoLugar(null); carregar()
  }

  async function guardarFreguesia(id, nome) {
    if (!nome.trim()) return
    await supabase.from('freguesias').update({ nome: nome.trim() }).eq('id', id)
    setEditandoFreguesia(null); carregar()
  }

  async function apagarLugar(id, nome) {
    if (!confirm(`Apagar "${nome}"?`)) return
    await supabase.from('lugares').delete().eq('id', id); carregar()
  }

  async function apagarFreguesia(id, nome) {
    if (!confirm(`Apagar "${nome}"?`)) return
    await supabase.from('freguesias').delete().eq('id', id); carregar()
  }

  const ListaItem = ({ item, editando, setEditando, onGuardar, onApagar }) => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.45rem 0',borderBottom:'1px solid #f9fafb'}}>
      {editando?.id === item.id ? (
        <div style={{display:'flex',gap:'8px',flex:1}}>
          <input value={editando.nome} onChange={e => setEditando({...editando, nome: e.target.value})}
            onKeyDown={e => e.key === 'Enter' && onGuardar(item.id, editando.nome)}
            style={{flex:1,fontSize:'13px'}} autoFocus />
          <button onClick={() => onGuardar(item.id, editando.nome)} style={{fontSize:'12px',color:'#059669',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>guardar</button>
          <button onClick={() => setEditando(null)} style={{fontSize:'12px',color:'#9ca3af',background:'none',border:'none',cursor:'pointer'}}>cancelar</button>
        </div>
      ) : (
        <>
          <span style={{fontSize:'13px',color:'#374151'}}>{item.nome}</span>
          <div style={{display:'flex',gap:'12px'}}>
            <button onClick={() => setEditando({id:item.id,nome:item.nome})} style={{fontSize:'12px',color:'#6366f1',background:'none',border:'none',cursor:'pointer'}}>editar</button>
            <button onClick={() => onApagar(item.id, item.nome)} style={{fontSize:'12px',color:'#dc2626',background:'none',border:'none',cursor:'pointer'}}>apagar</button>
          </div>
        </>
      )}
    </div>
  )

  const Coluna = ({ titulo, count, valor, setValor, onAdicionar, items, editando, setEditando, onGuardar, onApagar }) => (
    <div style={card}>
      <h2 style={{fontSize:'15px',fontWeight:500,color:'#111',marginBottom:'2px'}}>{titulo}</h2>
      <div style={{fontSize:'11px',color:'#9ca3af',marginBottom:'1rem'}}>{count} registos</div>
      <div style={{display:'flex',gap:'8px',marginBottom:'1rem'}}>
        <input value={valor} onChange={e => setValor(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onAdicionar()}
          placeholder={`Novo${titulo === 'Lugares' ? ' lugar' : 'a freguesia'}...`}
          style={{flex:1}} />
        <button onClick={onAdicionar} style={{padding:'0.45rem 0.9rem',fontSize:'13px',fontWeight:500,background:'#4f46e5',color:'white',border:'none',borderRadius:'8px',cursor:'pointer'}}>+</button>
      </div>
      <div>
        {items.map(item => (
          <ListaItem key={item.id} item={item} editando={editando} setEditando={setEditando} onGuardar={onGuardar} onApagar={onApagar} />
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <h1 style={{fontSize:'22px',fontWeight:500,marginBottom:'1.5rem'}}>Configurações</h1>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem',alignItems:'start'}}>
        <Coluna
          titulo="Lugares" count={lugares.length}
          valor={novoLugar} setValor={setNovoLugar} onAdicionar={adicionarLugar}
          items={lugares} editando={editandoLugar} setEditando={setEditandoLugar}
          onGuardar={guardarLugar} onApagar={apagarLugar}
        />
        <Coluna
          titulo="Freguesias" count={freguesias.length}
          valor={novaFreguesia} setValor={setNovaFreguesia} onAdicionar={adicionarFreguesia}
          items={freguesias} editando={editandoFreguesia} setEditando={setEditandoFreguesia}
          onGuardar={guardarFreguesia} onApagar={apagarFreguesia}
        />
      </div>
    </div>
  )
}
