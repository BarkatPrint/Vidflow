import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { generateAI } from '../utils/ai'

const API = '/api'

// ── KEN BURNS DRAW ENGINE ────────────────────────────────────────
function pickEff(eff, idx) {
  if (eff === 'none') return 'none'
  if (eff !== 'random') return eff
  return ['zoom-in','zoom-out','pan-right','pan-left','zoom-pan','pulse'][idx % 6]
}
function drawFrame(canvas, img, t, eff, txt) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height
  ctx.clearRect(0,0,W,H); ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H)
  let sc=1, tx=0, ty=0
  if(eff==='none')       sc=1  // static — no movement
  else if(eff==='zoom-in')   sc=1+t*0.32
  else if(eff==='zoom-out')  sc=1.32-t*0.32
  else if(eff==='pan-right') { sc=1.22; tx=-W*0.13*(1-t) }
  else if(eff==='pan-left')  { sc=1.22; tx=W*0.13*(1-t) }
  else if(eff==='zoom-pan')  { sc=1+t*0.26; tx=W*0.07*(1-t*2); ty=H*0.03*t }
  else if(eff==='pulse')     sc=1+Math.sin(t*Math.PI*4)*0.07
  ctx.save(); ctx.translate(W/2+tx, H/2+ty); ctx.scale(sc,sc)
  const ir=img.width/img.height, cr=W/H
  let dw,dh; if(ir>cr){dh=H;dw=dh*ir}else{dw=W;dh=dw/ir}
  ctx.drawImage(img,-dw/2,-dh/2,dw,dh); ctx.restore()
  if (txt) {
    const g=ctx.createLinearGradient(0,H*0.55,0,H)
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.85)')
    ctx.fillStyle=g; ctx.fillRect(0,H*0.55,W,H*0.45)
    const ta=t<0.12?t/0.12:t>0.88?(1-t)/0.12:1
    ctx.save(); ctx.globalAlpha=ta
    const fs=Math.max(20, Math.round(W*0.048))
    ctx.font=`bold ${fs}px sans-serif`; ctx.textAlign='center'
    ctx.shadowColor='rgba(0,0,0,0.98)'; ctx.shadowBlur=20; ctx.fillStyle='#fff'
    const words=txt.split(' '); let line='',lines=[]
    for(const w of words){
      const test=line+w+' '
      if(ctx.measureText(test).width>W*0.86&&line){lines.push(line.trim());line=w+' '}else line=test
    }
    if(line.trim())lines.push(line.trim())
    lines.slice(0,2).forEach((l,i)=>ctx.fillText(l,W/2,H*0.87+i*(fs*1.28)))
    ctx.restore()
  }
  const ft=0.1
  if(t<ft){ctx.fillStyle=`rgba(0,0,0,${1-t/ft})`;ctx.fillRect(0,0,W,H)}
  if(t>1-ft){ctx.fillStyle=`rgba(0,0,0,${(t-(1-ft))/ft})`;ctx.fillRect(0,0,W,H)}
}

// ── MAKE VIDEO BLOB ──────────────────────────────────────────────
async function makeBlob(img, dur, fps, eff, idx, size, audioBuf, txt, onP) {
  const [W,H] = size.split('x').map(Number)
  const c = document.createElement('canvas'); c.width=W; c.height=H
  const stream = c.captureStream(fps)
  if (audioBuf) {
    try {
      const actx = new(window.AudioContext||window.webkitAudioContext)()
      const dec  = await actx.decodeAudioData(audioBuf.slice(0))
      const src  = actx.createBufferSource()
      const gain = actx.createGain()
      src.buffer=dec; src.loop=true; gain.gain.value=0.72
      src.connect(gain)
      const dest = actx.createMediaStreamDestination()
      gain.connect(dest); src.start(0)
      dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t))
    } catch{}
  }
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm'
  const rec  = new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:7_000_000})
  const chunks=[]
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
  const ef = pickEff(eff,idx)
  return new Promise(resolve=>{
    rec.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}))
    rec.start()
    const total=dur*fps; let f=0
    const next=()=>{
      if(f>=total){rec.stop();return}
      drawFrame(c,img,f/total,ef,txt); onP&&onP(Math.round((f/total)*100)); f++
      setTimeout(next,1000/fps)
    }
    next()
  })
}

// ── YOUTUBE UPLOAD via backend proxy ────────────────────────────
async function ytUpload(blob, mimeType, meta, token) {

  // STEP 1: INIT UPLOAD
  const initRes = await fetch('/api/youtube/upload/init', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-access-token': token
    },
    body: JSON.stringify({
      metadata: meta,
      mimeType,
      fileSize: blob.size
    }),
  })

  const initData = await initRes.json()

  if (!initRes.ok || initData.error) {
    throw new Error(initData.error || 'Upload init failed')
  }

  // STEP 2: CONVERT BLOB → BASE64
  const buffer = await blob.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(buffer)
      .reduce((data, byte) => data + String.fromCharCode(byte), '')
  )

  // STEP 3: UPLOAD VIA BACKEND
  const uploadRes = await fetch('/api/youtube/upload/put', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token
    },
    body: JSON.stringify({
      uploadUrl: initData.uploadUrl,
      mimeType,
      file: { data: base64 }
    })
  })

  const uploadData = await uploadRes.json()

  if (!uploadRes.ok) {
    throw new Error(uploadData.error || 'Upload failed')
  }

  return initData.videoId || null
}


// ── CONSTANTS ────────────────────────────────────────────────────
const EFFECTS=[
  {id:'none',l:'🖼️ No Animation'},
  {id:'zoom-in',l:'🔍 Zoom In'},{id:'zoom-out',l:'🔭 Zoom Out'},
  {id:'pan-right',l:'➡️ Pan Right'},{id:'pan-left',l:'⬅️ Pan Left'},
  {id:'zoom-pan',l:'🎬 Zoom+Pan'},{id:'pulse',l:'💫 Pulse'},{id:'random',l:'🎲 Random'},
]
const SIZES=[
  {v:'1080x1920',l:'9:16 Shorts'},{v:'1920x1080',l:'16:9 Wide'},{v:'1080x1080',l:'1:1 Square'},
]

