import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { localTitles, localDesc, localTags, localScript } from '../utils/ai'

export default function AIPage() {
  const { showToast } = useApp()
  const [topic,  setTopic]  = useState('')
  const [lang,   setLang]   = useState('Hindi')
  const [output, setOutput] = useState(null)
  const [loading,setLoading]= useState(false)
  const gen = async (type) => {
    if (!topic.trim()) { showToast('⚠️ Topic enter karo!', 'err'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 200))
    if (type==='title')  setOutput({ type, data: localTitles(topic) })
    if (type==='desc')   setOutput({ type, data: localDesc(topic) })
    if (type==='tags')   setOutput({ type, data: localTags(topic) })
    if (type==='script') setOutput({ type, data: localScript(topic) })
    setLoading(false)
    showToast('✨ Generated!', 'ok')
  }
  const copy = (txt) => { navigator.clipboard?.writeText(txt); showToast('📋 Copied!', 'ok') }
  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bebas text-[15px] tracking-widest">🤖 AI CONTENT STUDIO</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="font-mono text-[10px] text-muted2 tracking-widest uppercase block mb-1.5">Video Topic / Keyword</label>
            <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Mehnat karo succeed hoge" onKeyDown={e=>e.key==='Enter'&&gen('title')}
              className="w-full bg-s2 border border-border text-txt px-3 py-2.5 rounded-xl text-[13px] outline-none focus:border-red/40 transition-all placeholder:text-muted"/>
          </div>
          <div>
            <label className="font-mono text-[10px] text-muted2 tracking-widest uppercase block mb-1.5">Language</label>
            <select value={lang} onChange={e=>setLang(e.target.value)} className="w-full bg-s2 border border-border text-txt px-3 py-2.5 rounded-xl text-[13px] outline-none cursor-pointer">
              <option>Hindi</option><option>English</option><option>Hinglish</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[['title','🏷️ Titles'],['desc','📝 Description'],['tags','🔖 Tags'],['script','📜 Script']].map(([type,label])=>(
              <button key={type} onClick={()=>gen(type)} disabled={loading}
                className="py-3 rounded-xl border border-border bg-s2 text-[12px] font-semibold text-muted2 hover:border-border2 hover:text-txt transition-all disabled:opacity-50">
                {loading?'⏳':label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bebas text-[15px] tracking-widest">✨ OUTPUT</h2>
          {output && <button onClick={()=>copy(Array.isArray(output.data)?output.data.join('\n'):output.data)} className="font-mono text-[10px] px-3 py-1.5 rounded-lg border border-blue/30 bg-blue/8 text-blue hover:bg-blue/15 transition-colors">📋 Copy All</button>}
        </div>
        <div className="p-5">
          {!output ? (
            <div className="text-center py-12 text-muted2">
              <div className="text-4xl mb-3">✨</div>
              <p className="font-mono text-[12px]">Topic daalo aur generate karo</p>
            </div>
          ) : output.type==='title' ? (
            <div className="space-y-2">
              {output.data.map((t,i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-s2 border border-border rounded-xl group hover:border-border2">
                  <span className="font-mono text-[10px] text-muted2 w-4">{i+1}</span>
                  <p className="flex-1 text-[12px]">{t}</p>
                  <button onClick={()=>copy(t)} className="opacity-0 group-hover:opacity-100 font-mono text-[9px] px-2 py-1 rounded bg-blue/10 border border-blue/20 text-blue transition-all">Copy</button>
                </div>
              ))}
            </div>
          ) : output.type==='tags' ? (
            <div className="flex flex-wrap gap-2">
              {output.data.map(t => (
                <span key={t} onClick={()=>copy(t)} className="font-mono text-[11px] px-2.5 py-1 rounded-full bg-red/10 border border-red/20 text-red cursor-pointer hover:bg-red/20 transition-colors">#{t}</span>
              ))}
            </div>
          ) : (
            <div className="bg-s2 border border-border rounded-xl p-4 font-mono text-[11px] text-muted2 whitespace-pre-wrap max-h-[400px] overflow-y-auto">{output.data}</div>
          )}
        </div>
      </div>
    </div>
  )
}