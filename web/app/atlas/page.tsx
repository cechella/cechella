'use client'

import { useState } from 'react'

const task = {
  id: '17B01006',
  title: 'ANA Master — Gold Only UI',
  status: 'AGUARDANDO REVISÃO DO CEO',
  phase: 'CEO_APPROVAL',
  production: 'BLOQUEADA — CEO_ONLY',
  executor: 'Rafael — Software Engineer / Platform & Automation',
  coordinator: 'Gustavo — Chief Autonomous Officer (CAO)',
  files: [
    'web/app/admin/ana-master/page.tsx',
    'web/app/admin/ana-master/simulador/page.tsx',
  ],
  tests: [
    ['Vercel Preview', 'PASS'],
    ['Gold como fluxo visível', 'PASS'],
    ['Controller não montado nas telas', 'PASS'],
    ['Código do Controller preservado', 'PASS'],
    ['Produção não alterada', 'PASS'],
  ],
  preview: 'https://vercel.com/vcechella-4638s-projects/cechella/FUYhhd9DKSwDQzGA7KnvdQLJuwc5',
  pr: 'https://github.com/cechella/cechella/pull/5',
  commit: '9e84acc9a97de0e4cedf70f7938b3bf77fab0e44',
}

export default function AtlasCommandCenter() {
  const [open, setOpen] = useState(true)
  return <main style={{minHeight:'100vh',background:'#080b10',color:'#f4f7fb',fontFamily:'Inter,system-ui,sans-serif',padding:'32px'}}>
    <div style={{maxWidth:1180,margin:'0 auto'}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,marginBottom:28}}>
        <div><div style={{color:'#d7b46a',fontSize:12,letterSpacing:3,fontWeight:800}}>AGELESS · ATLAS</div><h1 style={{fontSize:34,margin:'8px 0 4px'}}>Command Center</h1><div style={{color:'#8f9bad'}}>Governança, execução e aprovações</div></div>
        <div style={{padding:'10px 14px',border:'1px solid #1f6f4a',borderRadius:12,color:'#78e2a8',background:'#0c2118'}}>● CORE ONLINE</div>
      </header>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12,marginBottom:20}}>
        {[[task.id,'Tarefa'],[task.phase,'Fase'],['2','Arquivos alterados'],['5/5','Checks de escopo']].map(([v,l])=><div key={l} style={{background:'#111722',border:'1px solid #202938',borderRadius:16,padding:18}}><div style={{fontSize:22,fontWeight:800}}>{v}</div><div style={{color:'#8996a8',fontSize:13,marginTop:5}}>{l}</div></div>)}
      </section>
      <section style={{background:'#111722',border:'1px solid #2c3749',borderRadius:18,overflow:'hidden'}}>
        <button onClick={()=>setOpen(!open)} style={{width:'100%',background:'transparent',color:'inherit',border:0,padding:22,textAlign:'left',cursor:'pointer',display:'flex',justifyContent:'space-between',gap:16}}>
          <span><b style={{fontSize:20}}>{task.id} · {task.title}</b><br/><span style={{color:'#e8bd68',fontSize:13}}>{task.status}</span></span><span>{open?'−':'+'}</span>
        </button>
        {open && <div style={{borderTop:'1px solid #202938',padding:22}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20}}>
            <div><Label>Coordenação</Label><P>{task.coordinator}</P><Label>Execução</Label><P>{task.executor}</P><Label>Gate de produção</Label><P danger>{task.production}</P></div>
            <div><Label>O que foi feito</Label><P>Controller removido da exposição/montagem nessas telas. Gold permanece como fluxo visível. A implementação do Controller foi preservada no código.</P></div>
          </div>
          <hr style={{border:0,borderTop:'1px solid #202938',margin:'20px 0'}}/>
          <Label>Arquivos modificados</Label>{task.files.map(f=><code key={f} style={{display:'block',background:'#090d13',padding:'11px 13px',borderRadius:9,margin:'7px 0',color:'#cbd6e4',overflowWrap:'anywhere'}}>{f}</code>)}
          <div style={{marginTop:20}}><Label>Validações</Label>{task.tests.map(([n,s])=><div key={n} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #1c2532'}}><span>{n}</span><b style={{color:'#75dda3'}}>{s}</b></div>)}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:22}}>
            <a href={task.preview} target="_blank" rel="noreferrer" style={primary}>Abrir Preview</a>
            <a href={task.pr} target="_blank" rel="noreferrer" style={secondary}>Inspecionar código / PR</a>
          </div>
          <div style={{marginTop:20,padding:14,borderRadius:12,background:'#231b0d',border:'1px solid #5c471e',color:'#e8c97e'}}>Produção não será executada por este painel. Revise o Preview e as evidências; a autorização formal continua sendo do CEO.</div>
          <div style={{color:'#647186',fontSize:12,marginTop:14}}>Commit: {task.commit}</div>
        </div>}
      </section>
    </div>
  </main>
}

function Label({children}:{children:React.ReactNode}) { return <div style={{color:'#8491a4',fontSize:12,textTransform:'uppercase',letterSpacing:1.2,fontWeight:700,marginTop:10}}>{children}</div> }
function P({children,danger=false}:{children:React.ReactNode,danger?:boolean}) { return <div style={{margin:'6px 0 14px',lineHeight:1.5,color:danger?'#f0c36b':'#e8edf4'}}>{children}</div> }
const primary={display:'inline-block',padding:'11px 16px',borderRadius:10,background:'#d5ad61',color:'#111',textDecoration:'none',fontWeight:800}
const secondary={display:'inline-block',padding:'11px 16px',borderRadius:10,border:'1px solid #344154',color:'#e9eef5',textDecoration:'none',fontWeight:700}
