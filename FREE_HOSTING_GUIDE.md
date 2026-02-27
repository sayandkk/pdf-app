# Free Hosting Guide for PDF Nexus

## Overview
Your PDF Nexus application can be hosted for free using various cloud platforms. Here are the best free options:

## Option 1: Railway.app (Recommended - All-in-One)

Railway provides free hosting for frontend, backend, and PostgreSQL database.

### Setup Steps:

1. **Sign up**: https://railway.app

2. **Create Project**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Initialize project
   cd /path/to/pdf
   railway init
   ```

3. **Deploy Services**:

   **Database (PostgreSQL)**:
   ```bash
   railway add postgresql
   ```

   **Backend**:
   ```bash
   cd pdf-backend
   railway add
   railway variables set NODE_ENV=production
   railway variables set DB_HOST=${{Postgres.PGHOST}}
   railway variables set DB_PORT=${{Postgres.PGPORT}}
   railway variables set DB_USERNAME=${{Postgres.PGUSER}}
   railway variables set DB_PASSWORD=${{Postgres.PGPASSWORD}}
   railway variables set DB_NAME=${{Postgres.PGDATABASE}}
   railway variables set JWT_SECRET=your-production-jwt-secret
   ```

   **Frontend**:
   ```bash
   cd pdf-frontend
   railway add
   railway variables set VITE_API_BASE_URL=https://your-backend-url.up.railway.app
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

## Option 2: Render.com (Good Alternative)

Render provides free tiers for web services and PostgreSQL.

### Setup Steps:

1. **Sign up**: https://render.com

2. **Create PostgreSQL Database**:
   - Go to Dashboard → New → PostgreSQL
   - Free tier: 750 hours/month, 256MB storage

3. **Deploy Backend**:
   - New → Web Service
   - Connect GitHub repo
   - Build Command: `npm install`
   - Start Command: `npm run start:prod`
   - Environment variables:
     ```
     NODE_ENV=production
     DB_HOST=your-db-host
     DB_PORT=5432
     DB_USERNAME=your-db-user
     DB_PASSWORD=your-db-password
     DB_NAME=your-db-name
     JWT_SECRET=your-production-jwt-secret
     ```

4. **Deploy Frontend**:
   - New → Static Site
   - Connect GitHub repo
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Environment variable:
     ```
     VITE_API_BASE_URL=https://your-backend.onrender.com
     ```

## Option 3: Vercel + Supabase (Frontend + Database)

### Supabase (Database):
1. **Sign up**: https://supabase.com
2. **Create project**
3. **Get connection details** from Settings → Database

### Vercel (Frontend):
1. **Sign up**: https://vercel.com
2. **Deploy frontend**:
   ```bash
   cd pdf-frontend
   npm install -g vercel
   vercel
   ```
3. **Environment variable**:
   ```
   VITE_API_BASE_URL=https://your-backend-url
   ```

### Backend on Render:
- Follow Render backend setup above

## Option 4: Netlify + Supabase + Render

Similar to Option 3 but using Netlify for frontend.

## Free Tier Limitations

### Railway.app:
- 512MB RAM, 1GB storage
- 512 hours/month free
- Sleeps after 24h inactivity

### Render.com:
- 750 hours/month per service
- 256MB-1GB RAM depending on service
- Sleeps after 15min inactivity

### Vercel:
- 100GB bandwidth/month
- 100 deployments/month
- No sleeping

### Supabase:
- 500MB database
- 50MB file storage
- 2GB bandwidth/month

## Production Considerations

### Environment Variables:
```bash
# Generate secure JWT secret
openssl rand -base64 32

# Set production environment variables
NODE_ENV=production
JWT_SECRET=your-secure-secret
```

### Database Migrations:
Ensure your backend runs database migrations on startup.

### File Uploads:
Consider using cloud storage (AWS S3, Cloudinary) for file uploads in production.

## Quick Deploy Scripts

### Railway (All-in-One):
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Deploy everything
cd /path/to/pdf
railway init
railway add postgresql
railway up
```

### Render (Multi-Service):
```bash
# Backend
cd pdf-backend
render deploy

# Frontend
cd pdf-frontend
render deploy
```

## Monitoring & Logs

- **Railway**: `railway logs`
- **Render**: Dashboard → Service → Logs tab
- **Vercel**: Dashboard → Project → Functions/Logs

## Custom Domain (Optional)

All platforms support custom domains:
- Railway: Free .up.railway.app or custom domain
- Render: Free .onrender.com or custom domain
- Vercel: Free .vercel.app or custom domain

## Cost Estimation

- **Railway**: ~$5-10/month when exceeding free tier
- **Render**: ~$7/month per service when exceeding free tier
- **Supabase**: ~$25/month for production usage
- **Vercel**: Free for most use cases

## Recommended Approach

1. **Development**: Use Railway for quick all-in-one deployment
2. **Production**: Railway or Render + Supabase for better scaling
3. **Budget**: Vercel + Supabase + Render for cost optimization