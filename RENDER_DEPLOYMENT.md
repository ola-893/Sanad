# 🚀 Render Deployment Guide for Sanad Backend

## Overview
This guide will help you deploy the Sanad backend API, PostgreSQL database, and Redis to Render.

---

## 📋 Prerequisites
- GitHub repository: `ola-893/Sanad` (✅ Already pushed)
- Render account (free): https://render.com

---

## 🎯 One-Click Deployment (Recommended)

### Option 1: Deploy with Blueprint (Easiest)

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com

2. **Create New Blueprint**
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub account if not already connected
   - Select repository: **`ola-893/Sanad`**
   - Branch: **`main`**
   - Render will automatically detect `render.yaml`

3. **Review Services**
   Render will create:
   - ✅ **sanad-backend** (Web Service)
   - ✅ **sanad-db** (PostgreSQL Database)
   - ✅ **sanad-redis** (Redis Instance)

4. **Add Secret Environment Variables**
   Before deploying, you need to add these secret values manually:
   
   Go to **sanad-backend** service → **Environment** tab and add:
   
   ```
   CREDITCOIN_PRIVATE_KEY=0x9b03237620808ee0fd539300ca7d23894d67e82e903441ef3ea02ea52e5fb4b6
   PRIVATE_KEY=0x9b03237620808ee0fd539300ca7d23894d67e82e903441ef3ea02ea52e5fb4b6
   PINATA_API_KEY=08501330fb59b3a26c40
   PINATA_SECRET_API_KEY=99a278901f1eb9f4355050fcc459bba9aa493406bf3e305e06a0e99de4a0dd5a
   PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiNDYwYjQ5YS0wOTA3LTRlYjYtOGZmNS1lZjlhODUwNTJhNmEiLCJlbWFpbCI6Im1oYXJ2ZWhsbEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMDg1MDEzMzBmYjU5YjNhMjZjNDAiLCJzY29wZWRLZXlTZWNyZXQiOiI5OWEyNzg5MDFmMWViOWY0MzU1MDUwZmNjNDU5YmJhOWFhNDkzNDA2YmYzZTMwNWUwNmEwZTk5ZGU0YTBkZDVhIiwiZXhwIjoxODE4NjMxMzA2fQ.3OVYdKb6t1Tt_xYfYbgPixUerNQ9Ft4pVjDG6uFoijY
   GEMINI_API_KEY=AIzaSyB3vp-m6q68dNO-UcyZoiNPtS0oD6qMWd0
   ```

5. **Deploy**
   - Click **"Apply"** or **"Create Blueprint"**
   - Wait for deployment (5-10 minutes)

6. **Get Your Backend URL**
   - Once deployed, you'll get a URL like: `https://sanad-backend.onrender.com`
   - Health check endpoint: `https://sanad-backend.onrender.com/api/v1/health`

---

## 🔧 Manual Deployment (Alternative)

If blueprint doesn't work, follow these steps:

### Step 1: Create PostgreSQL Database

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `sanad-db`
   - **Database**: `sanad_db`
   - **User**: `sanad_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free
4. Click **"Create Database"**
5. Save the **Internal Database URL** (you'll need this)

### Step 2: Create Redis Instance

1. Click **"New +"** → **"Redis"**
2. Configure:
   - **Name**: `sanad-redis`
   - **Region**: Same as database
   - **Plan**: Free
   - **Maxmemory Policy**: noeviction
3. Click **"Create Redis"**
4. Save the **Internal Redis URL**

### Step 3: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect GitHub and select: **`ola-893/Sanad`**
3. Configure:
   - **Name**: `sanad-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Instance Type**: Free

4. **Environment Variables** - Add all these:

