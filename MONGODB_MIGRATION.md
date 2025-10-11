# MongoDB Migration Guide

## Overview

This guide explains the migration from JSON file storage to MongoDB for the V-Blogger application. All user data, posts, and chats are now stored in MongoDB instead of local JSON files.

## What Changed

### Before (JSON Files)
- `users.json` - User accounts and credentials
- `posts.json` - Blog posts, comments, and likes
- `chats.json` - Direct messages between users

### After (MongoDB Collections)
- `users` collection - User accounts and credentials
- `posts` collection - Blog posts, comments, and likes  
- `chats` collection - Direct messages between users

## Prerequisites

1. **MongoDB Setup**: Ensure you have a MongoDB instance running (local or cloud)
2. **Environment Variables**: Make sure your `.env` file contains:
   ```
   MONGODB_URI=mongodb://localhost:27017
   # OR for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
   ```

## Migration Steps

### Step 1: Backup Your Current Data (Recommended)

Before migrating, create a backup of your existing JSON files:

```bash
cp users.json users.json.backup
cp posts.json posts.json.backup
cp chats.json chats.json.backup
```

### Step 2: Run the Migration Script

Execute the migration script to transfer your JSON data to MongoDB:

```bash
npm run migrate
```

This script will:
- Connect to your MongoDB instance
- Create the `v-blogger` database
- Transfer all users, posts, and chats to MongoDB collections
- Create database indexes for better performance
- Verify the migration was successful

### Step 3: Start Your Application

The application will now use MongoDB automatically:

```bash
npm start
# OR for development with auto-reload:
npm run dev
```

### Step 4: Verify Everything Works

1. **Test User Login**: Log in with an existing account
2. **Test Post Creation**: Create a new blog post
3. **Test Comments/Likes**: Add comments and likes to posts
4. **Test Direct Messages**: Send messages between users

## Database Schema

### Users Collection
```javascript
{
  id: Number,          // Sequential user ID
  username: String,    // Unique username
  password: String     // SHA1 hashed password
}
```

### Posts Collection
```javascript
{
  id: Number,          // Sequential post ID
  title: String,       // Post title
  content: String,     // Post content (markdown)
  author: Number,      // User ID of author
  date: String,        // ISO date string
  likes: Number,       // Number of likes
  likedBy: [Number],   // Array of user IDs who liked
  comments: [{         // Array of comment objects
    content: String,
    author: Number,
    date: String
  }]
}
```

### Chats Collection
```javascript
{
  id: Number,          // Sequential chat ID
  users: [Number],     // Array of user IDs in chat (always 2)
  messages: [{         // Array of message objects
    chatID: Number,
    from: Number,
    content: String,
    date: String
  }]
}
```

## Backup and Recovery

### Creating Backups

To backup your MongoDB data to JSON files:

```bash
npm run backup
```

This creates:
- Updated `users.json`, `posts.json`, `chats.json`
- Timestamped backup in `./backups/backup-YYYY-MM-DD...`

### Restoring from Backup

If you need to restore from a backup:

1. Copy your backup JSON files to the root directory
2. Run the migration script again: `npm run migrate`

## Important Notes

### Database Connection
- The app now maintains a persistent MongoDB connection
- Connection is initialized when `appConfig.js` is imported
- All JSON file operations have been replaced with MongoDB operations

### Performance Improvements
- Database indexes are automatically created for:
  - User IDs and usernames
  - Post IDs and authors
  - Chat IDs and participating users

### Error Handling
- All database operations include proper error handling
- Failed operations will log errors but won't crash the app
- Connection issues are logged with clear error messages

## Troubleshooting

### Connection Issues

**Problem**: "MongoDB connection failed"
```
Solution:
1. Check your MONGODB_URI in .env file
2. Ensure MongoDB is running
3. Verify network connectivity
4. Check authentication credentials
```

**Problem**: "Database not found"
```
Solution:
1. The database is created automatically on first connection
2. Ensure your MongoDB user has create database permissions
```

### Migration Issues

**Problem**: "Migration failed - data not found"
```
Solution:
1. Ensure JSON files exist in the project root
2. Check file permissions
3. Verify JSON file syntax is valid
```

**Problem**: "Duplicate key error"
```
Solution:
1. Clear the MongoDB collections manually
2. Run the migration script again
```

### Performance Issues

**Problem**: Slow database operations
```
Solution:
1. Verify indexes were created: npm run migrate
2. Check MongoDB server performance
3. Consider upgrading your MongoDB instance
```

## Manual Database Operations

### Connect to MongoDB Shell
```bash
# Local MongoDB
mongo
use v-blogger

# Or with MongoDB Compass GUI
# Connect to: mongodb://localhost:27017/v-blogger
```

### Clear All Data
```javascript
db.users.deleteMany({})
db.posts.deleteMany({})
db.chats.deleteMany({})
```

### Check Data Counts
```javascript
db.users.countDocuments()
db.posts.countDocuments()
db.chats.countDocuments()
```

## Rolling Back (If Needed)

If you need to revert to JSON files:

1. **Backup current MongoDB data**:
   ```bash
   npm run backup
   ```

2. **Restore the old code** (you'll need to revert the changes manually)

3. **Use your JSON backup files**

## Next Steps

After successful migration:

1. **Delete old JSON files** (optional, but recommended):
   ```bash
   rm users.json posts.json chats.json
   rm *.json.backup
   ```

2. **Set up automated backups** for your MongoDB instance

3. **Monitor application performance** and database usage

4. **Consider implementing additional MongoDB features**:
   - Full-text search for posts
   - Aggregation pipelines for analytics
   - TTL indexes for temporary data

## Support

If you encounter issues:

1. Check the console for error messages
2. Verify your MongoDB connection
3. Ensure all dependencies are installed: `npm install`
4. Check that your `.env` file is properly configured

The migration preserves all your existing data while providing better performance, scalability, and data integrity through MongoDB.