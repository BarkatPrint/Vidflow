import { useApp } from '../context/AppContext'
function StatCard({ icon, value, label, color='red' }) {
  return (
    <div className="relative bg-s1 border border-border rounded-2xl p-4 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-border2 card-glow group">
      <div className="shimmer-line"/>
      <div className="text-2xl mb-3">{icon}</div>
      <div className="font-bebas text-[30px] text-txt leading-none">{value}</div>
      <div className="font-mono text-[10px] text-muted2 mt-1.5 tracking-widest uppercase">{label}</div>
    </div>
  )
}
export default function StatsRow() {
  const { channelInfo, sessionCount, uploads } = useApp()
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard icon="🚀" value={sessionCount}             label="Session Uploads"/>
      <StatCard icon="👁️" value={channelInfo?.views||'—'}  label="Total Views"/>
      <StatCard icon="👥" value={channelInfo?.subs||'—'}   label="Subscribers"/>
      <StatCard icon="🎬" value={channelInfo?.vidCount||'—'} label="Channel Videos"/>
    </div>
  )
}