```bash
# Auto-generated
DATABASE_URL=[Internal Database URL from Step 1]
REDIS_URL=[Internal Redis URL from Step 2]

# Node Environment
NODE_ENV=production
PORT=9487

# Security (use generated values or your own)
JWT_SECRET=sanad_super_secret_jwt_key_2026_cc3
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRATION=1d
JWT_REFRESH_TOKEN_EXPIRATION=7d
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Creditcoin Network
CREDITCOIN_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
CREDITCOIN_CHAIN_ID=102031
CREDITCOIN_CHAIN_ID_HEX=0x18e8f
CREDITCOIN_PROOF_BUILDER_URL=https://prover.cc3-testnet.creditcoin.network

# Smart Contracts
SAG_TOKEN_ADDRESS=0x80b9Ae7D0BEfB042a3eb8fDd1af0DCF6E53bEdE9
SANAD_LIQUIDITY_POOL_ADDRESS=0x6370114EEda4AC8F43F6c7997cB6C75DF58F4316
SANAD_CREDIT_ORACLE_ADDRESS=0x9B926B432bbEFA5405eC9EBB0F7515496c2095a5

# Private Keys (REQUIRED)
CREDITCOIN_PRIVATE_KEY=0x9b03237620808ee0fd539300ca7d23894d67e82e903441ef3ea02ea52e5fb4b6
PRIVATE_KEY=0x9b03237620808ee0fd539300ca7d23894d67e82e903441ef3ea02ea52e5fb4b6

# IPFS & AI
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
PINATA_API_KEY=08501330fb59b3a26c40
PINATA_SECRET_API_KEY=99a278901f1eb9f4355050fcc459bba9aa493406bf3e305e06a0e99de4a0dd5a
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiNDYwYjQ5YS0wOTA3LTRlYjYtOGZmNS1lZjlhODUwNTJhNmEiLCJlbWFpbCI6Im1oYXJ2ZWhsbEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMDg1MDEzMzBmYjU5YjNhMjZjNDAiLCJzY29wZWRLZXlTZWNyZXQiOiI5OWEyNzg5MDFmMWViOWY0MzU1MDUwZmNjNDU5YmJhOWFhNDkzNDA2YmYzZTMwNWUwNmEwZTk5ZGU0YTBkZDVhIiwiZXhwIjoxODE4NjMxMzA2fQ.3OVYdKb6t1Tt_xYfYbgPixUerNQ9Ft4pVjDG6uFoijY
GEMINI_API_KEY=AIzaSyB3vp-m6q68dNO-UcyZoiNPtS0oD6qMWd0

# Ethereum
ETHEREUM_RPC_URL=https://ethereum-rpc.publicnode.com
ETHERSCAN_API_KEY=
SOURCE_CHAIN_KEY=3

# Sepolia Addresses
SEPOLIA_REPAYMENT_GATEWAY_ADDRESS=0x662e21FfB91F35A1f16983e38a9cDAe90f537A80
SEPOLIA_INVESTOR_VAULT_ADDRESS=0x0e243c2F556eFaDA6352f567AA658b6052F04eD4
```

5. **Health Check Path**: `/api/v1/health`

6. Click **"Create Web Service"**

---

## 🔗 Update Frontend Environment Variables

Once your backend is deployed, update the frontend environment variables:

1. Go to: https://app.netlify.com/sites/sanad-protocol/configuration/env

2. Update these variables:
   ```
   NEXT_PUBLIC_API_URL=https://sanad-backend.onrender.com
   NEXT_PUBLIC_WS_URL=https://sanad-backend.onrender.com
   ```

3. Redeploy the frontend

---

## ✅ Verify Deployment

### Test Backend Health
```bash
curl https://sanad-backend.onrender.com/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-09-07T..."
}
```

### Test Database Connection
The backend should automatically run migrations on startup.

### Test API Endpoints
```bash
# Test a public endpoint
curl https://sanad-backend.onrender.com/api/v1/pawnshops

# Or visit in browser
https://sanad-backend.onrender.com/api/v1/health
```

---

## 🎉 Deployment Complete!

Your Sanad Protocol is now fully deployed:

- ✅ **Frontend**: https://sanad-protocol.netlify.app
- ✅ **Backend API**: https://sanad-backend.onrender.com
- ✅ **Database**: PostgreSQL on Render
- ✅ **Cache**: Redis on Render

---

## 📝 Important Notes

1. **Free Tier Limitations**:
   - Render free services spin down after 15 minutes of inactivity
   - First request after spin-down may take 30-60 seconds
   - Consider upgrading to paid plan for production

2. **Database Backups**:
   - Free PostgreSQL doesn't include automatic backups
   - Consider upgrading for production use

3. **Monitoring**:
   - View logs in Render dashboard
   - Set up alerts for service health

4. **Environment Variables**:
   - Never commit secrets to GitHub
   - Use Render's environment variable management

---

## 🆘 Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Verify Dockerfile paths are correct
- Ensure all dependencies are in package.json

### Database Connection Issues
- Verify DATABASE_URL is set correctly
- Check if migrations ran successfully
- Look for connection errors in logs

### Redis Connection Issues
- Verify REDIS_URL is set correctly
- Check if Redis instance is running
- Review Redis connection logs

### Service Won't Start
- Check health check endpoint configuration
- Verify PORT environment variable (should be 9487)
- Review startup logs for errors

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Render Blueprints Guide](https://render.com/docs/infrastructure-as-code)
- [Docker on Render](https://render.com/docs/docker)

---

**Need Help?**
Check the logs in your Render dashboard or review the troubleshooting section above.
