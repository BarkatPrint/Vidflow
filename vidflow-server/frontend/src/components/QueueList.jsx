export default function QueueList({ uploads=[], emptyMsg='No items' }) {
  if (!uploads.length) return (
    <div className="text-center py-12 text-muted2">
      <div className="text-4xl mb-3">📭</div>
      <p className="font-mono text-[12px]">{emptyMsg}</p>
    </div>
  )
  return (
    <div className="space-y-2">
      {uploads.map((u, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-s2 border border-border rounded-xl hover:border-border2 transition-colors">
          <div className={"w-8 h-8 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0 " + (u.status==='done'?'bg-green/15':u.status==='scheduled'?'bg-yellow/15':'bg-red/15')}>
            {u.status==='done'?'✅':u.status==='scheduled'?'⏰':'❌'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{u.title}</p>
            <p className="text-[10px] text-muted2 font-mono mt-0.5">{u.time} • {u.size} • {u.vis}</p>
          </div>
          {u.ytUrl && (
            <a href={u.ytUrl} target="_blank" rel="noreferrer"
              className="font-mono text-[9px] text-blue bg-blue/10 border border-blue/20 px-2 py-1 rounded-lg hover:bg-blue/20 transition-colors no-underline flex-shrink-0">
              ▶ Watch
            </a>
          )}
        </div>
      ))}
    </div>
  )
}