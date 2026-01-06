# User Database Migration Instructions

## What Changed

User accounts are now stored permanently in a MySQL `users` table instead of in memory. This means:
- **User registrations persist** across server restarts
- **Admin account is stored in database** and automatically created on first server start
- **You can see all users** by querying the database

## Database Schema

The `users` table has been created with:
- `id` - Auto-increment primary key
- `name` - User's full name
- `email` - Unique email address (indexed for fast lookups)
- `password` - Bcrypt hashed password
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

## Railway Deployment

The Railway deployment will:
1. **Automatically create the users table** on first run (if it doesn't exist)
2. **Create the admin user** from environment variables (login_id and login_password)
3. **Store all new registrations** in the database permanently

## Manual Migration (if needed)

If the table doesn't auto-create, run this SQL manually in Railway MySQL console:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_email ON users(email);
```

## Viewing Users

To see all registered users in Railway MySQL:

```sql
SELECT id, name, email, created_at FROM users ORDER BY created_at DESC;
```

## Features Now Available

1. **User Registration** - Users can create accounts via /register
2. **Permanent Storage** - All accounts persist in database
3. **Auto-Admin Creation** - Admin user automatically created from .env
4. **Secure Passwords** - All passwords bcrypt hashed before storage
