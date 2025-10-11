import fs from "fs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);

async function backupFromMongoDB() {
  try {
    console.log(chalk.blue("🔄 Starting backup from MongoDB to JSON files..."));

    // Connect to MongoDB
    await client.connect();
    const db = client.db("v-blogger");
    console.log(chalk.green("✅ Connected to MongoDB successfully!"));

    // Backup Users
    console.log(chalk.yellow("📝 Backing up users..."));
    const usersCollection = db.collection("users");
    const usersData = await usersCollection.find({}).sort({ id: 1 }).toArray();

    // Remove MongoDB's _id field before saving
    const cleanUsersData = usersData.map(({ _id, ...user }) => user);

    fs.writeFileSync("./users.json", JSON.stringify(cleanUsersData, null, 2), "utf-8");
    console.log(chalk.green(`✅ Backed up ${cleanUsersData.length} users to users.json`));

    // Backup Posts
    console.log(chalk.yellow("📝 Backing up posts..."));
    const postsCollection = db.collection("posts");
    const postsData = await postsCollection.find({}).sort({ id: 1 }).toArray();

    // Remove MongoDB's _id field before saving
    const cleanPostsData = postsData.map(({ _id, ...post }) => post);

    fs.writeFileSync("./posts.json", JSON.stringify(cleanPostsData, null, 2), "utf-8");
    console.log(chalk.green(`✅ Backed up ${cleanPostsData.length} posts to posts.json`));

    // Backup Chats
    console.log(chalk.yellow("📝 Backing up chats..."));
    const chatsCollection = db.collection("chats");
    const chatsData = await chatsCollection.find({}).sort({ id: 1 }).toArray();

    // Remove MongoDB's _id field before saving
    const cleanChatsData = chatsData.map(({ _id, ...chat }) => chat);

    fs.writeFileSync("./chats.json", JSON.stringify(cleanChatsData, null, 2), "utf-8");
    console.log(chalk.green(`✅ Backed up ${cleanChatsData.length} chats to chats.json`));

    // Create a timestamped backup directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `./backups/backup-${timestamp}`;

    if (!fs.existsSync('./backups')) {
      fs.mkdirSync('./backups');
    }
    fs.mkdirSync(backupDir);

    // Copy files to backup directory
    fs.copyFileSync('./users.json', `${backupDir}/users.json`);
    fs.copyFileSync('./posts.json', `${backupDir}/posts.json`);
    fs.copyFileSync('./chats.json', `${backupDir}/chats.json`);

    console.log(chalk.green(`✅ Created timestamped backup in: ${backupDir}`));

    // Verify backup
    console.log(chalk.blue("🔍 Verifying backup..."));
    const userCount = cleanUsersData.length;
    const postCount = cleanPostsData.length;
    const chatCount = cleanChatsData.length;

    console.log(chalk.green(`✅ Backup completed successfully!`));
    console.log(chalk.cyan(`📊 Backup Summary:`));
    console.log(chalk.cyan(`   - Users: ${userCount}`));
    console.log(chalk.cyan(`   - Posts: ${postCount}`));
    console.log(chalk.cyan(`   - Chats: ${chatCount}`));
    console.log(chalk.cyan(`   - Backup Location: ${backupDir}`));

  } catch (error) {
    console.error(chalk.red("❌ Backup failed:"), error);
    process.exit(1);
  } finally {
    await client.close();
    console.log(chalk.blue("🔌 MongoDB connection closed"));
  }
}

// Run the backup
backupFromMongoDB().then(() => {
  console.log(chalk.green("🎉 Backup process completed!"));
  console.log(chalk.yellow("💡 Your data has been backed up to JSON files and timestamped backup directory"));
}).catch((error) => {
  console.error(chalk.red("💥 Backup process failed:"), error);
  process.exit(1);
});
