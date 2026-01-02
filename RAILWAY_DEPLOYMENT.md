# 🚀 Deploy to Railway (Fast & Free)

## Why Railway?
- ✅ **Fast**: No cold starts, instant loading
- ✅ **Free**: $5 free credit monthly (enough for small apps)
- ✅ **Easy**: One platform for both database and web app
- ✅ **GitHub Integration**: Auto-deploys on push

---

## Step-by-Step Deployment

### Step 1: Create Railway Account
1. Go to https://railway.app/
2. Click **"Login"** → Sign in with **GitHub**
3. Authorize Railway to access your repositories

### Step 2: Deploy MySQL Database

1. Click **"New Project"**
2. Select **"Deploy MySQL"**
3. Wait 30 seconds for database to deploy
4. Click on the **MySQL service**
5. Go to **"Variables"** tab
6. Copy these values (keep them handy):
   ```
   MYSQLHOST=containers-us-west-xx.railway.app
   MYSQLPORT=6543
   MYSQLDATABASE=railway
   MYSQLUSER=root
   MYSQLPASSWORD=xxxxxxxxxxxxx
   ```

### Step 3: Import Database Schema

1. In the MySQL service, go to **"Data"** tab
2. Click **"Query"** button
3. Open your local `warehousedb.sql` file
4. Copy **ALL** content from the file
5. Paste it in the Railway query editor
6. Click **"Execute"** to create all tables
7. Verify tables were created (you should see brands, categories, orders, sizes, stocks, users)

### Step 4: Deploy Your Web Application

1. In your Railway dashboard, click **"New"** → **"GitHub Repo"**
2. Select: **`amolwaghmare05/intelligent-inventory-management`**
3. Railway will automatically detect it's a Node.js app
4. Wait for initial deployment (1-2 minutes)

### Step 5: Configure Environment Variables

1. Click on your **web service** (not the database)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"** and add these one by one:

```
SESSION_SECRET=Railway_Super_Secret_2026_ChangeThis!
db_host=containers-us-west-xx.railway.app
db_port=6543
db_name=railway
db_user_name=root
db_password=your_mysql_password_from_step2
login_id=admin@gmail.com
login_password=admin123
NODE_ENV=production
```

**Important**: 
- Use the **exact values** from your MySQL Variables tab in Step 2
- `db_host` = `MYSQLHOST`
- `db_port` = `MYSQLPORT`
- `db_password` = `MYSQLPASSWORD`

4. Click **"Deploy"** (Railway will restart with new variables)

### Step 6: Get Your Live URL

1. In your web service, go to **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. Your website will be live at: `https://your-app-name.up.railway.app`

### Step 7: Test Your Website

1. Visit your Railway URL
2. You should see the login page
3. Login with:
   - **Email**: `admin@gmail.com`
   - **Password**: `admin123`
4. Test features:
   - Add inventory
   - Create bills
   - View analytics

---

## Troubleshooting

### Website shows "Cannot connect to database"

**Solution**: Check environment variables
1. Go to web service → Variables
2. Verify `db_host`, `db_port`, `db_name`, `db_user_name`, `db_password` match your MySQL service
3. Make sure you're using the **internal** connection details from MySQL Variables tab

### "Application failed to respond"

**Solution**: Check deployment logs
1. Click on your web service
2. Go to **"Deployments"** tab
3. Click the latest deployment
4. Check logs for errors

### Website loads but login fails

**Solution**: Check login credentials
1. Verify `login_id` and `login_password` in Variables
2. Make sure they match what you're typing

---

## Cost & Limits

**Free Tier:**
- $5 credit per month (resets monthly)
- Enough for:
  - 1 MySQL database
  - 1 web application
  - Moderate traffic (~10,000 requests/month)

**Usage Tips:**
- Monitor usage in Railway dashboard
- App stays active (no cold starts like Render)
- Upgrade to hobby plan ($5/month) for unlimited usage if needed

---

## Custom Domain (Optional)

1. Go to web service → Settings → Networking
2. Click "Custom Domain"
3. Add your domain
4. Update your DNS with provided records:
   ```
   Type: CNAME
   Name: www (or @)
   Value: your-app.up.railway.app
   ```

---

## Updating Your Website

Railway auto-deploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Your changes"
git push
```

Railway will automatically:
1. Detect the push
2. Build your app
3. Deploy the new version
4. Zero downtime!

---

## Security Checklist

Before sharing your website:

- [ ] Change `SESSION_SECRET` to a strong random string
- [ ] Change `login_password` to a strong password
- [ ] Never commit `.env` file to GitHub (already in .gitignore)
- [ ] Enable 2FA on your Railway account
- [ ] Regular database backups (Railway provides automatic backups)

---

## Backup Your Database

### Manual Backup:
1. Go to MySQL service → Data → Query
2. Run: `mysqldump -u root -p railway > backup.sql`

### Automated Backups:
- Railway automatically backs up databases
- Access backups in MySQL service → Backups tab

---

## Summary

✅ **Total Time**: ~15 minutes  
✅ **Cost**: Free ($5/month credit)  
✅ **Performance**: Fast (no cold starts)  
✅ **Features**: Auto-deploy, logs, metrics, backups

**Your website is now live and fast! 🚀**

Need help? Check Railway docs: https://docs.railway.app/
