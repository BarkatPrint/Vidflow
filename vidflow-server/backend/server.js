import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:4173'],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Client ID — safe to send to frontend (not secret)
app.get('/api/oauth/config', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID })
})

// Exchange auth code for tokens — CLIENT SECRET STAYS HERE!
app.post('/api/oauth/exchange', async (req, res) => {
  try {
    const { code, redirectUri } = req.body
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    })
    const data = await resp.json()
    if (data.error) return res.status(400).json({ error: data.error_description || data.error })
    res.json({ accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Refresh token — CLIENT SECRET STAYS HERE!
app.post('/api/oauth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ error: 'No refresh token' })
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type:    'refresh_token',
      }),
    })
    const data = await resp.json()
    if (data.error) return res.status(401).json({ error: 'Token refresh failed' })
    res.json({ accessToken: data.access_token, expiresIn: data.expires_in })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// YouTube channel info proxy
app.get('/api/youtube/channel', async (req, res) => {
  const token = req.headers['x-access-token']
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const resp = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      { headers: { Authorization: 'Bearer ' + token } }
    )
    const data = await resp.json()
    if (data.error) return res.status(400).json({ error: data.error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// YouTube upload init — CLIENT SECRET STAYS HERE!
app.post('/api/youtube/upload/init', async (req, res) => {
  const token = req.headers['x-access-token']
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const { metadata, mimeType, fileSize } = req.body
    const resp = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': String(fileSize),
        },
        body: JSON.stringify(metadata),
      }
    )
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}))
      return res.status(resp.status).json({ error: e?.error?.message || 'Init failed' })
    }
    const uploadUrl = resp.headers.get('Location')
    res.json({ uploadUrl })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.listen(PORT, () => {
  console.log(`\n🚀 VidFlow Backend: http://localhost:${PORT}`)
  console.log(`   Client ID:     ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing!'}`)
  console.log(`   Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing!'}\n`)
})