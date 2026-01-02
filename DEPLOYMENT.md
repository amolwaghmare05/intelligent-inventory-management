# 🚀 Deployment Guide - Intelligent Inventory Management System

## Current Status
✅ Code pushed to GitHub: https://github.com/amolwaghmare05/intelligent-inventory-management

## Quick Deployment (Free Hosting)

### Option 1: Render + Railway (Recommended - 100% Free)

#### Step 1: Deploy Database on Railway

1. Go to **https://railway.app/** and sign in with GitHub
2. Click **"New Project"** → **"Deploy MySQL"**
3. Once deployed, click on your MySQL service
4. Go to **"Variables"** tab and note down:
   - `MYSQLHOST` (e.g., containers-us-west-123.railway.app)
   - `MYSQLPORT` (e.g., 6543)
   - `MYSQLDATABASE` (e.g., railway)
   - `MYSQLUSER` (e.g., root)
   - `MYSQLPASSWORD` (your generated password)

5. Go to **"Data"** tab → Click **"Query"**
6. Copy ALL content from `warehousedb.sql` and paste it in the query editor
7. Click **"Execute"** to create all tables and data

#### Step 2: Deploy Web Application on Render

1. Go to **https://render.com/** and sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect repository: `amolwaghmare05/intelligent-inventory-management`
4. Configure:
   - **Name**: `inventory-management` (or your choice)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install --legacy-peer-deps`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

5. Click **"Advanced"** → Add these Environment Variables:

```
SESSION_SECRET=MySuper$ecretKey2026!ChangeThis
db_host=<MYSQLHOST from Railway>
db_port=<MYSQLPORT from Railway>
db_name=<MYSQLDATABASE from Railway>
db_user_name=<MYSQLUSER from Railway>
db_password=<MYSQLPASSWORD from Railway>
login_id=admin@gmail.com
login_password=admin123
NODE_ENV=production
```

6. Click **"Create Web Service"**
7. Wait 5-10 minutes for deployment
8. Your website will be live at: `https://inventory-management-xxxx.onrender.com`

---

### Option 2: Heroku (Paid - $5/month minimum)

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Run these commands:

```bash
heroku login
heroku create your-inventory-app
heroku addons:create cleardb:ignite
heroku config:get CLEARDB_DATABASE_URL
# Extract host, port, user, password, database from the URL
heroku config:set SESSION_SECRET=your_secret
heroku config:set db_host=<host>
heroku config:set db_port=3306
heroku config:set db_name=<database>
heroku config:set db_user_name=<user>
heroku config:set db_password=<password>
heroku config:set login_id=admin@gmail.com
heroku config:set login_password=admin123
git push heroku main
```

---

### Option 3: Vercel + PlanetScale (Free Tier)

1. **Database Setup:**
   - Go to https://planetscale.com/
   - Create free database
   - Import `warehousedb.sql`
   - Get connection details

2. **Deploy to Vercel:**
   - Go to https://vercel.com/
   - Import from GitHub
   - Add environment variables
   - Deploy

---

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SESSION_SECRET` | Secret key for sessions | `MySecret123!` |
| `db_host` | Database host | `localhost` or Railway host |
| `db_port` | Database port | `3306` |
| `db_name` | Database name | `warehousedb` |
| `db_user_name` | Database username | `root` |
| `db_password` | Database password | Your password |
| `login_id` | Admin email | `admin@gmail.com` |
| `login_password` | Admin password | `admin123` |

---

## After Deployment

1. Visit your live URL
2. Login with credentials from environment variables
3. Test all features:
   - ✅ Login/Logout
   - ✅ Add/View inventory
   - ✅ Create bills
   - ✅ Sales analytics
   - ✅ Stock management

---

## Troubleshooting

### Database Connection Error
- Verify all database credentials are correct
- Check if database host/port is accessible
- Ensure database is running

### App Crashes on Startup
- Check deployment logs in Render/Heroku dashboard
- Verify all environment variables are set
- Check Node.js version compatibility

### Can't Login
- Verify `login_id` and `login_password` environment variables
- Check if user table exists in database

---

## Custom Domain (Optional)

After deployment, you can add a custom domain:

**On Render:**
1. Go to your service → Settings
2. Click "Custom Domain"
3. Add your domain and follow DNS instructions

**Cost:** Free on Render's free tier

---

## Security Recommendations

Before going live in production:

1. ✅ Change `SESSION_SECRET` to a strong random string
2. ✅ Change `login_password` to a strong password
3. ✅ Enable HTTPS (automatic on Render/Heroku)
4. ✅ Add rate limiting (already included)
5. ✅ Review and update security headers
6. ✅ Regular backups of database

---

## Support

- GitHub: https://github.com/amolwaghmare05/intelligent-inventory-management
- For issues: Create an issue on GitHub
- Documentation: Check README.md

---

## Next Steps

1. Follow Option 1 (Render + Railway) for free deployment
2. Import database schema to Railway
3. Deploy app to Render with environment variables
4. Access your live website!

**Estimated Time:** 15-20 minutes
**Cost:** $0 (Free tier)
