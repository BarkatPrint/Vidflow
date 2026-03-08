import { useApp } from '../context/AppContext'
export default function Toast() {
  const { toast } = useApp()
  return (
    <div className={"fixed bottom-6 right-6 z-[9000] flex items-center gap-3 px-4 py-3 rounded-xl bg-s2 text-[13px] shadow-2xl border max-w-xs transition-all duration-300 " + (toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none') + " " + (toast?.type==='ok' ? 'border-green/30' : 'border-red/30')}>
      <span className={"w-5 h-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0 " + (toast?.type==='ok' ? 'bg-green/20 text-green' : 'bg-red/20 text-red')}>{toast?.type==='ok' ? '✓' : '!'}</span>
      <span className="text-txt">{toast?.msg}</span>
    </div>
  )
}