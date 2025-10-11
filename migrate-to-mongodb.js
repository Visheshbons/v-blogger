import fs from "fs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);

async function migrateToMongoDB() {
  try {
    console.log(chalk.blue("🔄 Starting migration from JSON files to MongoDB..."));

    // Connect to MongoDB
    await client.connect();
    const db = client.db("v-blogger");
    console.log(chalk.green("✅ Connected to MongoDB successfully!"));

    // Migrate Users
    console.log(chalk.yellow("📝 Migrating users..."));
    if (fs.existsSync("./users.json")) {
      const usersData = JSON.parse(fs.readFileSync("./users.json", "utf-8"));
      const usersCollection = db.collection("users");

      // Clear existing users
      await usersCollection.deleteMany({});

      if (usersData.length > 0) {
        await usersCollection.insertMany(usersData);
        console.log(chalk.green(`✅ Migrated ${usersData.length} users`));
      } else {
        console.log(chalk.yellow("⚠️  No users found to migrate"));
      }
    } else {
      console.log(chalk.yellow("⚠️  users.json not found, skipping users migration"));
    }

    // Migrate Posts
    console.log(chalk.yellow("📝 Migrating posts..."));
    if (fs.existsSync("./posts.json")) {
      const postsData = JSON.parse(fs.readFileSync("./posts.json", "utf-8"));
      const postsCollection = db.collection("posts");

      // Clear existing posts
      await postsCollection.deleteMany({});

      if (postsData.length > 0) {
        await postsCollection.insertMany(postsData);
        console.log(chalk.green(`✅ Migrated ${postsData.length} posts`));
      } else {
        console.log(chalk.yellow("⚠️  No posts found to migrate"));
      }
    } else {
      console.log(chalk.yellow("⚠️  posts.json not found, skipping posts migration"));
    }

    // Migrate Chats
    console.log(chalk.yellow("📝 Migrating chats..."));
    if (fs.existsSync("./chats.json")) {
      const chatsData = JSON.parse(fs.readFileSync("./chats.json", "utf-8"));
      const chatsCollection = db.collection("chats");

      // Clear existing chats
      await chatsCollection.deleteMany({});

      if (chatsData.length > 0) {
        await chatsCollection.insertMany(chatsData);
        console.log(chalk.green(`✅ Migrated ${chatsData.length} chats`));
      } else {
        console.log(chalk.yellow("⚠️  No chats found to migrate"));
      }
    } else {
      console.log(chalk.yellow("⚠️  chats.json not found, skipping chats migration"));
    }

    // Create indexes for better performance
    console.log(chalk.yellow("🔧 Creating database indexes..."));

    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ id: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true });

    const postsCollection = db.collection("posts");
    await postsCollection.createIndex({ id: 1 }, { unique: true });
    await postsCollection.createIndex({ author: 1 });

    const chatsCollection = db.collection("chats");
    await chatsCollection.createIndex({ id: 1 }, { unique: true });
    await chatsCollection.createIndex({ users: 1 });

    console.log(chalk.green("✅ Database indexes created"));

    // Verify migration
    console.log(chalk.blue("🔍 Verifying migration..."));
    const userCount = await usersCollection.countDocuments();
    const postCount = await postsCollection.countDocuments();
    const chatCount = await chatsCollection.countDocuments();

    console.log(chalk.green(`✅ Migration completed successfully!`));
    console.log(chalk.cyan(`📊 Migration Summary:`));
    console.log(chalk.cyan(`   - Users: ${userCount}`));
    console.log(chalk.cyan(`   - Posts: ${postCount}`));
    console.log(chalk.cyan(`   - Chats: ${chatCount}`));

  } catch (error) {
    console.error(chalk.red("❌ Migration failed:"), error);
    process.exit(1);
  } finally {
    await client.close();
    console.log(chalk.blue("🔌 MongoDB connection closed"));
  }
}

// Run the migration
migrateToMongoDB().then(() => {
  console.log(chalk.green("🎉 Migration process completed!"));
  console.log(chalk.yellow("💡 You can now delete the JSON files if desired:"));
  console.log(chalk.yellow("   - users.json"));
  console.log(chalk.yellow("   - posts.json"));
  console.log(chalk.yellow("   - chats.json"));
}).catch((error) => {
  console.error(chalk.red("💥 Migration process failed:"), error);
  process.exit(1);
});