// ═══════════════════════════════════════════════════════════════
//  EDIT MODAL
// ═══════════════════════════════════════════════════════════════
function EditModal({ item, onSave, onClose }) {
  const [title, setTitle] = useState(item.ai.title)
  const [desc,  setDesc]  = useState(item.ai.desc)
  const [tags,  setTags]  = useState([...item.ai.tags])
  const [tagV,  setTagV]  = useState('')
  const regen = () => { const a=generateAI(item.name); setTitle(a.title); setDesc(a.desc); setTags(a.tags) }
  const save  = () => onSave({ ...item, ai:{...item.ai,title,desc,tags}, edited:true })
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="bg-s1 border border-border rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-s1 z-10">
          <div className="flex items-center gap-3">
            {item.type==='image'
              ? <img src={item.url} alt="" className="w-12 h-12 rounded-xl object-cover border border-border"/>
              : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue/30 to-red/20 flex items-center justify-center text-2xl border border-border">🎬</div>
            }
            <div>
              <p className="font-bebas text-[15px] tracking-widest text-txt">✏️ EDIT METADATA</p>
              <p className="font-mono text-[10px] text-muted2 truncate max-w-[300px]">{item.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={regen} className="font-mono text-[10px] px-3 py-1.5 rounded-lg border border-yellow/30 bg-yellow/8 text-yellow hover:bg-yellow/15 transition-colors">✨ AI Regenerate All</button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-s2 border border-border text-muted2 hover:text-txt flex items-center justify-center">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[10px] text-muted2 uppercase tracking-widest font-semibold">Title <span className="text-red">*</span></label>
              <span className={"font-mono text-[9px] " + (title.length>90?'text-red':'text-muted2')}>{title.length}/100</span>
            </div>
            <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100}
              className="w-full bg-s2 border border-border text-txt px-4 py-3 rounded-xl text-[13px] outline-none focus:border-red/50 transition-all"/>
          </div>
          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[10px] text-muted2 uppercase tracking-widest font-semibold">Description</label>
              <button onClick={()=>setDesc(generateAI(item.name).desc)} className="font-mono text-[9px] px-2 py-1 rounded border border-yellow/25 text-yellow hover:bg-yellow/10 transition-colors">✨ Regen</button>
            </div>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={6}
              className="w-full bg-s2 border border-border text-txt px-4 py-3 rounded-xl text-[13px] outline-none focus:border-red/50 transition-all resize-y leading-relaxed"/>
          </div>
          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[10px] text-muted2 uppercase tracking-widest font-semibold">Tags</label>
              <button onClick={()=>setTags(generateAI(item.name).tags)} className="font-mono text-[9px] px-2 py-1 rounded border border-yellow/25 text-yellow hover:bg-yellow/10 transition-colors">✨ Regen</button>
            </div>
            <div className="bg-s2 border border-border rounded-xl p-3 flex flex-wrap gap-1.5 min-h-[52px] focus-within:border-red/40 transition-colors cursor-text">
              {tags.map(t=>(
                <span key={t} className="flex items-center gap-1 bg-red/12 border border-red/25 text-red text-[10px] px-2 py-0.5 rounded-full font-mono">
                  #{t}
                  <button onClick={()=>setTags(p=>p.filter(x=>x!==t))} className="ml-0.5 text-muted hover:text-red leading-none">×</button>
                </span>
              ))}
              <input value={tagV} onChange={e=>setTagV(e.target.value)}
                onKeyDown={e=>{if((e.key==='Enter'||e.key===',')&&tagV.trim()){e.preventDefault();const v=tagV.trim().replace(/,$/,'');if(v&&!tags.includes(v)){setTags(p=>[...p,v])};setTagV('')}}}
                placeholder={tags.length?'':'Type + Enter to add...'}
                className="bg-transparent outline-none text-txt font-mono text-[11px] flex-1 min-w-[120px]"/>
            </div>
            <p className="font-mono text-[9px] text-muted mt-1">{tags.length} tags • Type + Enter ya comma se add karo</p>
          </div>
          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-muted2 font-semibold hover:border-border2 hover:text-txt transition-all">Cancel</button>
            <button onClick={save} className="flex-2 px-10 py-3 rounded-xl bg-gradient-to-r from-red to-red2 text-white font-bebas text-[16px] tracking-[2px] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(255,45,85,.45)] transition-all">💾 SAVE CHANGES</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  MAIN UPLOAD PAGE
// ═══════════════════════════════════════════════════════════════
export default function UploadPage() {
  const { accessToken, channelInfo, showToast, addUpload } = useApp()

  // Files state
  const [items,    setItems]    = useState([])   // { id, url, img?, name, type, ai, file, edited }
  const [editItem, setEditItem] = useState(null)
  const [selIdx,   setSelIdx]   = useState(0)

  // Video settings (for images → video)
  const [effect,   setEffect]   = useState('zoom-pan')
  const [duration, setDuration] = useState(5)
  const [size,     setSize]     = useState('1080x1920')
  const [fps,      setFps]      = useState(30)
  const [showTxt,  setShowTxt]  = useState(true)

  // Music
  const [musicMode, setMusicMode] = useState('none')  // none | custom
  const [musicFile, setMusicFile] = useState(null)
  const [musicBuf,  setMusicBuf]  = useState(null)

  // Publish
  const [visibility, setVisibility] = useState('public')
  const [pubMode,    setPubMode]    = useState('now')
  const [schedDate,  setSchedDate]  = useState(new Date().toISOString().split('T')[0])
  const [schedTime,  setSchedTime]  = useState('09:00')
  const [schedGap,   setSchedGap]   = useState(10)

  // Runtime
  const [phase,    setPhase]    = useState('idle')
  const [log,      setLog]      = useState([])
  const [curIdx,   setCurIdx]   = useState(-1)
  const [curProg,  setCurProg]  = useState(0)
  const [curStage, setCurStage] = useState('')
  const stopRef   = useRef(false)
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const tsRef     = useRef(null)
  const prevOnRef = useRef(false)

  const doneCount = log.filter(l=>l.status==='done').length
  const errCount  = log.filter(l=>l.status==='error').length
  const isRunning = phase==='running'
  const failedItems = items.filter((_,i)=>log[i]?.status==='error')
  const [W,H]     = size.split('x').map(Number)
  const PW=200, PH=Math.round(PW*H/W)

  // Canvas init
  useEffect(()=>{
    if(!canvasRef.current) return
    canvasRef.current.width=W; canvasRef.current.height=H
    const it=items[selIdx]
    if(it?.type==='image'){
      const ef=pickEff(effect,selIdx)
      drawFrame(canvasRef.current,it.img,0,ef,showTxt?it.ai.title.slice(0,55):null)
    }
  },[size,effect,showTxt,items.length])

  // AI image analysis — detect dominant color/brightness to pick topic
  const analyzeImage = useCallback((img, filename) => {
    try {
      const c = document.createElement('canvas'); c.width=32; c.height=32
      const ctx = c.getContext('2d'); ctx.drawImage(img,0,0,32,32)
      const d = ctx.getImageData(0,0,32,32).data
      let r=0,g=0,b=0,bright=0
      for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];bright+=(d[i]+d[i+1]+d[i+2])/3}
      const px=d.length/4; r/=px; g/=px; b/=px; bright/=px
      // Detect dominant color for topic hint
      const isGreen=g>r+20&&g>b+20
      const isBlue=b>r+20&&b>g+10
      const isRed=r>g+30&&r>b+30
      const isBright=bright>180
      const isDark=bright<60
      // Pick AI topic based on image characteristics + filename
      const fname = filename.replace(/\.[^.]+$/, '').replace(/[-_()[\].0-9]+/g,' ').trim()
      const topics = [
        'Motivation aur success ki kahani',
        'Zindagi badalne wali baat',
        'Ek din sab badal jayega',
        'Mehnat ka fal zaroor milta hai',
        'Khud pe yakeen rakho',
        'Hard work beats talent',
        'Sapne dekho aur pura karo',
        'Ye video aapki soch badal dega',
      ]
      // Use filename if it seems meaningful, else pick from topics
      const cleanName = fname.replace(/\s+/g,' ').trim()
      const useName = cleanName.length > 5 && !/^(img|image|photo|pic|dsc|screenshot|file|video|clip|mov|mp4|jpg|jpeg|png)\d*$/i.test(cleanName)
      const topic = useName ? cleanName : topics[Math.floor(Math.random()*topics.length)]
      return generateAI(topic)
    } catch {
      return generateAI(filename)
    }
  }, [])

  // Add files
  const addFiles = useCallback((files) => {
    let count=0
    Array.from(files).forEach(file=>{
      const isImg=file.type.startsWith('image/')
      const isVid=file.type.startsWith('video/')
      if(!isImg&&!isVid) return
      count++
      const url=URL.createObjectURL(file)
      if(isImg){
        const img=new Image()
        img.onload=()=>{
          const ai=analyzeImage(img, file.name)
          setItems(prev=>[...prev,{id:Date.now()+Math.random()*9999,url,img,name:file.name,type:'image',ai,file,edited:false}])
        }
        img.src=url
      } else {
        const ai=generateAI(file.name)
        setItems(prev=>[...prev,{id:Date.now()+Math.random()*9999,url,name:file.name,type:'video',ai,file,edited:false}])
      }
    })
    if(count>0) showToast(`✅ ${count} files added!`,'ok')
    else showToast('⚠️ Only images/videos allowed','err')
  },[showToast, analyzeImage])

  const removeItem = id => setItems(p=>p.filter(x=>x.id!==id))

  // Music
  const onMusic = async(file)=>{
    if(!file) return
    setMusicFile(file)
    const buf=await file.arrayBuffer(); setMusicBuf(buf)
    showToast('🎵 Music ready!','ok')
  }

  // Preview
  const stopPrev=()=>{
    prevOnRef.current=false
    if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=null}
  }
  const playPrev=useCallback((idx)=>{
    if(!items.length||idx<0||idx>=items.length) return
    const it=items[idx]
    if(it.type!=='image') return
    stopPrev(); prevOnRef.current=true; tsRef.current=null
    const ef=pickEff(effect,idx)
    const txt=showTxt?it.ai.title.slice(0,55):null
    if(canvasRef.current){canvasRef.current.width=W;canvasRef.current.height=H}
    const loop=(ts)=>{
      if(!prevOnRef.current) return
      if(!tsRef.current) tsRef.current=ts
      const el=(ts-tsRef.current)/1000
      if(el>=duration) tsRef.current=ts
      const t=(el%duration)/duration
      if(canvasRef.current) drawFrame(canvasRef.current,it.img,t,ef,txt)
      rafRef.current=requestAnimationFrame(loop)
    }
    rafRef.current=requestAnimationFrame(loop)
  },[items,effect,duration,showTxt,W,H])

  // Select item
  const selectItem=(idx)=>{
    setSelIdx(idx)
    if(items[idx]?.type==='image') playPrev(idx)
    else stopPrev()
  }

  // Batch start
  const startBatch=async()=>{
    if(!accessToken){showToast('⚠️ Pehle Google se login karo!','err');return}
    if(!items.length){showToast('⚠️ Files upload karo!','err');return}
    stopPrev(); stopRef.current=false
    setPhase('running'); setLog([]); setCurIdx(-1)

    const push=(idx,name,status,msg,extra={})=>setLog(prev=>[...prev,{idx,name,status,msg,...extra}])
    const upd=(idx,patch)=>setLog(prev=>prev.map((l,i)=>i===idx?{...l,...patch}:l))

    let schedDT=pubMode==='scheduled'?new Date(`${schedDate}T${schedTime}:00`):null

    for(let i=0;i<items.length;i++){
      if(stopRef.current){push(i,items[i].name,'stopped','⏹ Stopped');break}
      setCurIdx(i); setCurProg(0); setCurStage('making')
      push(i,items[i].name,'making','🎬 Processing...')
      try{
        const it=items[i]
        const {title,desc,tags}=it.ai
        let blob, mimeType
        if(it.type==='image'){
          selectItem(i)
          if(canvasRef.current){canvasRef.current.width=W;canvasRef.current.height=H}
          blob=await makeBlob(it.img,duration,fps,effect,i,size,musicMode==='custom'?musicBuf:null,showTxt?title.slice(0,55):null,p=>setCurProg(p))
          mimeType='video/webm'
          stopPrev()
        } else {
          blob=it.file; mimeType=it.file.type||'video/mp4'; setCurProg(50)
        }
        if(stopRef.current) break
        setCurStage('uploading')
        upd(i,{status:'uploading',msg:'⬆️ YouTube pe upload ho raha hai...'})

        // Build clean metadata — no extra fields that cause issues
        const privacy = pubMode === 'now' ? visibility : 'private'
        const meta = {
          snippet: {
            title: title.slice(0, 100),
            description: desc,
            tags: tags.slice(0, 15),
            categoryId: '22',
            defaultLanguage: 'hi',
            defaultAudioLanguage: 'hi',
          },
          status: {
            privacyStatus: privacy,
            ...(pubMode === 'scheduled' && schedDT
              ? { publishAt: schedDT.toISOString() }
              : {}
            ),
          },
        }
        const videoId=await ytUpload(blob,mimeType,meta,accessToken)
        const ytUrl=videoId?`https://www.youtube.com/watch?v=${videoId}`:null
        upd(i,{status:'done',msg:videoId?`✅ ID: ${videoId}`:'✅ Uploaded',ytId:videoId,ytUrl,title})
        addUpload({id:videoId||Date.now(),title,vis:pubMode==='now'?visibility:'scheduled',tags,
          scheduled:schedDT?.toLocaleString('en-IN')||null,time:new Date().toLocaleString('en-IN'),
          status:pubMode==='now'?'done':'scheduled',ytUrl:ytUrl||'https://studio.youtube.com',
          size:(blob.size/1048576).toFixed(1)+' MB'})
        if(pubMode==='scheduled'&&schedDT) schedDT=new Date(schedDT.getTime()+schedGap*60*1000)
        showToast(`✅ ${i+1}/${items.length} done!`,'ok')
      }catch(err){
        // Clear error messages for common issues
        let errMsg = err.message || 'Unknown error'
        if(errMsg.includes('401') || errMsg.includes('unauthorized') || errMsg.toLowerCase().includes('invalid credentials')) {
          errMsg = '❌ Token expire ho gaya — dobara Google se login karo!'
          showToast('⚠️ Token expire — please re-login!', 'err')
        } else if(errMsg.includes('403') || errMsg.toLowerCase().includes('quota')) {
          errMsg = '❌ YouTube quota khatam — kal try karo (daily limit)'
          showToast('⚠️ YouTube daily quota khatam!', 'err')
        } else if(errMsg.includes('400')) {
          errMsg = '❌ Bad request — video format ya metadata issue'
        } else if(errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('fetch')) {
          errMsg = '❌ Network error — internet check karo'
        }
        upd(i,{status:'error',msg:errMsg})
        if(!errMsg.includes('quota')) showToast(`❌ #${i+1} failed: ${errMsg.slice(0,40)}`, 'err')
        stopPrev()
      }
      if(i<items.length-1&&!stopRef.current) await new Promise(r=>setTimeout(r,800))
    }
    setCurIdx(-1); setPhase('done'); stopRef.current=false
    showToast(`🎉 Batch complete!`,'ok')
  }
  const stopBatch=()=>{stopRef.current=true;showToast('⏹ Stopping after current...','ok')}

  const imgCount=items.filter(x=>x.type==='image').length
  const vidCount=items.filter(x=>x.type==='video').length

  return (
    <>
    {editItem&&(
      <EditModal
        item={editItem}
        onSave={saved=>{setItems(p=>p.map(x=>x.id===saved.id?saved:x));setEditItem(null);showToast('✅ Changes saved!','ok')}}
        onClose={()=>setEditItem(null)}
      />
    )}

    <div className="grid grid-cols-[1fr_300px] gap-5 items-start">

      {/* ═══ LEFT COLUMN ═══ */}
      <div className="space-y-4">

        {/* ── STEP 1: DROPZONE ── */}
        <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="font-bebas text-[16px] tracking-widest">📁 STEP 1 — FILES UPLOAD KARO</h2>
              <p className="font-mono text-[10px] text-muted2 mt-0.5">Images aur Videos — dono ek saath • 500+ bhi</p>
            </div>
            <span className="font-mono text-[10px] px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/8 text-purple-400">
              {items.length} FILES
            </span>
          </div>
          <div className="p-5">
            {/* Drop zone */}
            <div
              onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('!border-purple-500','bg-purple-500/6');addFiles(e.dataTransfer.files)}}
              onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('!border-purple-500','bg-purple-500/6')}}
              onDragLeave={e=>e.currentTarget.classList.remove('!border-purple-500','bg-purple-500/6')}
              onClick={()=>!isRunning&&document.getElementById('bulkPick').click()}
              className="border-2 border-dashed border-border2 rounded-2xl p-10 text-center cursor-pointer bg-s2 hover:border-purple-500/60 hover:bg-purple-500/4 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="shimmer-line opacity-40"/>
              <div className="text-[48px] mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1">📂</div>
              <p className="text-[16px] font-bold mb-2">Images aur Videos yahan drop karo</p>
              <p className="text-[12px] text-muted2 mb-1">Ya click karo — dono types ek saath select kar sakte ho</p>
              <p className="text-[11px] text-muted font-mono mb-4">500+ files bhi ek baar — koi limit nahi!</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {['🖼️ JPG','🖼️ PNG','🖼️ WEBP','🎬 MP4','🎬 MOV','🎬 AVI','🎬 WEBM','🎬 MKV'].map(f=>(
                  <span key={f} className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-s3 border border-border text-muted2">{f}</span>
                ))}
              </div>
            </div>
            <input id="bulkPick" type="file" accept="image/*,video/*" multiple className="hidden" onChange={e=>addFiles(e.target.files)}/>

            {/* File thumbnails */}
            {items.length>0&&(
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-3">
                    {imgCount>0&&<span className="font-mono text-[11px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">🖼️ {imgCount} images</span>}
                    {vidCount>0&&<span className="font-mono text-[11px] text-blue bg-blue/10 border border-blue/20 px-2.5 py-1 rounded-full">🎬 {vidCount} videos</span>}
                  </div>
                  {!isRunning&&(
                    <button onClick={()=>setItems([])} className="font-mono text-[10px] text-red hover:text-red/70 transition-colors">✕ Clear all</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1 py-1">
                  {items.map((it,i)=>(
                    <div key={it.id} onClick={()=>selectItem(i)}
                      className={"relative w-[62px] h-[62px] rounded-xl overflow-hidden border-2 cursor-pointer group transition-all duration-200 "
                        +(selIdx===i?'border-purple-500 shadow-[0_0_0_3px_rgba(168,85,247,0.25)]':'border-border hover:border-border2')
                        +(curIdx===i&&isRunning?' border-yellow-400':'')}>
                      {it.type==='image'
                        ?<img src={it.url} alt="" className="w-full h-full object-cover"/>
                        :<div className="w-full h-full bg-gradient-to-br from-blue/25 to-purple-500/20 flex items-center justify-center text-2xl">🎬</div>}
                      {/* Status overlays */}
                      {log[i]?.status==='done'&&<div className="absolute inset-0 bg-green/45 flex items-center justify-center text-white text-xl font-bold">✓</div>}
                      {log[i]?.status==='error'&&<div className="absolute inset-0 bg-red/45 flex items-center justify-center text-white text-xl font-bold">✗</div>}
                      {curIdx===i&&isRunning&&<div className="absolute inset-0 bg-yellow-400/20 flex items-center justify-center"><div className="w-3 h-3 rounded-full bg-yellow-400 animate-ping"/></div>}
                      {/* Edited badge */}
                      {it.edited&&<div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-yellow/95 flex items-center justify-center text-[8px] text-black font-bold shadow-sm">✏</div>}
                      {/* Number */}
                      <div className={"absolute bottom-0 left-0 right-0 text-center font-mono text-[7px] py-0.5 text-white " + (it.type==='video'?'bg-blue/80':'bg-black/65')}>{it.type==='video'?'VID':i+1}</div>
                      {/* Hover overlay */}
                      {!isRunning&&(
                        <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button onClick={e=>{e.stopPropagation();setEditItem(it)}}
                            title="Edit metadata"
                            className="w-6 h-6 rounded-full bg-yellow/95 text-black flex items-center justify-center text-[10px] font-bold hover:scale-110 transition-transform">✏</button>
                          <button onClick={e=>{e.stopPropagation();removeItem(it.id)}}
                            title="Remove"
                            className="w-6 h-6 rounded-full bg-red/90 text-white flex items-center justify-center text-[10px] hover:scale-110 transition-transform">✕</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {!isRunning&&(
                    <div onClick={()=>document.getElementById('bulkPick').click()}
                      className="w-[62px] h-[62px] rounded-xl border-2 border-dashed border-border2 flex flex-col items-center justify-center cursor-pointer text-muted hover:border-purple-500/50 hover:text-purple-400 transition-all bg-s2 gap-1">
                      <span className="text-xl">➕</span>
                      <span className="font-mono text-[8px]">Add</span>
                    </div>
                  )}
                </div>
                <p className="font-mono text-[9px] text-muted mt-2">💡 Thumbnail pe hover → ✏ edit metadata • ✕ remove item</p>
              </div>
            )}
          </div>
        </div>

        {/* ── STEP 2: VIDEO SETTINGS ── */}
        <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="font-bebas text-[16px] tracking-widest">🎬 STEP 2 — VIDEO SETTINGS</h2>
              <p className="font-mono text-[10px] text-muted2 mt-0.5">Sirf images ke liye — videos directly upload honge</p>
            </div>
          </div>
          <div className="p-5 space-y-5">
            {/* Ken Burns */}
            <div>
              <label className="font-mono text-[10px] text-muted2 uppercase tracking-widest font-semibold block mb-2">Animation Effect (Ken Burns)</label>
              <div className="flex gap-2 flex-wrap">
                {EFFECTS.map(ef=>(
                  <button key={ef.id}
                    onClick={()=>{setEffect(ef.id);if(items[selIdx]?.type==='image')setTimeout(()=>playPrev(selIdx),30)}}
                    className={"px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all "+(effect===ef.id?'border-purple-500/55 text-purple-400 bg-purple-500/12 shadow-[0_0_10px_rgba(168,85,247,0.15)]':'border-border text-muted2 bg-s2 hover:border-border2')}>
                    {ef.l}
                  </button>
                ))}
              </div>
            </div>
            {/* Size / Duration / FPS */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-mono text-[10px] text-muted2 uppercase tracking-widest font-semibold block mb-2">Video Size</label>
                <select value={size} onChange={e=>setSize(e.target.value)} className="w-full bg-s2 border border-border text-txt px-3 py-2.5 rounded-xl text-[12px] outline-none focus:border-purple-500/40 cursor-pointer transition-colors">
                  {SIZES.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] text-muted2 uppercase tracking-widest font-semibold block mb-2">Duration: <span className="text-purple-400 font-bold">{duration}s</span></label>
                <input type="range" min="3" max="60" step="1" value={duration} onChange={e=>setDuration(Number(e.target.value))} className="w-full accent-purple-500 cursor-pointer mt-2" style={{accentColor:'#a855f7'}}/>
                <div className="flex justify-between font-mono text-[8px] text-muted mt-1"><span>3s</span><span>30s</span><span>60s</span></div>
              </div>
              <div>
                <label className="font-mono text-[10px] text-muted2 uppercase tracking-widest font-semibold block mb-2">FPS</label>
                <select value={fps} onChange={e=>setFps(Number(e.target.value))} className="w-full bg-s2 border border-border text-txt px-3 py-2.5 rounded-xl text-[12px] outline-none cursor-pointer">
                  <option value={30}>30 FPS (Standard)</option>
                  <option value={24}>24 FPS (Cinematic)</option>
                  <option value={60}>60 FPS (Smooth)</option>
                </select>
              </div>
            </div>
            {/* Title overlay */}
            <div onClick={()=>setShowTxt(p=>!p)}
              className="flex items-center justify-between px-4 py-3 bg-s2 border border-border rounded-xl cursor-pointer hover:border-border2 transition-colors group">
              <div>
                <p className="text-[13px] font-semibold">📝 AI Title Overlay on Video</p>
                <p className="text-[11px] text-muted2 mt-0.5">Image name se auto-generated title video ke andar dikhega</p>
              </div>
              <div className={"w-11 h-6 rounded-full relative transition-all duration-300 " + (showTxt?'bg-gradient-to-r from-purple-600 to-pink-500':'bg-border')}>
                <div className={"w-4 h-4 bg-white rounded-full absolute top-1 shadow-md transition-all duration-300 " + (showTxt?'left-6':'left-1')}/>
              </div>
            </div>
            {/* Music */}
            <div>
              <label className="font-mono text-[10px] text-muted2 uppercase tracking-widest font-semibold block mb-2">🎵 Background Music</label>
              <div className="flex gap-2 mb-3">
                {[['none','🔇 No Music'],['custom','📂 Upload Music']].map(([m,l])=>(
                  <button key={m} onClick={()=>setMusicMode(m)}
                    className={"flex-1 py-3 rounded-xl border text-[12px] font-bold transition-all " + (musicMode===m?'border-green/45 text-green bg-green/8 shadow-[0_0_10px_rgba(0,245,160,0.1)]':'border-border text-muted2 bg-s2 hover:border-border2')}>
                    {l}
                  </button>
                ))}
              </div>
              {musicMode==='custom'&&(
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={()=>document.getElementById('mPick').click()}
                    className="px-4 py-2.5 rounded-xl border border-border bg-s2 text-[12px] font-semibold text-muted2 hover:border-border2 hover:text-txt transition-all">
                    🎵 MP3 / Audio Choose Karo
                  </button>
                  {musicFile?(
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-green/8 border border-green/25 rounded-xl">
                      <span className="text-green text-xl">🎶</span>
                      <span className="text-green text-[12px] font-mono truncate max-w-[200px]">{musicFile.name}</span>
                      <button onClick={()=>{setMusicFile(null);setMusicBuf(null)}} className="text-muted hover:text-red text-[11px] ml-1">✕</button>
                    </div>
                  ):(
                    <p className="font-mono text-[10px] text-muted2">MP3, WAV, AAC — ek music sab videos mein add hogi</p>
                  )}
                  <input id="mPick" type="file" accept="audio/*" className="hidden" onChange={e=>onMusic(e.target.files[0])}/>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── STEP 3: PUBLISH ── */}
        <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-bebas text-[16px] tracking-widest">⚙️ STEP 3 — PUBLISH SETTINGS</h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Visibility */}
            <div>
              <label className="font-mono text-[10px] text-muted2 uppercase tracking-widest font-semibold block mb-2">Visibility</label>
              <div className="flex gap-2">
                {[['public','🌍 Public'],['unlisted','🔗 Unlisted'],['private','🔒 Private']].map(([v,l])=>(
                  <button key={v} onClick={()=>setVisibility(v)}
                    className={"flex-1 py-3 rounded-xl border text-[12px] font-bold transition-all " + (visibility===v?'border-red/40 text-red bg-red/8 shadow-[0_0_10px_rgba(255,45,85,0.1)]':'border-border text-muted2 bg-s2 hover:border-border2')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Publish mode */}
            <div>
              <label className="font-mono text-[10px] text-muted2 uppercase tracking-widest font-semibold block mb-2">Publish Mode</label>
              <div className="flex gap-2 mb-4">
                <button onClick={()=>setPubMode('now')}
                  className={"flex-1 py-3 rounded-xl border text-[13px] font-bold transition-all " + (pubMode==='now'?'border-green/45 text-green bg-green/8':'border-border text-muted2 bg-s2 hover:border-border2')}>
                  🚀 Abhi Sab Publish Karo
                </button>
                <button onClick={()=>setPubMode('scheduled')}
                  className={"flex-1 py-3 rounded-xl border text-[13px] font-bold transition-all " + (pubMode==='scheduled'?'border-yellow/45 text-yellow bg-yellow/8':'border-border text-muted2 bg-s2 hover:border-border2')}>
                  ⏰ Schedule Karo
                </button>
              </div>
              {pubMode==='scheduled'&&(
                <div className="space-y-4 animate-fadeUp">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-mono text-[10px] text-muted2 block mb-1.5">Pehla Video Date</label>
                      <input type="date" value={schedDate} onChange={e=>setSchedDate(e.target.value)}
                        className="w-full bg-s2 border border-border text-txt px-4 py-2.5 rounded-xl text-[13px] outline-none focus:border-yellow/45 transition-colors"/>
                    </div>
                    <div>
                      <label className="font-mono text-[10px] text-muted2 block mb-1.5">Pehla Video Time</label>
                      <input type="time" value={schedTime} onChange={e=>setSchedTime(e.target.value)}
                        className="w-full bg-s2 border border-border text-txt px-4 py-2.5 rounded-xl text-[13px] outline-none focus:border-yellow/45 transition-colors"/>
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-muted2 block mb-1.5">
                      Videos ke beech gap: <span className="text-yellow font-bold">{schedGap>=60?(schedGap/60).toFixed(1)+'h':schedGap+' min'}</span>
                    </label>
                    {/* Quick preset buttons */}
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {[
                        {l:'5 min',v:5},{l:'10 min',v:10},{l:'15 min',v:15},{l:'30 min',v:30},
                        {l:'1 hour',v:60},{l:'3 hours',v:180},{l:'6 hours',v:360},{l:'12 hours',v:720},{l:'1 day',v:1440},
                      ].map(p=>(
                        <button key={p.v} onClick={()=>setSchedGap(p.v)}
                          className={"font-mono text-[9px] px-2.5 py-1.5 rounded-lg border transition-all "+(schedGap===p.v?'border-yellow/60 bg-yellow/15 text-yellow':'border-border bg-s2 text-muted2 hover:border-border2 hover:text-txt')}>
                          {p.l}
                        </button>
                      ))}
                    </div>
                    <input type="range" min="1" max="1440" step="1" value={schedGap} onChange={e=>setSchedGap(Number(e.target.value))}
                      className="w-full cursor-pointer" style={{accentColor:'#fbbf24'}}/>
                    <div className="flex justify-between font-mono text-[9px] text-muted mt-1"><span>1min</span><span>10m</span><span>1h</span><span>6h</span><span>24h</span></div>
                  </div>
                  {items.length>0&&(()=>{
                    const d=new Date(`${schedDate}T${schedTime}:00`)
                    const last=new Date(d.getTime()+schedGap*(items.length-1)*60*1000)
                    return (
                      <div className="p-4 bg-yellow/5 border border-yellow/22 rounded-2xl space-y-1.5">
                        <p className="font-bebas text-[13px] tracking-widest text-yellow">📅 SCHEDULE PREVIEW</p>
                        <p className="font-mono text-[10px] text-yellow/80">📦 {items.length} videos total</p>
                        <p className="font-mono text-[10px] text-yellow/80">🕐 Pehla: {d.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                        <p className="font-mono text-[10px] text-yellow/80">🏁 Aakhri: ~{last.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── REPUB FAILED BUTTON ── */}
        {phase==='done'&&errCount>0&&(
          <button onClick={()=>{
            // Keep only failed items, reset log, restart
            setItems(p=>p.filter((_,i)=>log[i]?.status==='error'))
            setLog([])
            setPhase('idle')
            showToast(`🔄 ${errCount} failed items ready to retry!`,'ok')
          }}
            className="w-full py-4 font-bebas text-[18px] tracking-[3px] rounded-2xl border-2 border-red/40 text-red bg-red/6 hover:bg-red/12 hover:border-red/60 transition-all">
            🔄 RETRY — {errCount} FAILED VIDEOS DOBARA UPLOAD KARO
          </button>
        )}

        {/* ── RE-PUBLISH ALL DONE VIDEOS ── */}
        {phase==='done'&&doneCount>0&&(
          <button onClick={()=>{
            setLog([])
            setPhase('idle')
            showToast(`🔄 Sab videos ready — firse upload kar sakte ho!`,'ok')
          }}
            className="w-full py-3 font-bebas text-[15px] tracking-[2px] rounded-2xl border border-blue/30 text-blue bg-blue/6 hover:bg-blue/12 transition-all">
            🔄 SAME FILES DOBARA PUBLISH KARO ({items.length} videos)
          </button>
        )}

        {/* ── START BUTTON ── */}
        <button onClick={isRunning?stopBatch:startBatch} disabled={!items.length&&!isRunning}
          className={"w-full py-5 font-bebas text-[24px] tracking-[4px] rounded-2xl relative overflow-hidden transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none "
            +(isRunning
              ?'bg-gradient-to-r from-red to-red2 hover:shadow-[0_12px_40px_rgba(255,45,85,.5)]'
              :'bg-gradient-to-r from-purple-700 via-purple-500 to-pink-500 hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(124,58,237,.55)]')}>
          <div className="shimmer-line"/>
          {isRunning
            ?`⏹ STOP  (${doneCount}/${items.length} done)`
            :phase==='done'
            ?`🔄 FIRSE SHURU KARO — ${items.length} FILES`
            :`🚀 START — ${items.length||'?'} FILES BULK UPLOAD`}
        </button>
      </div>

      {/* ═══ RIGHT COLUMN ═══ */}
      <div className="space-y-4 sticky top-[80px]">

        {/* Channel card */}
        {channelInfo?(
          <div className="bg-s1 border border-green/20 rounded-2xl p-4 flex items-center gap-3">
            {channelInfo.avatar&&<img src={channelInfo.avatar} alt="" className="w-12 h-12 rounded-full border-2 border-green/45 object-cover flex-shrink-0"/>}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-green truncate">{channelInfo.name}</p>
              <p className="text-[10px] text-muted2 font-mono">{channelInfo.subs} subs • {channelInfo.vidCount} videos</p>
            </div>
            <span className="flex items-center gap-1 font-mono text-[9px] text-green bg-green/8 border border-green/22 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse"/> LIVE
            </span>
          </div>
        ):(
          <div className="bg-s1 border border-red/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red/10 border border-red/20 flex items-center justify-center text-xl flex-shrink-0">👤</div>
            <div>
              <p className="text-[12px] font-semibold text-red">Login Required</p>
              <p className="text-[10px] text-muted2">Sidebar mein Google se login karo</p>
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <h3 className="font-bebas text-[14px] tracking-widest">👁️ LIVE PREVIEW</h3>
            <div className="flex gap-1.5">
              <button onClick={()=>items[selIdx]?.type==='image'&&playPrev(selIdx)}
                className="px-2.5 py-1 rounded-lg bg-purple-500/12 border border-purple-500/30 text-purple-400 text-[10px] font-semibold hover:bg-purple-500/22 transition-colors">▶ Play</button>
              <button onClick={stopPrev}
                className="px-2.5 py-1 rounded-lg bg-s2 border border-border text-muted2 text-[10px] font-semibold hover:text-txt transition-colors">■</button>
            </div>
          </div>
          <div className="p-3 flex flex-col items-center gap-3">
            <div className="relative rounded-xl overflow-hidden border border-border2 bg-black shadow-inner" style={{width:PW+'px',height:PH+'px'}}>
              <canvas ref={canvasRef} style={{width:PW+'px',height:PH+'px',display:'block'}}/>
              {items[selIdx]?.type==='video'&&(
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue/10 to-purple-500/10">
                  <span className="text-4xl">🎬</span>
                  <span className="font-mono text-[10px] text-muted2 text-center px-3">Direct upload</span>
                </div>
              )}
              {!items.length&&(
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <span className="text-3xl opacity-30">🖼️</span>
                  <span className="font-mono text-[10px] text-muted opacity-50">No image</span>
                </div>
              )}
              {isRunning&&curIdx>=0&&(
                <div className="absolute bottom-2 left-2 right-2 bg-black/85 backdrop-blur-sm rounded-xl px-2.5 py-2">
                  <div className="flex justify-between font-mono text-[9px] text-purple-400 mb-1.5">
                    <span>{curIdx+1}/{items.length}</span><span>{curProg}%</span>
                  </div>
                  <div className="h-1.5 bg-s3 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-200" style={{width:curProg+'%'}}/>
                  </div>
                  <p className="font-mono text-[8px] text-muted2 mt-1.5">{curStage==='making'?'🎬 Rendering video...':'⬆️ Uploading to YouTube...'}</p>
                </div>
              )}
            </div>
            {/* Item info */}
            {items[selIdx]&&(
              <div className="w-full bg-s2 border border-border rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-mono text-[9px] text-muted2 truncate flex-1">{items[selIdx].name}</p>
                  {items[selIdx].edited&&<span className="font-mono text-[8px] text-yellow bg-yellow/10 border border-yellow/20 px-1.5 py-0.5 rounded-full flex-shrink-0">✏ edited</span>}
                </div>
                <p className="text-[11px] font-semibold text-txt truncate mb-2">{items[selIdx].ai.title.slice(0,50)}...</p>
                <div className="flex gap-1 flex-wrap mb-2">
                  {items[selIdx].ai.tags.slice(0,4).map(t=>(
                    <span key={t} className="font-mono text-[8px] px-1.5 py-0.5 rounded-full bg-red/12 border border-red/22 text-red">#{t}</span>
                  ))}
                </div>
                {!isRunning&&(
                  <button onClick={()=>setEditItem(items[selIdx])}
                    className="w-full py-2 rounded-xl border border-yellow/30 text-yellow text-[11px] font-bold hover:bg-yellow/10 transition-colors">
                    ✏️ Edit Title / Description / Tags
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {(isRunning||phase==='done')&&(
          <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border"><h3 className="font-bebas text-[14px] tracking-widest">📊 PROGRESS</h3></div>
            <div className="p-3">
              <div className="mb-3">
                <div className="flex justify-between font-mono text-[10px] mb-1.5"><span className="text-muted2">Overall</span><span className="text-green font-bold">{doneCount}/{items.length}</span></div>
                <div className="h-3 bg-s3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-green to-blue transition-all duration-500 relative overflow-hidden"
                    style={{width:`${(doneCount/Math.max(items.length,1))*100}%`}}>
                    <div className="shimmer-line"/>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[['✅',doneCount,'DONE','#00f5a0'],['⚡',isRunning?1:0,'ACTIVE','#fbbf24'],['❌',errCount,'ERR','#ff2d55']].map(([ic,v,l,c])=>(
                  <div key={l} className="text-center p-2.5 rounded-xl border" style={{background:`${c}10`,borderColor:`${c}28`}}>
                    <div className="text-base">{ic}</div>
                    <div className="font-bebas text-[22px]" style={{color:c}}>{v}</div>
                    <div className="font-mono text-[8px] text-muted2">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Log */}
        {log.length>0&&(
          <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <h3 className="font-bebas text-[14px] tracking-widest">📋 UPLOAD LOG</h3>
              <span className="font-mono text-[9px] text-muted2">{log.length} items</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2 space-y-1.5">
              {log.slice().reverse().map((l,i)=>(
                <div key={i} className={"flex items-center gap-2 p-2.5 rounded-xl border text-[11px] transition-colors "
                  +(l.status==='done'?'bg-green/5 border-green/20'
                  :l.status==='error'?'bg-red/5 border-red/20'
                  :l.status==='uploading'?'bg-blue/5 border-blue/20'
                  :'bg-s2 border-border')}>
                  <span className="font-mono text-[9px] text-muted2 w-5 flex-shrink-0 text-center">{l.idx+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[8px] text-muted2 truncate">{l.name}</p>
                    <p className="text-[10px] mt-0.5 truncate">{l.msg}</p>
                  </div>
                  {l.ytUrl&&(
                    <a href={l.ytUrl} target="_blank" rel="noreferrer"
                      className="font-mono text-[9px] text-blue bg-blue/10 border border-blue/22 px-1.5 py-1 rounded-lg hover:bg-blue/22 transition-colors no-underline flex-shrink-0">▶</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guide */}
        {phase==='idle'&&!items.length&&(
          <div className="bg-s1 border border-border rounded-2xl p-5">
            <div className="text-2xl mb-3">🚀</div>
            <p className="font-bebas text-[14px] tracking-widest mb-3">HOW TO USE</p>
            <div className="space-y-2">
              {['1️⃣ Images ya Videos drop karo (500+ bhi)','2️⃣ Thumbnail hover → ✏ edit karo ya ✕ remove','3️⃣ Effect, music, size choose karo','4️⃣ Public ya Schedule choose karo','5️⃣ START dabao — sab auto upload!'].map(s=>(
                <p key={s} className="text-[11px] text-muted2 leading-relaxed">{s}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
