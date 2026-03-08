# VidFlow — Setup Guide

## Structure
```
vidflow-server/
├── backend/          ← Node.js server (Client ID + Secret yahan hai)
│   ├── server.js
│   ├── .env          ← CREATE THIS (apna credentials daalo)
│   └── package.json
└── frontend/         ← React app (koi secret nahi!)
    └── src/...
```

## STEP 1 — Google Console Setup

1. https://console.cloud.google.com jao
2. New Project banao: "VidFlow"
3. APIs & Services → Enable APIs → YouTube Data API v3 ON karo
4. APIs & Services → Credentials → Create OAuth 2.0 Client ID
   - Type: Web application
   - Authorized JavaScript origins:
     - http://localhost:5173  (development)
     - https://yourdomain.com  (production)
   - Authorized redirect URIs:
     - http://localhost:5173  (development)
     - https://yourdomain.com  (production)
5. Client ID aur Client Secret copy karo

## STEP 2 — Backend Setup

```bash
cd backend
npm install

# .env file banao:
cp .env.example .env
# .env mein apna Client ID aur Secret daalo

npm run dev
# Server chalu ho jayega: http://localhost:3001
```

## STEP 3 — Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App chalu: http://localhost:5173
```

## Deploy karna ho to:
- Backend: Railway.app / Render.com / VPS pe deploy karo
- Frontend: Vercel / Netlify pe deploy karo
- .env mein FRONTEND_URL = https://yourapp.vercel.app set karo

## Security:
- Client ID → Backend se frontend ko bhejna safe hai (public hota hai)  
- Client SECRET → Kabhi frontend mein mat daalo
- Refresh tokens → localStorage mein save hote hain (secure)
- Access tokens → Memory mein hain, 55 min baad auto-refresh