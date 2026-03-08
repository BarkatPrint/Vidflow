import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const AppContext = createContext(null)
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly'
const API = '/api'

// Load saved channels from localStorage
function loadSavedChannels() {
  try { return JSON.parse(localStorage.getItem('vf_channels') || '[]') } catch { return [] }
}
function saveChannels(channels) {
  localStorage.setItem('vf_channels', JSON.stringify(channels))
}

export function AppProvider({ children }) {
  const [channels,     setChannels]     = useState(loadSavedChannels) // [{id,name,avatar,subs,vidCount,accessToken,refreshToken,color}]
  const [activeChId,   setActiveChId]   = useState(null)              // which channel is "primary" for UI
  const [uploads,      setUploads]      = useState([])
  const [sessionCount, setSessionCount] = useState(0)
  const [toast,        setToast]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [clientId,     setClientId]     = useState(null)
  const [addingChannel,setAddingChannel]= useState(false) // flag: login is for adding new channel
  const refreshTimers = useRef({})

  const COLORS = ['#ff2d55','#0ea5e9','#00f5a0','#fbbf24','#a855f7','#ff6b35','#06b6d4','#84cc16','#f43f5e','#8b5cf6']

  const showToast = useCallback((msg, type='ok') => {
    setToast({ msg, type, id: Date.now() })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Persist channels whenever they change
  useEffect(() => { saveChannels(channels) }, [channels])

  // Fetch Client ID from backend
  useEffect(() => {
    fetch(`${API}/oauth/config`)
      .then(r => r.json())
      .then(d => { if (d.clientId) setClientId(d.clientId) })
      .catch(() => showToast('⚠️ Backend server chalu karo!', 'err'))
      .finally(() => setLoading(false))
  }, [])

  // Auto-refresh all channel tokens on load
  useEffect(() => {
    channels.forEach(ch => {
      if (ch.refreshToken) refreshChannelToken(ch.id, ch.refreshToken)
    })
  }, [])

  const refreshChannelToken = useCallback(async (chId, refreshToken) => {
    try {
      const r = await fetch(`${API}/oauth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      })
      const d = await r.json()
      if (d.accessToken) {
        setChannels(prev => prev.map(c => c.id === chId ? { ...c, accessToken: d.accessToken } : c))
        scheduleRefresh(chId, refreshToken, d.expiresIn)
      }
    } catch {}
  }, [])

  const scheduleRefresh = useCallback((chId, refreshToken, expiresIn) => {
    if (refreshTimers.current[chId]) clearTimeout(refreshTimers.current[chId])
    const ms = ((expiresIn || 3600) - 120) * 1000
    refreshTimers.current[chId] = setTimeout(() => refreshChannelToken(chId, refreshToken), ms)
  }, [refreshChannelToken])

  const loadChannelInfo = useCallback(async (token) => {
    const r = await fetch(`${API}/youtube/channel`, { headers: { 'x-access-token': token } })
    const d = await r.json()
    if (d.error || !d.items?.length) return null
    const ch = d.items[0]
    const fmt = n => { n=parseInt(n)||0; return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n) }
    return {
      name:     ch.snippet.title,
      avatar:   ch.snippet.thumbnails?.default?.url || '',
      subs:     fmt(ch.statistics.subscriberCount),
      vidCount: ch.statistics.videoCount,
      ytId:     ch.id,
    }
  }, [])

  // Handle OAuth redirect — could be adding a new channel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const adding = sessionStorage.getItem('vf_adding_channel') === '1'
    if (!code) return
    window.history.replaceState({}, '', window.location.pathname)
    sessionStorage.removeItem('vf_adding_channel')

    fetch(`${API}/oauth/exchange`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: window.location.origin })
    })
      .then(r => r.json())
      .then(async d => {
        if (d.error) { showToast('❌ Login failed: ' + d.error, 'err'); return }
        const info = await loadChannelInfo(d.accessToken)
        if (!info) { showToast('❌ Channel info load nahi hua', 'err'); return }

        const chId = info.ytId || Date.now().toString()
        // Check if already added
        setChannels(prev => {
          const exists = prev.find(c => c.ytId === info.ytId)
          if (exists) {
            showToast(`⚠️ "${info.name}" already added hai!`, 'err')
            return prev.map(c => c.ytId === info.ytId ? { ...c, accessToken: d.accessToken, refreshToken: d.refreshToken || c.refreshToken } : c)
          }
          const color = COLORS[prev.length % COLORS.length]
          const newCh = { id: chId, ...info, accessToken: d.accessToken, refreshToken: d.refreshToken, color, active: true }
          showToast(`✅ "${info.name}" channel add hua!`, 'ok')
          if (!activeChId) setActiveChId(chId)
          return [...prev, newCh]
        })
        if (d.refreshToken) scheduleRefresh(chId, d.refreshToken, d.expiresIn)
      })
      .catch(() => showToast('❌ Login failed', 'err'))
  }, [])

  const addChannel = useCallback(() => {
    if (!clientId) { showToast('⚠️ Backend chalu karo pehle!', 'err'); return }
    sessionStorage.setItem('vf_adding_channel', '1')
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id',     clientId)
    url.searchParams.set('redirect_uri',  window.location.origin)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope',         SCOPES)
    url.searchParams.set('access_type',   'offline')
    url.searchParams.set('prompt',        'select_account consent') // always show account picker!
    window.location.href = url.toString()
  }, [clientId, showToast])

  const removeChannel = useCallback((chId) => {
    setChannels(prev => {
      const updated = prev.filter(c => c.id !== chId)
      if (activeChId === chId) setActiveChId(updated[0]?.id || null)
      return updated
    })
    if (refreshTimers.current[chId]) { clearTimeout(refreshTimers.current[chId]); delete refreshTimers.current[chId] }
    showToast('Channel removed', 'ok')
  }, [activeChId, showToast])

  const toggleChannel = useCallback((chId) => {
    setChannels(prev => prev.map(c => c.id === chId ? { ...c, active: !c.active } : c))
  }, [])

  const addUpload = useCallback((entry) => {
    setUploads(prev => [entry, ...prev])
    setSessionCount(prev => prev + 1)
  }, [])

  // Active channels = those marked active AND have a token
  const activeChannels = channels.filter(c => c.active !== false && c.accessToken)

  return (
    <AppContext.Provider value={{
      channels, activeChannels, addChannel, removeChannel, toggleChannel,
      uploads, sessionCount, toast, loading, showToast, addUpload,
      // legacy compat
      accessToken: channels[0]?.accessToken || null,
      channelInfo: channels[0] || null,
      doLogin: addChannel,
      doLogout: () => { setChannels([]); localStorage.removeItem('vf_channels'); showToast('All channels removed', 'ok') },
    }}>
      {children}
    </AppContext.Provider>
  )
}
export const useApp = () => useContext(AppContext)