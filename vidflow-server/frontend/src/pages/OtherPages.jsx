import { useApp } from '../context/AppContext'
import QueueList from '../components/QueueList'

export function AnalyticsPage() {
  const { channelInfo, uploads, sessionCount } = useApp()
  const stats = [
    { icon:'👁️', val:channelInfo?.views||'—',    label:'TOTAL VIEWS'    },
    { icon:'👥', val:channelInfo?.subs||'—',     label:'SUBSCRIBERS'    },
    { icon:'🎬', val:channelInfo?.vidCount||'—', label:'CHANNEL VIDEOS' },
    { icon:'🚀', val:sessionCount,               label:'VIA VIDFLOW'    },
  ]
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3.5">
        {stats.map(s => (
          <div key={s.label} className="relative bg-s1 border border-border rounded-2xl p-4 overflow-hidden hover:border-border2 hover:-translate-y-0.5 transition-all card-glow">
            <div className="text-2xl mb-3">{s.icon}</div>
            <div className="font-bebas text-[30px] text-txt leading-none">{s.val}</div>
            <div className="font-mono text-[10px] text-muted2 mt-1.5 tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-bebas text-[15px] tracking-widest">🎬 UPLOADED VIA VIDFLOW</h2></div>
        <div className="p-4"><QueueList uploads={uploads} emptyMsg="No uploads yet. Upload videos first!"/></div>
      </div>
    </div>
  )
}

export function QueuePage() {
  const { uploads } = useApp()
  return (
    <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-bebas text-[15px] tracking-widest">📋 UPLOAD QUEUE</h2>
        <span className="font-mono text-[10px] px-2.5 py-1 rounded-full border border-blue/30 bg-blue/6 text-blue">{uploads.length} TOTAL</span>
      </div>
      <div className="p-4"><QueueList uploads={uploads} emptyMsg="Queue is empty. Upload something!"/></div>
    </div>
  )
}

export function SchedulePage() {
  const { uploads } = useApp()
  const scheduled = uploads.filter(u => u.status==='scheduled')
  return (
    <div className="bg-s1 border border-border rounded-2xl overflow-hidden max-w-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-bebas text-[15px] tracking-widest">⏰ SCHEDULED UPLOADS</h2>
        <span className="font-mono text-[10px] px-2.5 py-1 rounded-full border border-yellow/30 bg-yellow/6 text-yellow">{scheduled.length} PENDING</span>
      </div>
      <div className="p-4"><QueueList uploads={scheduled} emptyMsg="No scheduled uploads"/></div>
    </div>
  )
}

export function LibraryPage() {
  const { uploads } = useApp()
  return (
    <div className="bg-s1 border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-bebas text-[15px] tracking-widest">📚 VIDEO LIBRARY</h2>
        <span className="font-mono text-[10px] px-2.5 py-1 rounded-full border border-blue/30 bg-blue/6 text-blue">{uploads.length} VIDEOS</span>
      </div>
      <div className="p-4"><QueueList uploads={uploads} emptyMsg="No videos uploaded yet"/></div>
    </div>
  )
}