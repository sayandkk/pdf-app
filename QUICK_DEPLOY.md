# Quick Free Hosting Setup

## Option 1: Railway.app (Easiest - All-in-One)

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### 2. Deploy Everything
```bash
cd /path/to/pdf
railway init
railway add postgresql
railway up
```

### 3. Set Environment Variables
```bash
# Backend environment variables will be auto-configured
# Frontend will get API URL automatically
```

**URLs**: Automatically generated (e.g., `your-app.up.railway.app`)

---

## Option 2: Vercel + Supabase (Frontend + Database)

### 1. Supabase Database
```bash
# Sign up at https://supabase.com
# Create new project
# Get connection details from Settings → Database
```

### 2. Deploy Frontend to Vercel
```bash
cd pdf-frontend
npm install -g vercel
vercel

# Set environment variable during deployment:
# VITE_API_BASE_URL=https://your-backend-url
```

### 3. Deploy Backend to Render
```bash
# Sign up at https://render.com
# Create new Web Service from GitHub
# Build Command: npm install
# Start Command: npm run start:prod
# Add environment variables from Supabase
```

---

## Free Limits

| Service | Free Limit | Sleep After |
|---------|------------|-------------|
| Railway | 512MB RAM, 1GB storage | 24h inactivity |
| Render | 750h/month, 256MB-1GB RAM | 15min inactivity |
| Vercel | 100GB bandwidth | No sleeping |
| Supabase | 500MB database | No sleeping |

## Quick Commands

### Railway (Recommended)
```bash
# One command deployment
npm install -g @railway/cli
railway login
cd /path/to/pdf
railway init && railway add postgresql && railway up
```

### Vercel + Supabase
```bash
# Frontend
cd pdf-frontend
vercel

# Backend (on Render.com)
# Use web dashboard to deploy from GitHub
```

## Production URLs

- **Railway**: `https://your-project.up.railway.app`
- **Vercel**: `https://your-project.vercel.app`
- **Render**: `https://your-project.onrender.com`
- **Supabase**: `https://your-project.supabase.co`

## Cost When Exceeding Free Tier

- Railway: ~$5-10/month
- Render: ~$7/month per service
- Vercel: Usually stays free
- Supabase: ~$25/month