import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Sidebar  from './components/Sidebar'
import Topbar   from './components/Topbar'
import StatsRow from './components/StatsRow'
import Toast    from './components/Toast'
import UploadPage   from './pages/UploadPage'
import AIPage       from './pages/AIPage'
import ChannelsPage from './pages/ChannelsPage'
import { AnalyticsPage, QueuePage, SchedulePage, LibraryPage } from './pages/OtherPages'

function Inner() {
  const [active, setActive] = useState('upload')
  const { loading } = useApp()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center">
        <div className="font-bebas text-[48px] tracking-[6px] bg-gradient-to-br from-red to-red2 bg-clip-text text-transparent mb-4">VIDFLOW</div>
        <div className="flex items-center gap-2 justify-center text-muted2 font-mono text-[12px]">
          <div className="w-2 h-2 rounded-full bg-red animate-ping"/>
          Connecting...
        </div>
      </div>
    </div>
  )
  const PAGE = {
    upload:   <UploadPage/>,
    channels: <ChannelsPage/>,
    queue:    <QueuePage/>,
    analytics:<AnalyticsPage/>,
    ai:       <AIPage/>,
    schedule: <SchedulePage/>,
    library:  <LibraryPage/>,
  }
  return (
    <div className="relative min-h-screen">
      <div className="ambient-bg fixed inset-0 z-0 pointer-events-none"/>
      <div className="grid-lines fixed inset-0 z-0 pointer-events-none"/>
      <div className="relative z-10 flex min-h-screen">
        <Sidebar active={active} onNav={setActive}/>
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar active={active}/>
          <main className="flex-1 p-6 overflow-auto">
            <StatsRow/>
            <div className="animate-fadeUp">{PAGE[active]||<UploadPage/>}</div>
          </main>
        </div>
      </div>
      <Toast/>
    </div>
  )
}
export default function App() { return <AppProvider><Inner/></AppProvider> }