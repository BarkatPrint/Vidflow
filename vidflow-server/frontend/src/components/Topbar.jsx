import { useApp } from '../context/AppContext'
const TITLES = { upload:'BULK UPLOAD', queue:'UPLOAD QUEUE', analytics:'ANALYTICS', ai:'AI GENERATOR', schedule:'SCHEDULER', library:'VIDEO LIBRARY' }
export default function Topbar({ active }) {
  const { accessToken } = useApp()
  return (
    <header className="flex items-center justify-between px-7 py-4 bg-s1/90 backdrop-blur-xl border-b border-border sticky top-0 z-50">
      <h1 className="font-bebas text-lg tracking-[2px] text-txt">{TITLES[active] || 'VIDFLOW'}</h1>
      <div className="flex items-center gap-2">
        <span className={"flex items-center gap-1.5 px-3 py-1 rounded-full border font-mono text-[10px] " + (accessToken ? 'text-green border-green/30 bg-green/6' : 'text-red border-red/30 bg-red/6')}>
          <span className={"w-1.5 h-1.5 rounded-full bg-current " + (accessToken ? 'animate-pulse' : 'animate-blink')}/>
          {accessToken ? 'YOUTUBE CONNECTED' : 'NOT LOGGED IN'}
        </span>
      </div>
    </header>
  )
}