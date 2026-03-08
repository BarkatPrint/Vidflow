import { useApp } from '../context/AppContext'

export default function ChannelsPage() {
  const { channels, addChannel, removeChannel, toggleChannel } = useApp()

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-bebas text-[18px] tracking-widest">📺 CHANNELS MANAGE KARO</h2>
            <p className="font-mono text-[10px] text-muted2 mt-0.5">10+ channels add karo — sab pe ek saath upload</p>
          </div>
          <button onClick={addChannel}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red to-red2 text-white font-bebas text-[13px] tracking-[2px] rounded-xl hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(255,45,85,.4)] transition-all">
            + ADD CHANNEL
          </button>
        </div>
        <div className="p-5">
          {channels.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[56px] mb-4">📺</div>
              <p className="font-bebas text-[18px] tracking-widest text-muted2 mb-2">KOI CHANNEL NAHI</p>
              <p className="font-mono text-[12px] text-muted mb-5">Google se login karo aur channels add karo</p>
              <button onClick={addChannel}
                className="px-8 py-3 bg-gradient-to-r from-red to-red2 text-white font-bebas text-[16px] tracking-[3px] rounded-xl hover:-translate-y-0.5 transition-all">
                + PEHLA CHANNEL ADD KARO
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map((ch, idx) => (
                <div key={ch.id}
                  className="flex items-center gap-4 p-4 bg-s2 border rounded-2xl transition-all hover:border-border2"
                  style={{borderColor: ch.active!==false ? ch.color+'40' : '#1f2535'}}>
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2" style={{borderColor:ch.color}}>
                      {ch.avatar ? <img src={ch.avatar} alt="" className="w-full h-full object-cover"/> :
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{background:ch.color+'22',color:ch.color}}>{ch.name?.[0]}</div>}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-s2 flex items-center justify-center font-mono text-[9px] font-bold"
                      style={{background:ch.color,color:'#000'}}>
                      {idx+1}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-[15px] truncate" style={{color:ch.color}}>{ch.name}</p>
                      {ch.active===false&&<span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-border text-muted2">PAUSED</span>}
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10px] text-muted2">
                      <span>👥 {ch.subs} subs</span>
                      <span>🎬 {ch.vidCount} videos</span>
                      <span className={ch.accessToken?'text-green':'text-red'}>{ch.accessToken?'● Connected':'● Token expired'}</span>
                    </div>
                  </div>
                  {/* Controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Toggle active */}
                    <button onClick={()=>toggleChannel(ch.id)}
                      className={"px-3 py-1.5 rounded-lg font-mono text-[10px] font-semibold border transition-all "+(ch.active!==false?'border-green/40 bg-green/8 text-green hover:bg-green/15':'border-border bg-s3 text-muted2 hover:border-border2')}>
                      {ch.active!==false?'✓ ON':'○ OFF'}
                    </button>
                    {/* Remove */}
                    <button onClick={()=>removeChannel(ch.id)}
                      className="w-8 h-8 rounded-lg bg-red/8 border border-red/20 text-red text-[12px] hover:bg-red/18 transition-all flex items-center justify-center">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {channels.length>0&&(
        <div className="grid grid-cols-3 gap-4">
          {[
            ['📺', channels.length, 'TOTAL CHANNELS'],
            ['✅', channels.filter(c=>c.active!==false).length, 'ACTIVE'],
            ['⏸️', channels.filter(c=>c.active===false).length, 'PAUSED'],
          ].map(([ic,v,l])=>(
            <div key={l} className="bg-s1 border border-border rounded-2xl p-4 text-center card-glow">
              <div className="text-2xl mb-2">{ic}</div>
              <div className="font-bebas text-[32px] text-txt leading-none">{v}</div>
              <div className="font-mono text-[10px] text-muted2 mt-1">{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="bg-s1 border border-border rounded-2xl p-5">
        <p className="font-bebas text-[14px] tracking-widest mb-3">💡 KAISE KAAM KARTA HAI</p>
        <div className="space-y-2">
          {[
            '1️⃣ "+ Add Channel" pe click karo → Google account choose karo',
            '2️⃣ 10+ channels add kar sakte ho — har ek alag Google account',
            '3️⃣ ON/OFF toggle se decide karo kaun sa channel upload kare',
            '4️⃣ Bulk Upload mein files daalo → sab channels pe automatically',
            '5️⃣ Har channel ko ALAG title, description, tags milenge (AI se)',
            '6️⃣ Sab channels ka progress ek saath dikhega',
          ].map(s=><p key={s} className="text-[12px] text-muted2 leading-relaxed">{s}</p>)}
        </div>
      </div>
    </div>
  )
}