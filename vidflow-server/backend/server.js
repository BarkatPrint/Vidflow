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

app.use(express.json({ limit: '50mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))

// OAuth config
app.get('/api/oauth/config', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID })
})

// Exchange auth code
app.post('/api/oauth/exchange', async (req, res) => {
  try {
    const { code, redirectUri } = req.body

    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    const data = await resp.json()

    if (data.error)
      return res.status(400).json({ error: data.error })

    res.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Channel info
app.get('/api/youtube/channel', async (req, res) => {

  const token = req.headers['x-access-token']
  if (!token) return res.status(401).json({ error: 'No token' })

  try {

    const resp = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      { headers: { Authorization: 'Bearer ' + token } }
    )

    const data = await resp.json()

    res.json(data)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// STEP 1: INIT YOUTUBE UPLOAD
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
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': String(fileSize)
        },
        body: JSON.stringify(metadata)
      }
    )

    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}))
      return res.status(resp.status).json({ error: e?.error?.message || 'Init failed' })
    }

    const uploadUrl = resp.headers.get('Location')

    res.json({ uploadUrl })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// STEP 2: UPLOAD VIDEO VIA BACKEND (CORS FIX)
app.post('/api/youtube/upload/put', async (req, res) => {

  try {

    const { uploadUrl, mimeType, file } = req.body

    const resp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType
      },
      body: Buffer.from(file.data)
    })

    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'Upload failed' })
    }

    res.json({ success: true })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 VidFlow Backend running on port ${PORT}`)
})
