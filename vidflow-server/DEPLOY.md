# VidFlow — GitHub + Free Deployment Guide

## Architecture
- Backend  → Render.com (FREE) — Client Secret yahan safe rehta hai
- Frontend → Vercel.com (FREE) — Public, koi secret nahi

---

## STEP 1 — GitHub Pe Upload Karo

1. https://github.com jao → "New Repository" banao
2. Naam: vidflow-server
3. Public rakho
4. README mat banao (already hai)

Phir terminal mein (vidflow-server folder mein):
```
git init
git add .
git commit -m "VidFlow initial commit"
git branch -M main
git remote add origin https://github.com/TUMHARA_USERNAME/vidflow-server.git
git push -u origin main
```

---

## STEP 2 — Backend Deploy (Render.com) — FREE

1. https://render.com jao → Sign up (GitHub se)
2. "New Web Service" → GitHub repo connect karo
3. Root Directory: backend
4. Build Command: npm install
5. Start Command: npm start
6. Environment Variables add karo:
   - GOOGLE_CLIENT_ID = tumhara client id
   - GOOGLE_CLIENT_SECRET = tumhara secret  ← SIRF YAHAN DAALO, GitHub pe nahi!
   - FRONTEND_URL = https://tumhara-app.vercel.app (baad mein update karo)
7. Deploy karo → URL milega: https://vidflow-backend-xxxx.onrender.com

---

## STEP 3 — Frontend Deploy (Vercel.com) — FREE

1. vercel.json mein backend URL update karo:
   "destination": "https://vidflow-backend-xxxx.onrender.com/api/$1"

2. https://vercel.com jao → Sign up (GitHub se)
3. "New Project" → GitHub repo connect karo
4. Root Directory: frontend
5. Deploy karo → URL milega: https://vidflow-xxxx.vercel.app

---

## STEP 4 — Final Updates

1. Render backend mein FRONTEND_URL update karo:
   FRONTEND_URL = https://vidflow-xxxx.vercel.app

2. Google Cloud Console mein add karo:
   Authorized JavaScript origins: https://vidflow-xxxx.vercel.app
   Authorized redirect URIs: https://vidflow-xxxx.vercel.app

3. Dono redeploy karo

---

## Result
- Tumhara app: https://vidflow-xxxx.vercel.app
- Koi bhi use kar sakta hai — Client Secret safe!
- GitHub pe sirf code hai, koi secret nahi!