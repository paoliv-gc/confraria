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
      <button onClick={() => setOpen(!open)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'0.4rem 0.75rem',fontSize:'13px',border:isActive?'1px solid #a5b4fc':'1px solid #e5e7eb',borderRadius:'8px',background:isActive?'#ede9fe':'white',color:isActive?'#5b21b6':'#374151',cursor:'pointer',whiteSpace:'nowrap'}}>
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

function titlePt(s) {
  const particles = new Set(['de','da','do','das','dos','e','a','o','em','com','por'])
  return s.split(' ').map((w, i) =>
    (i === 0 || !particles.has(w.toLowerCase()))
      ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      : w.toLowerCase()
  ).join(' ')
}

export default function Relatorios() {
  const [familias, setFamilias] = useState([])
  const [lugares, setLugares] = useState([])
  const [freguesias, setFreguesias] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros listagem
  const [filtroFreguesias, setFiltroFreguesias] = useState([])
  const [filtroLugares, setFiltroLugares] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('ativa')
  const [incluirCotas, setIncluirCotas] = useState(true)
  const [nomeConfraria, setNomeConfraria] = useState('Confraria das Almas')

  // Filtros recibos
  const [filtroFreguesiasRec, setFiltroFreguesiasRec] = useState([])
  const [filtroLugaresRec, setFiltroLugaresRec] = useState([])
  const [anoRecibo, setAnoRecibo] = useState(2026)

  useEffect(() => {
    async function init() {
      const [famRes, lugRes, freqRes] = await Promise.all([
        supabase.from('familias').select(`
          id, chefe_nome, ativo, morada, observacoes, numero_cota,
          lugar:lugar_id(id,nome), freguesia:freguesia_id(id,nome),
          familia_membros(id,nome),
          cotas_pagamentos(ano,num_membros,valor_total,pago)
        `).order('chefe_nome'),
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

  // Filtrar famílias listagem
  const familiasFiltradas = familias.filter(f => {
    if (filtroEstado === 'ativa' && !f.ativo) return false
    if (filtroEstado === 'inativa' && f.ativo) return false
    if (filtroFreguesias.length > 0 && !filtroFreguesias.includes(f.freguesia?.id?.toString())) return false
    if (filtroLugares.length > 0 && !filtroLugares.includes(f.lugar?.id?.toString())) return false
    return true
  })

  // Filtrar famílias recibos
  const familiasRecibos = familias.filter(f => {
    if (!f.ativo) return false
    if (filtroFreguesiasRec.length > 0 && !filtroFreguesiasRec.includes(f.freguesia?.id?.toString())) return false
    if (filtroLugaresRec.length > 0 && !filtroLugaresRec.includes(f.lugar?.id?.toString())) return false
    return true
  })

  // Agrupar por freguesia/lugar
  function agrupar(lista) {
    const porFreguesia = {}
    for (const f of lista) {
      const fr = f.freguesia?.nome || 'Sem freguesia'
      if (!porFreguesia[fr]) porFreguesia[fr] = []
      porFreguesia[fr].push(f)
    }
    const resultado = []
    for (const [freguesia, membros] of Object.entries(porFreguesia).sort(([a],[b]) => a.localeCompare(b))) {
      if (freguesia === 'Gavião') {
        const porLugar = {}
        for (const f of membros) {
          const lu = f.lugar?.nome || 'Sem lugar'
          if (!porLugar[lu]) porLugar[lu] = []
          porLugar[lu].push(f)
        }
        for (const [lugar, fams] of Object.entries(porLugar).sort(([a],[b]) => a.localeCompare(b))) {
          resultado.push([`Gavião · ${lugar}`, fams])
        }
      } else {
        resultado.push([freguesia, membros])
      }
    }
    return resultado
  }

  const grupos = agrupar(familiasFiltradas)
  const anoAtual = new Date().getFullYear()

  function getCota(f, ano) {
    const c = f.cotas_pagamentos?.find(c => c.ano === ano)
    return c ? { valor: parseFloat(c.valor_total).toFixed(2) + '€', pago: c.pago } : null
  }

  // ── IMPRIMIR LISTAGEM ──
  function imprimirListagem() {
    const dataHoje = new Date().toLocaleDateString('pt-PT')
    const totalFamilias = familiasFiltradas.length
    const totalMembros = familiasFiltradas.reduce((s,f) => s + (f.familia_membros?.length||0) + 1, 0)

    let html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8">
<title>Listagem — ${nomeConfraria}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
  @page { size: A4 portrait; margin: 15mm 12mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #1a5c35; }
  .brand-name { font-size: 14px; font-weight: 700; color: #111; }
  .doc-title { font-size: 18px; font-weight: 300; color: #1a5c35; margin-top: 2px; }
  .meta { text-align: right; font-size: 10px; color: #9ca3af; line-height: 1.6; }
  .section { font-size: 10px; font-weight: 700; color: #1a5c35; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 0; margin: 12px 0 5px; border-bottom: 1px solid #c0dac8; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { text-align: left; padding: 4px 6px; color: #9ca3af; font-weight: 700; font-size: 9px; text-transform: uppercase; background: #f8fdf9; }
  td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) td { background: #f8fdf9; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid #e5e7eb; }
</style></head><body>`

    html += `<div class="header"><div><div class="brand-name">⚜ ${nomeConfraria}</div><div class="doc-title">Listagem de Famílias</div></div><div class="meta">Impresso em ${dataHoje}<br>${totalFamilias} famílias · ${totalMembros} pessoas</div></div>`

    for (const [grupo, lista] of grupos) {
      html += `<div class="section">${grupo} — ${lista.length} famílias</div>`
      html += `<table><thead><tr><th>#</th><th>Nome</th><th>Morada</th><th>Membros</th>`
      if (incluirCotas) html += `<th>Cota ${anoAtual}</th><th>Pago?</th>`
      html += `</tr></thead><tbody>`
      lista.forEach((f, i) => {
        const cota = getCota(f, anoAtual)
        html += `<tr><td>${i+1}</td><td>${titlePt(f.chefe_nome)}</td><td>${f.morada||'—'}</td><td>${(f.familia_membros?.length||0)+1}</td>`
        if (incluirCotas) html += `<td>${cota?.valor||'—'}</td><td>${cota?(cota.pago?'Sim':'Não'):'—'}</td>`
        html += `</tr>`
      })
      html += `</tbody></table>`
    }

    html += `<div class="footer"><span>${nomeConfraria}</span><span>Impresso em ${dataHoje}</span></div></body></html>`
    const w = window.open('', '_blank')
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 500)
  }

  // ── IMPRIMIR RECIBOS ──
  function imprimirRecibos() {
    const recibosOrdenados = [...familiasRecibos].sort((a, b) => {
      const luA = a.lugar?.nome || ''; const luB = b.lugar?.nome || ''
      if (luA !== luB) return luA.localeCompare(luB)
      return a.chefe_nome.localeCompare(b.chefe_nome)
    })

    const css = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, Helvetica, sans-serif; background: white; }
      @page { size: 210mm 148mm; margin: 4mm; }
      .recibo { width: 100%; height: 136mm; page-break-after: always; background: white; border: 1px solid #1a5c35; display: flex; flex-direction: column; overflow: hidden; }
      .recibo:last-child { page-break-after: avoid; }
      .header { display: flex; border-bottom: 1.5px solid #1a5c35; flex-shrink: 0; height: 26mm; }
      .logo-col { width: 34mm; min-width: 34mm; display: flex; align-items: center; justify-content: center; padding: 3mm; border-right: 0.5px solid #c0dac8; }
      .logo-img { max-width: 30mm; max-height: 28mm; object-fit: contain; }
      .title-col { flex: 1; display: flex; flex-direction: column; }
      .title-top { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2mm 4mm; border-bottom: 0.5px solid #c0dac8; }
      .title-name { font-size: 11pt; font-weight: 700; color: #1a5c35; letter-spacing: 0.06em; }
      .title-sub { font-size: 7pt; color: #2d6a4f; margin-top: 1.5mm; letter-spacing: 0.04em; }
      .title-nif { font-size: 6pt; color: #5a8a72; margin-top: 1mm; }
      .meta-row { display: flex; height: 12mm; flex-shrink: 0; }
      .meta-box { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1mm 2mm; border-right: 0.5px solid #c0dac8; gap: 1px; }
      .meta-box:last-child { border-right: none; flex: 2; }
      .meta-label { font-size: 5pt; font-weight: 700; color: #2d6a4f; text-transform: uppercase; letter-spacing: 0.15em; }
      .meta-val { font-size: 14pt; font-weight: 700; color: #111; line-height: 1; }
      .meta-val.green { color: #1a5c35; font-size: 16pt; }
      .fields { border-bottom: 1.5px solid #1a5c35; flex-shrink: 0; background: #f8fdf9; }
      .field { display: grid; grid-template-columns: 23mm 1fr; align-items: center; padding: 0.8mm 4mm; border-bottom: 0.3px solid #ddeee5; min-height: 5.5mm; }
      .field:last-child { border-bottom: none; }
      .flabel { font-size: 5.5pt; font-weight: 700; color: #2d6a4f; letter-spacing: 0.2em; text-transform: uppercase; }
      .fvalue { font-size: 9pt; color: #111; font-family: "Palatino Linotype", Georgia, serif; border-bottom: 0.3px solid #b8d4c4; padding-bottom: 0.5mm; }
      .body { flex: 1; display: flex; overflow: hidden; }
      .col-agregado { flex: 58; border-right: 1.5px solid #1a5c35; display: flex; flex-direction: column; }
      .col-obs { flex: 42; display: flex; flex-direction: column; }
      .col-header { font-size: 6pt; font-weight: 700; color: #1a5c35; letter-spacing: 0.18em; text-transform: uppercase; text-align: center; padding: 1.5mm; border-bottom: 0.5px solid #1a5c35; background: #eef8f2; }
      .col-body { flex: 1; padding: 2mm 4mm; overflow: hidden; }
      .membro { font-size: 8.5pt; color: #111; padding: 1.2mm 0; border-bottom: 0.2px solid #e4f0e8; font-family: "Palatino Linotype", Georgia, serif; }
      .obs-text { font-size: 8pt; color: #444; line-height: 1.5; font-style: italic; font-family: "Palatino Linotype", Georgia, serif; }
      .footer { border-top: 0.5px solid #1a5c35; padding: 1mm 4mm; background: #eef8f2; flex-shrink: 0; }
      .footer-txt { font-size: 5pt; color: #2d6a4f; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.75; }
    `

    let body = ''
    recibosOrdenados.forEach((f, idx) => {
      const cota = f.cotas_pagamentos?.find(c => c.ano === anoRecibo)
      const valor = cota ? parseFloat(cota.valor_total).toFixed(2).replace('.', ',') + ' €' : '0,00 €'
      const numRecibo = f.numero_cota || String(idx + 1)
      const membros = f.familia_membros || []
      const lugarMorada = [f.lugar?.nome, f.morada].filter(Boolean).join(' - ')

      body += `<div class="recibo">
        <div class="header">
          <div class="logo-col"><img src="/logo.png" class="logo-img" /></div>
          <div class="title-col">
            <div class="title-top">
              <div class="title-name">CONFRARIA DAS ALMAS</div>
              <div class="title-sub">Gavião &mdash; V. N. Famalicão</div>
              <div class="title-nif">Contribuinte N.º 501 467 262</div>
            </div>
            <div class="meta-row">
              <div class="meta-box"><div class="meta-label">Ano</div><div class="meta-val">${anoRecibo}</div></div>
              <div class="meta-box"><div class="meta-label">N.º Recibo</div><div class="meta-val">${numRecibo}</div></div>
              <div class="meta-box"><div class="meta-label">Valor Euros</div><div class="meta-val green">${valor}</div></div>
            </div>
          </div>
        </div>
        <div class="fields">
          <div class="field"><span class="flabel">N O M E</span><span class="fvalue">${titlePt(f.chefe_nome)}</span></div>
          <div class="field"><span class="flabel">M O R A D A</span><span class="fvalue">${lugarMorada || '—'}</span></div>
          <div class="field"><span class="flabel">F R E G U E S I A</span><span class="fvalue">${f.freguesia?.nome || '—'}</span></div>
          <div class="field"><span class="flabel">C O N C E L H O</span><span class="fvalue">Vila Nova de Famalicão</span></div>
        </div>
        <div class="body">
          <div class="col-agregado">
            <div class="col-header">Agregado Familiar</div>
            <div class="col-body">${membros.map(m => `<div class="membro">${m.nome}</div>`).join('')}</div>
          </div>
          <div class="col-obs">
            <div class="col-header">Observa&ccedil;&otilde;es</div>
            <div class="col-body obs-text">${f.observacoes || ''}</div>
          </div>
        </div>
        <div class="footer"><span class="footer-txt">Processado por Computador</span></div>
      </div>`
    })

    const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><title>Recibos</title><style>${css}</style></head><body>${body}</body></html>`
    const w = window.open('', '_blank')
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 600)
  }

  // ── EXPORTAR EXCEL ──
  async function exportarExcel() {
    const rows = [['#', 'Nome', 'Lugar', 'Freguesia', 'Morada', 'Nº Membros', `Cota ${anoAtual}`, 'Pago?']]
    let seq = 1
    for (const [, lista] of grupos) {
      for (const f of lista) {
        const cota = getCota(f, anoAtual)
        rows.push([seq++, titlePt(f.chefe_nome), f.lugar?.nome||'', f.freguesia?.nome||'', f.morada||'', (f.familia_membros?.length||0)+1, cota?.valor||'', cota?(cota.pago?'Sim':'Não'):''])
      }
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `listagem_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const lugaresOpts = lugares.map(l => ({ value: l.id.toString(), label: l.nome }))
  const freguesiasOpts = freguesias.map(f => ({ value: f.id.toString(), label: f.nome }))

  return (
    <div>
      <h1 style={{fontSize:'22px',fontWeight:500,marginBottom:'1.5rem'}}>Relatórios</h1>

      {/* ── LISTAGEM ── */}
      <div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
          <div>
            <h2 style={{fontSize:'15px',fontWeight:500,color:'#111'}}>Listagem de Famílias</h2>
            <p style={{fontSize:'12px',color:'#9ca3af',marginTop:'2px'}}>A4 · agrupado por lugar/freguesia</p>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={exportarExcel} style={{padding:'0.45rem 1rem',fontSize:'13px',fontWeight:500,border:'1px solid #e5e7eb',borderRadius:'8px',background:'white',color:'#374151',cursor:'pointer'}}>↓ Excel</button>
            <button onClick={imprimirListagem} style={{padding:'0.45rem 1rem',fontSize:'13px',fontWeight:500,background:'#4f46e5',color:'white',border:'none',borderRadius:'8px',cursor:'pointer'}}>🖨 Imprimir</button>
          </div>
        </div>
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
            Incluir cotas {anoAtual}
          </label>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'6px'}}>
            <span style={{fontSize:'12px',color:'#9ca3af'}}>Nome:</span>
            <input value={nomeConfraria} onChange={e => setNomeConfraria(e.target.value)} style={{fontSize:'12px',padding:'3px 8px',width:'200px'}} />
          </div>
        </div>
        {loading ? <p style={{fontSize:'13px',color:'#9ca3af'}}>A carregar...</p> : (
          <div>
            <div style={{display:'flex',gap:'16px',marginBottom:'0.75rem'}}>
              <div style={{fontSize:'13px'}}><span style={{fontWeight:500,color:'#4f46e5'}}>{familiasFiltradas.length}</span> famílias</div>
              <div style={{fontSize:'13px'}}><span style={{fontWeight:500,color:'#4f46e5'}}>{grupos.length}</span> grupos</div>
              <div style={{fontSize:'13px'}}><span style={{fontWeight:500,color:'#4f46e5'}}>{familiasFiltradas.reduce((s,f)=>s+(f.familia_membros?.length||0)+1,0)}</span> pessoas</div>
            </div>
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
                        <td colSpan={incluirCotas?4:3} style={{padding:'5px 10px',background:'#ede9fe',color:'#5b21b6',fontSize:'11px',fontWeight:700}}>{grupo} — {lista.length} famílias</td>
                      </tr>
                      {lista.map(f => {
                        const cota = getCota(f, anoAtual)
                        return (
                          <tr key={f.id} style={{borderBottom:'1px solid #f9fafb'}}>
                            <td style={{padding:'4px 10px'}}>{titlePt(f.chefe_nome)}</td>
                            <td style={{padding:'4px 10px',color:'#6b7280'}}>{f.lugar?.nome||'—'} · {f.freguesia?.nome||'—'}</td>
                            <td style={{padding:'4px 10px',textAlign:'center',color:'#6b7280'}}>{(f.familia_membros?.length||0)+1}</td>
                            {incluirCotas && <td style={{padding:'4px 10px',textAlign:'center',color:cota?.pago?'#059669':'#dc2626',fontWeight:500}}>{cota?.valor||'—'}</td>}
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

      {/* ── RECIBOS ── */}
      <div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
          <div>
            <h2 style={{fontSize:'15px',fontWeight:500,color:'#111'}}>Recibos de Cotas</h2>
            <p style={{fontSize:'12px',color:'#9ca3af',marginTop:'2px'}}>A5 paisagem · um por folha</p>
          </div>
          <button onClick={imprimirRecibos} style={{padding:'0.45rem 1rem',fontSize:'13px',fontWeight:500,background:'#059669',color:'white',border:'none',borderRadius:'8px',cursor:'pointer'}}>🖨 Imprimir Recibos</button>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center',padding:'0.75rem',background:'#f8fafc',borderRadius:'8px',border:'1px solid #e5e7eb',marginBottom:'1rem'}}>
          <span style={{fontSize:'12px',color:'#6b7280',fontWeight:500}}>Filtros:</span>
          <MultiSelect label="freguesias" options={freguesiasOpts} selected={filtroFreguesiasRec} onChange={setFiltroFreguesiasRec} />
          <MultiSelect label="lugares" options={lugaresOpts} selected={filtroLugaresRec} onChange={setFiltroLugaresRec} />
          <div style={{display:'flex',alignItems:'center',gap:'6px',marginLeft:'8px'}}>
            <span style={{fontSize:'12px',color:'#9ca3af'}}>Ano:</span>
            <select value={anoRecibo} onChange={e => setAnoRecibo(parseInt(e.target.value))} style={{fontSize:'13px',padding:'0.4rem 0.75rem'}}>
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>
        <div style={{fontSize:'13px',color:'#374151'}}>
          <span style={{fontWeight:500,color:'#059669'}}>{familiasRecibos.length}</span> recibos a imprimir
          {filtroFreguesiasRec.length === 0 && filtroLugaresRec.length === 0 && (
            <span style={{fontSize:'12px',color:'#9ca3af',marginLeft:'8px'}}>(selecciona freguesia ou lugar para filtrar)</span>
          )}
        </div>
      </div>
    </div>
  )
}
