import { useApp } from '../context/AppContext'

const NAV = [
  { id:'upload',    icon:'🚀', label:'Bulk Upload'   },
  { id:'channels',  icon:'📺', label:'Channels'      },
  { id:'queue',     icon:'📋', label:'Queue'         },
  { id:'analytics', icon:'📊', label:'Analytics'     },
  { id:'ai',        icon:'🤖', label:'AI Generator'  },
  { id:'schedule',  icon:'⏰', label:'Scheduler'     },
  { id:'library',   icon:'📚', label:'Library'       },
]

export default function Sidebar({ active, onNav }) {
  const { channels, activeChannels, addChannel, doLogout } = useApp()

  return (
    <aside className="w-[220px] flex-shrink-0 bg-s1 border-r border-border flex flex-col sticky top-0 h-screen overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red to-transparent"/>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-border">
        <div className="font-bebas text-[32px] tracking-[3px] bg-gradient-to-br from-red via-red to-red2 bg-clip-text text-transparent leading-none">VIDFLOW</div>
        <div className="font-mono text-[9px] text-muted2 tracking-[2px] mt-0.5">MULTI-CHANNEL SYSTEM</div>
      </div>
      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)}
            className={"w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all text-left border border-transparent relative " + (active===item.id ? 'nav-active' : 'text-muted2 hover:text-txt hover:bg-s2')}>
            <span className="text-[15px] w-[18px] text-center">{item.icon}</span>
            {item.label}
            {item.id==='channels'&&channels.length>0&&(
              <span className="ml-auto font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-red/15 text-red border border-red/20">{channels.length}</span>
            )}
          </button>
        ))}
      </nav>
      {/* Channels mini list */}
      <div className="p-3 border-t border-border space-y-2 max-h-[220px] overflow-y-auto">
        {channels.length === 0 ? (
          <p className="font-mono text-[10px] text-muted2 text-center py-2">Koi channel nahi</p>
        ) : (
          channels.map(ch => (
            <div key={ch.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-s2 transition-colors group">
              <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden border-2" style={{borderColor: ch.color}}>
                {ch.avatar ? <img src={ch.avatar} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full" style={{background:ch.color+'33'}}/>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate" style={{color:ch.color}}>{ch.name}</p>
                <p className="text-[9px] text-muted2 font-mono">{ch.subs} subs</p>
              </div>
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer flex-shrink-0 transition-all"
                style={{borderColor:ch.color,background:ch.active!==false?ch.color+'33':'transparent'}}
                onClick={()=>useApp && document.dispatchEvent(new CustomEvent('toggleCh',{detail:ch.id}))}>
                {ch.active!==false&&<div className="w-1.5 h-1.5 rounded-full" style={{background:ch.color}}/>}
              </div>
            </div>
          ))
        )}
        <button onClick={addChannel}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold border border-red/25 bg-red/8 text-red hover:bg-red/15 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          </svg>
          + Channel Add Karo
        </button>
        {channels.length>0&&(
          <button onClick={doLogout} className="w-full font-mono text-[10px] text-muted2 hover:text-red transition-colors py-1">✕ Sab channels hatao</button>
        )}
      </div>
    </aside>
  )
}