# Database Migrations

## Overview
This folder contains database migration scripts to update MongoDB indexes and schema changes.

## Available Migrations

### ✅ fix-email-indexes-production.js (PRODUCTION READY)
**Purpose**: Fixes email indexes for both `users` and `customers` collections to allow multiple null email values.

**What it does**:
- Drops old non-sparse unique email indexes
- Creates new sparse unique email indexes
- Allows multiple documents with `null` email values
- Ensures uniqueness when email is present

**When to use**: 
- On production deployment (Render)
- When you get "E11000 duplicate key error" for null emails

**How to run on Render**:
1. Go to your Render Dashboard
2. Select your backend service
3. Click on "Shell" tab
4. Run: `node migrations/fix-email-indexes-production.js`
5. After successful migration, manually deploy your service to restart it

---

### fix-email-index-complete.js (Development)
Fixes email index on `users` collection only (development use).

### fix-customer-email-index.js (Development)
Fixes email index on `customers` collection only (development use).

---

## Production Deployment Checklist

When deploying to production and encountering email duplicate key errors:

1. ✅ Commit all code changes (models with sparse indexes)
2. ✅ Push to your repository
3. ✅ Run the production migration on Render Shell
4. ✅ Manually deploy/restart your Render service
5. ✅ Test creating users/customers without email

## Notes

- **Sparse indexes** allow multiple `null` values but ensure uniqueness when value is present
- **Background indexes** allow the migration to run without blocking database operations
- Always backup your database before running migrations in production
