'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { getPerfil } from '../../lib/auth'

const card = { background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1rem' }

function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  function toggle(val) {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val))
    else onChange([...selected, val])
  }
  const isActive = selected.length > 0 && selected.length < options.length
  const labelText = selected.length === 0 || selected.length === options.length
    ? `Todas as ${label}` : `${selected.length} ${label}`
  return (
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={() => setOpen(!open)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'0.4rem 0.75rem',fontSize:'13px',border: isActive ? '1px solid #a5b4fc' : '1px solid #e5e7eb',borderRadius:'8px',background: isActive ? '#ede9fe' : 'white',color: isActive ? '#5b21b6' : '#374151',cursor:'pointer',whiteSpace:'nowrap'}}>
        {labelText} <span style={{fontSize:'10px',color:'#9ca3af'}}>{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div style={{position:'absolute',top:'100%',left:0,marginTop:'4px',background:'white',border:'1px solid #e5e7eb',borderRadius:'10px',boxShadow:'0 4px 16px rgba(0,0,0,0.08)',minWidth:'200px',maxHeight:'260px',overflowY:'auto',zIndex:100}}>
          <div style={{display:'flex',gap:'8px',padding:'8px 12px',borderBottom:'1px solid #f3f4f6'}}>
            <button onClick={() => onChange(options.map(o=>o.value))} style={{fontSize:'12px',color:'#6366f1',background:'none',border:'none',cursor:'pointer',padding:0}}>Todas</button>
            <span style={{color:'#e5e7eb'}}>|</span>
            <button onClick={() => onChange([])} style={{fontSize:'12px',color:'#6366f1',background:'none',border:'none',cursor:'pointer',padding:0}}>Nenhuma</button>
          </div>
          {options.map(opt => (
            <label key={opt.value} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 12px',cursor:'pointer',fontSize:'13px',color:'#374151'}}>
              <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} style={{accentColor:'#6366f1',width:'auto',padding:0,border:'none',boxShadow:'none'}} />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Relatorios() {
  const [familias, setFamilias] = useState([])
  const [lugares, setLugares] = useState([])
  const [freguesias, setFreguesias] = useState([])
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState(null)

  // Filtros listagem
  const [filtroFreguesias, setFiltroFreguesias] = useState([])
  const [filtroLugares, setFiltroLugares] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('ativa')
  const [incluirCotas, setIncluirCotas] = useState(true)
  const [nomeConfraria, setNomeConfraria] = useState('Confraria de Gavião')

  useEffect(() => {
    async function init() {
      const p = await getPerfil(); setPerfil(p)
      const [famRes, lugRes, freqRes] = await Promise.all([
        supabase.from('familias').select(`id, chefe_nome, ativo, morada, lugar:lugar_id(id,nome), freguesia:freguesia_id(id,nome), familia_membros(id), cotas_pagamentos(ano,num_membros,valor_total,pago)`).order('chefe_nome'),
        supabase.from('lugares').select('id, nome').order('nome'),
        supabase.from('freguesias').select('id, nome').order('nome'),
      ])
      if (!famRes.error) setFamilias(famRes.data || [])
      setLugares(lugRes.data || [])
      setFreguesias(freqRes.data || [])
      setLoading(false)
    }
    init()
  }, [])

  // Filtrar famílias
  const familiasFiltradas = familias.filter(f => {
    if (filtroEstado === 'ativa' && !f.ativo) return false
    if (filtroEstado === 'inativa' && f.ativo) return false
    if (filtroFreguesias.length > 0 && !filtroFreguesias.includes(f.freguesia?.id?.toString())) return false
    if (filtroLugares.length > 0 && !filtroLugares.includes(f.lugar?.id?.toString())) return false
    return true
  })

  // Agrupar por lugar+freguesia
  function agrupar(lista) {
    const grupos = {}
    for (const f of lista) {
      const key = `${f.freguesia?.nome || 'Sem freguesia'} · ${f.lugar?.nome || 'Sem lugar'}`
      if (!grupos[key]) grupos[key] = []
      grupos[key].push(f)
    }
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b))
  }

  const grupos = agrupar(familiasFiltradas)
  const anoAtual = new Date().getFullYear()

  function getCota(f) {
    const c = f.cotas_pagamentos?.find(c => c.ano === anoAtual)
    return c ? { valor: parseFloat(c.valor_total).toFixed(2) + '€', pago: c.pago, membros: c.num_membros } : null
  }

  // IMPRIMIR
  function imprimir() {
    const dataHoje = new Date().toLocaleDateString('pt-PT')
    const totalFamilias = familiasFiltradas.length
    const totalMembros = familiasFiltradas.reduce((s, f) => s + (f.familia_membros?.length || 0) + 1, 0)

    let html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8">
<title>Listagem — ${nomeConfraria}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
  @page { size: A4 portrait; margin: 15mm 12mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #4f46e5; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #4f46e5; display: inline-block; }
  .brand-name { font-size: 14px; font-weight: 700; color: #111; }
  .doc-title { font-size: 18px; font-weight: 300; color: #4f46e5; margin-top: 2px; }
  .meta { text-align: right; font-size: 10px; color: #9ca3af; line-height: 1.6; }
  .section { font-size: 10px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 0; margin: 12px 0 5px; border-bottom: 1px solid #e0e7ff; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { text-align: left; padding: 4px 6px; color: #9ca3af; font-weight: 700; font-size: 9px; text-transform: uppercase; background: #f8fafc; }
  td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) td { background: #fafbff; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid #e5e7eb; }
  .resumo { background: #f8fafc; border: 1px solid #e0e7ff; border-radius: 4px; padding: 8px 12px; margin-top: 16px; display: flex; gap: 24px; font-size: 10px; }
  .resumo span { color: #6366f1; font-weight: 700; }
  @media print { .footer { position: fixed; } }
</style></head><body>`

    html += `<div class="header">
      <div>
        <div class="brand"><div class="dot"></div><span class="brand-name">${nomeConfraria}</span></div>
        <div class="doc-title">Listagem de Famílias ${filtroEstado === 'ativa' ? '(Ativas)' : filtroEstado === 'inativa' ? '(Inativas)' : ''}</div>
      </div>
      <div class="meta">
        Impresso em ${dataHoje}<br>
        Total: ${totalFamilias} famílias · ${totalMembros} pessoas<br>
        Ano ${anoAtual}
      </div>
    </div>`

    for (const [grupo, lista] of grupos) {
      html += `<div class="section">${grupo} — ${lista.length} famílias</div>`
      html += `<table><thead><tr><th>#</th><th>Nome</th><th>Morada</th><th>Membros</th>`
      if (incluirCotas) html += `<th>Cota ${anoAtual}</th><th>Pago?</th>`
      html += `</tr></thead><tbody>`
      lista.forEach((f, i) => {
        const cota = getCota(f)
        html += `<tr>
          <td>${i + 1}</td>
          <td>${f.chefe_nome}</td>
          <td>${f.morada || '—'}</td>
          <td>${(f.familia_membros?.length || 0) + 1}</td>`
        if (incluirCotas) html += `<td>${cota?.valor || '—'}</td><td>${cota ? (cota.pago ? 'Sim' : 'Não') : '—'}</td>`
        html += `</tr>`
      })
      html += `</tbody></table>`
    }

    html += `<div class="resumo">Total de famílias: <span>${totalFamilias}</span> &nbsp;·&nbsp; Total de pessoas: <span>${totalMembros}</span></div>`
    html += `<div class="footer"><span>${nomeConfraria}</span><span>Impresso em ${dataHoje}</span></div>`
    html += `</body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 500)
  }

  // EXPORTAR EXCEL
  async function exportarExcel() {
    const rows = [['#', 'Nome', 'Lugar', 'Freguesia', 'Morada', 'Nº Membros', `Cota ${anoAtual}`, 'Pago?']]
    let seq = 1
    for (const [, lista] of grupos) {
      for (const f of lista) {
        const cota = getCota(f)
        rows.push([
          seq++,
          f.chefe_nome,
          f.lugar?.nome || '',
          f.freguesia?.nome || '',
          f.morada || '',
          (f.familia_membros?.length || 0) + 1,
          cota?.valor || '',
          cota ? (cota.pago ? 'Sim' : 'Não') : '',
        ])
      }
    }

    // CSV simples (abre no Excel)
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `listagem_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const lugaresOpts = lugares.map(l => ({ value: l.id.toString(), label: l.nome }))
  const freguesiasOpts = freguesias.map(f => ({ value: f.id.toString(), label: f.nome }))

  return (
    <div>
      <h1 style={{fontSize:'22px',fontWeight:500,marginBottom:'1.5rem'}}>Relatórios</h1>

      {/* Listagem de Pessoal */}
      <div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
          <div>
            <h2 style={{fontSize:'15px',fontWeight:500,color:'#111'}}>Listagem de Famílias</h2>
            <p style={{fontSize:'12px',color:'#9ca3af',marginTop:'2px'}}>A4 · agrupado por lugar/freguesia</p>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={exportarExcel} style={{padding:'0.45rem 1rem',fontSize:'13px',fontWeight:500,border:'1px solid #e5e7eb',borderRadius:'8px',background:'white',color:'#374151',cursor:'pointer'}}>
              ↓ Excel
            </button>
            <button onClick={imprimir} style={{padding:'0.45rem 1rem',fontSize:'13px',fontWeight:500,background:'#4f46e5',color:'white',border:'none',borderRadius:'8px',cursor:'pointer'}}>
              🖨 Imprimir
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center',marginBottom:'1rem',padding:'0.75rem',background:'#f8fafc',borderRadius:'8px',border:'1px solid #e5e7eb'}}>
          <span style={{fontSize:'12px',color:'#6b7280',fontWeight:500}}>Filtros:</span>
          <MultiSelect label="freguesias" options={freguesiasOpts} selected={filtroFreguesias} onChange={setFiltroFreguesias} />
          <MultiSelect label="lugares" options={lugaresOpts} selected={filtroLugares} onChange={setFiltroLugares} />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{fontSize:'13px',padding:'0.4rem 0.75rem'}}>
            <option value="ativa">Só ativas</option>
            <option value="">Todas</option>
            <option value="inativa">Só inativas</option>
          </select>
          <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',color:'#374151',cursor:'pointer',marginLeft:'8px'}}>
            <input type="checkbox" checked={incluirCotas} onChange={e => setIncluirCotas(e.target.checked)} style={{accentColor:'#6366f1',width:'auto',padding:0}} />
            Incluir cotas {new Date().getFullYear()}
          </label>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'6px'}}>
            <span style={{fontSize:'12px',color:'#9ca3af'}}>Nome:</span>
            <input value={nomeConfraria} onChange={e => setNomeConfraria(e.target.value)} style={{fontSize:'12px',padding:'3px 8px',width:'200px'}} />
          </div>
        </div>

        {/* Preview resumo */}
        {loading ? (
          <p style={{fontSize:'13px',color:'#9ca3af'}}>A carregar...</p>
        ) : (
          <div>
            <div style={{display:'flex',gap:'16px',marginBottom:'0.75rem'}}>
              <div style={{fontSize:'13px',color:'#374151'}}><span style={{fontWeight:500,color:'#4f46e5'}}>{familiasFiltradas.length}</span> famílias</div>
              <div style={{fontSize:'13px',color:'#374151'}}><span style={{fontWeight:500,color:'#4f46e5'}}>{grupos.length}</span> grupos (lugar/freguesia)</div>
              <div style={{fontSize:'13px',color:'#374151'}}><span style={{fontWeight:500,color:'#4f46e5'}}>{familiasFiltradas.reduce((s,f) => s + (f.familia_membros?.length||0) + 1, 0)}</span> pessoas</div>
            </div>

            {/* Mini preview dos grupos */}
            <div style={{maxHeight:'300px',overflowY:'auto',border:'1px solid #e5e7eb',borderRadius:'8px'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
                <thead style={{position:'sticky',top:0}}>
                  <tr style={{background:'#f8fafc'}}>
                    <th style={{textAlign:'left',padding:'6px 10px',fontSize:'10px',color:'#9ca3af',fontWeight:600,textTransform:'uppercase'}}>Nome</th>
                    <th style={{textAlign:'left',padding:'6px 10px',fontSize:'10px',color:'#9ca3af',fontWeight:600,textTransform:'uppercase'}}>Lugar · Freguesia</th>
                    <th style={{textAlign:'center',padding:'6px 10px',fontSize:'10px',color:'#9ca3af',fontWeight:600,textTransform:'uppercase'}}>Membros</th>
                    {incluirCotas && <th style={{textAlign:'center',padding:'6px 10px',fontSize:'10px',color:'#9ca3af',fontWeight:600,textTransform:'uppercase'}}>Cota</th>}
                  </tr>
                </thead>
                <tbody>
                  {grupos.map(([grupo, lista]) => (
                    <>
                      <tr key={`g-${grupo}`}>
                        <td colSpan={incluirCotas ? 4 : 3} style={{padding:'5px 10px',background:'#ede9fe',color:'#5b21b6',fontSize:'11px',fontWeight:700}}>
                          {grupo} — {lista.length} famílias
                        </td>
                      </tr>
                      {lista.map((f, i) => {
                        const cota = getCota(f)
                        return (
                          <tr key={f.id} style={{borderBottom:'1px solid #f9fafb'}}>
                            <td style={{padding:'4px 10px',color:'#111'}}>{f.chefe_nome}</td>
                            <td style={{padding:'4px 10px',color:'#6b7280'}}>{f.lugar?.nome || '—'} · {f.freguesia?.nome || '—'}</td>
                            <td style={{padding:'4px 10px',textAlign:'center',color:'#6b7280'}}>{(f.familia_membros?.length||0)+1}</td>
                            {incluirCotas && <td style={{padding:'4px 10px',textAlign:'center',color: cota?.pago ? '#059669' : '#dc2626',fontWeight:500}}>{cota?.valor || '—'}</td>}
                          </tr>
                        )
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Recibos — placeholder */}
      <div style={{...card, opacity: 0.6}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <h2 style={{fontSize:'15px',fontWeight:500,color:'#111'}}>Recibos de Cotas</h2>
            <p style={{fontSize:'12px',color:'#9ca3af',marginTop:'2px'}}>A5 · um recibo por família</p>
          </div>
          <span style={{fontSize:'12px',background:'#fef3c7',color:'#92400e',padding:'4px 10px',borderRadius:'20px',fontWeight:500}}>Em breve</span>
        </div>
        <p style={{fontSize:'13px',color:'#9ca3af',marginTop:'0.75rem'}}>A aguardar exemplo do recibo actual para definir o layout.</p>
      </div>
    </div>
  )
}
