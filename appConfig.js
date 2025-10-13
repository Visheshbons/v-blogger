/**
 * v-blogger - appConfig.js
 *
 * Purpose:
 * - Fully migrate runtime JSON storage/reading to MongoDB.
 * - Remove any dependency on local JSON files at runtime.
 * - Provide helper functions and in-memory caches used by the rest of the app.
 *
 * Notes:
 * - Uses a `counters` collection to provide atomic, monotonically-increasing IDs
 *   for `users`, `posts` and `chats`.
 * - Uses `deleteMany` + `insertMany` in `save*` helpers for simplicity (keeps
 *   semantics similar to previous behavior). Individual add operations use
 *   `insertOne` to avoid rewriting entire collections unnecessarily.
 *
 * Exports:
 * - Classes: `User`, `Post`, `Comment`, `Chat`, `Message`
 * - Functions: `initializeDatabase`, `loadUsers`, `loadPosts`, `loadChats`,
 *   `saveUsers`, `savePosts`, `saveChats`, `getNextUserId`, `getNextPostId`,
 *   `addUser`, `addPost`, `addChat`, `removeChatsForUser`, `findChatIdByUsers`,
 *   `dateConversion`, and `db` reference.
 * - In-memory arrays: `users`, `posts`, `chats`
 *
 * This file is written as an ES module and uses top-level await to initialize
 * the DB and prime the in-memory caches on startup.
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import chalk from "chalk";
import fs from "fs/promises";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error(chalk.red("MONGODB_URI is not set in environment variables."));
  throw new Error("MONGODB_URI not provided");
}

const client = new MongoClient(MONGODB_URI);

let db = null;

/**
 * Initialize database connection and ensure indexes & counters are present.
 */
async function initializeDatabase() {
  try {
    await client.connect();
    db = client.db("v-blogger");
    console.log(chalk.green("✅ Database connection initialized in appConfig"));

    // Ensure required indexes
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ id: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true });

    const postsCollection = db.collection("posts");
    await postsCollection.createIndex({ id: 1 }, { unique: true });
    await postsCollection.createIndex({ author: 1 });

    const chatsCollection = db.collection("chats");
    await chatsCollection.createIndex({ id: 1 }, { unique: true });
    await chatsCollection.createIndex({ users: 1 });

    // Analytics / events collection (persistent analytics)
    const analyticsCollection = db.collection("analytics");
    // index by timestamp (Date) and by event type for efficient queries
    await analyticsCollection.createIndex({ ts: 1 });
    await analyticsCollection.createIndex({ type: 1 });

    const countersCollection = db.collection("counters");
    // Do not create an index on _id: MongoDB already provides a unique _id index by default.
    // Attempting to create a unique index on _id results in InvalidIndexSpecificationOption.
    // If we need a separate unique field, create it explicitly on that field instead.

    // Ensure counters exist and are in sync with current max ids
    await ensureCounterFromCollection("users", "users", "id");
    await ensureCounterFromCollection("posts", "posts", "id");
    await ensureCounterFromCollection("chats", "chats", "id");

    return db;
  } catch (err) {
    console.error("❌ Database initialization failed in appConfig:", err);
    throw err;
  }
}

/**
 * Ensure that the `counters` document for `counterName` exists.
 * If not present, create it using maxIdFound+1 or 1.
 *
 * @param {string} counterName - identifier in counters collection (e.g. "users")
 * @param {string} targetCollection - collection to inspect to find max id
 * @param {string} idField - field name which holds the numeric id
 */
async function ensureCounterFromCollection(
  counterName,
  targetCollection,
  idField,
) {
  const countersCollection = db.collection("counters");
  const existing = await countersCollection.findOne({ _id: counterName });
  if (existing) return;

  const col = db.collection(targetCollection);
  const maxDoc = await col
    .find({})
    .sort({ [idField]: -1 })
    .limit(1)
    .toArray();
  const nextSeq =
    maxDoc.length > 0 && typeof maxDoc[0][idField] === "number"
      ? maxDoc[0][idField] + 1
      : 1;

  await countersCollection.insertOne({ _id: counterName, seq: nextSeq });
  console.log(
    chalk.yellow(`🔢 Initialized counter ${counterName} -> ${nextSeq}`),
  );
}

/**
 * Get the next atomic sequence for a named counter (atomic via findOneAndUpdate).
 * Returns a number.
 */
async function getNextSequence(counterName) {
  const countersCollection = db.collection("counters");
  const result = await countersCollection.findOneAndUpdate(
    { _id: counterName },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true },
  );
  return result.value.seq;
}

// ---------- Classes ---------- \\

class User {
  constructor(username, password, id = null) {
    this.username = username;
    this.password = password;
    this.id = id; // numeric id
  }

  getUserName() {
    return this.username;
  }
}

class Comment {
  constructor(content, author, date = new Date().toISOString()) {
    this.content = content;
    this.author = author;
    this.date = date;
  }

  getAuthorName() {
    const user = users.find((u) => u.id === this.author);
    return user ? user.username : "Anonymous";
  }
}

class Post {
  constructor(
    title,
    content,
    author,
    date = new Date().toISOString(),
    id = null,
    likes = 0,
    likedBy = [],
    comments = [],
  ) {
    this.title = title;
    this.content = content;
    this.date = date;
    this.author = author;
    this.likes = likes;
    this.likedBy = likedBy;
    this.comments = comments;
    this.id = id;
  }

  getAuthorName() {
    const user = users.find((user) => user.id === this.author);
    return user
      ? user.username
      : typeof this.author === "string"
        ? this.author
        : "Anonymous";
  }

  getComments() {
    return (this.comments || []).map((comment) => ({
      content: comment.content,
      author: comment.author,
      date: comment.date,
    }));
  }
}

class Message {
  constructor(chatID, from, content, date = new Date().toISOString()) {
    this.chatID = chatID;
    this.from = from;
    this.content = content;
    this.date = date;
  }
}

class Chat {
  constructor(id, usersArr, messages = []) {
    this.id = id;
    this.users = usersArr;
    this.messages = messages;
  }
}

// ---------- In-memory caches (primed at startup) ---------- \\

let users = [];
let posts = [];
let chats = [];
let analyticsCollection = null;

// ---------- Load helpers ---------- \\

async function loadUsers() {
  try {
    const usersCollection = db.collection("users");
    const docs = await usersCollection.find({}).sort({ id: 1 }).toArray();
    // Normalize to `User` instances (if needed)
    return docs.map((d) => new User(d.username, d.password, d.id));
  } catch (err) {
    console.error("Error loading users from MongoDB:", err);
    return [];
  }
}

async function loadPosts() {
  try {
    const postsCollection = db.collection("posts");
    const docs = await postsCollection.find({}).sort({ id: 1 }).toArray();
    return docs.map(
      (p) =>
        new Post(
          p.title,
          p.content,
          p.author,
          p.date,
          p.id,
          p.likes || 0,
          p.likedBy || [],
          p.comments || [],
        ),
    );
  } catch (err) {
    console.error("Error loading posts from MongoDB:", err);
    return [];
  }
}

async function loadChats() {
  try {
    const chatsCollection = db.collection("chats");
    const docs = await chatsCollection.find({}).sort({ id: 1 }).toArray();
    return docs.map((c) => new Chat(c.id, c.users || [], c.messages || []));
  } catch (err) {
    console.error("Error loading chats from MongoDB:", err);
    return [];
  }
}

// ---------- Save helpers (replace collection with in-memory snapshot) ---------- \\

async function saveUsers(usersArray) {
  try {
    const usersCollection = db.collection("users");
    // Replace entire collection contents to keep parity with previous behavior
    await usersCollection.deleteMany({});
    if (usersArray.length > 0) {
      // Ensure plain objects (no methods)
      const documents = usersArray.map((u) => ({
        username: u.username,
        password: u.password,
        id: u.id,
      }));
      await usersCollection.insertMany(documents);
    }
    console.log(chalk.green(`✅ Saved ${usersArray.length} users to MongoDB`));
  } catch (err) {
    console.error("Error saving users to MongoDB:", err);
    throw err;
  }
}

async function savePosts(postsArray) {
  try {
    const postsCollection = db.collection("posts");
    await postsCollection.deleteMany({});
    if (postsArray.length > 0) {
      const documents = postsArray.map((p) => ({
        title: p.title,
        content: p.content,
        author: p.author,
        date: p.date,
        id: p.id,
        likes: p.likes || 0,
        likedBy: p.likedBy || [],
        comments: p.comments || [],
      }));
      await postsCollection.insertMany(documents);
    }
    console.log(chalk.green(`✅ Saved ${postsArray.length} posts to MongoDB`));
  } catch (err) {
    console.error("Error saving posts to MongoDB:", err);
    throw err;
  }
}

async function saveChats(chatsArray) {
  try {
    const chatsCollection = db.collection("chats");
    await chatsCollection.deleteMany({});
    if (chatsArray.length > 0) {
      const documents = chatsArray.map((c) => ({
        id: c.id,
        users: c.users,
        messages: c.messages || [],
      }));
      await chatsCollection.insertMany(documents);
    }
    console.log(chalk.green(`✅ Saved ${chatsArray.length} chats to MongoDB`));
  } catch (err) {
    console.error("Error saving chats to MongoDB:", err);
    throw err;
  }
}

// ---------- ID helpers (use counters) ---------- \\

async function getNextUserId() {
  try {
    return await getNextSequence("users");
  } catch (err) {
    console.error("Error getting next user ID:", err);
    // Fallback: compute from in-memory cache
    return users.length ? Math.max(...users.map((u) => u.id || 0)) + 1 : 1;
  }
}

async function getNextPostId() {
  try {
    return await getNextSequence("posts");
  } catch (err) {
    console.error("Error getting next post ID:", err);
    return posts.length ? Math.max(...posts.map((p) => p.id || 0)) + 1 : 1;
  }
}

async function getNextChatId() {
  try {
    return await getNextSequence("chats");
  } catch (err) {
    console.error("Error getting next chat ID:", err);
    return chats.length ? Math.max(...chats.map((c) => c.id || 0)) + 1 : 1;
  }
}

// ---------- Add helpers (insert single docs) ---------- \\

async function addUser(user) {
  if (!user.id) {
    user.id = await getNextUserId();
  }
  const usersCollection = db.collection("users");
  const doc = { username: user.username, password: user.password, id: user.id };
  await usersCollection.insertOne(doc);
  // Keep in-memory cache consistent
  users.push(new User(doc.username, doc.password, doc.id));
  return user;
}

async function addPost(post) {
  if (!post.id) {
    post.id = await getNextPostId();
  }
  const postsCollection = db.collection("posts");
  const doc = {
    title: post.title,
    content: post.content,
    author: post.author,
    date: post.date,
    id: post.id,
    likes: post.likes || 0,
    likedBy: post.likedBy || [],
    comments: post.comments || [],
  };
  await postsCollection.insertOne(doc);
  posts.push(
    new Post(
      doc.title,
      doc.content,
      doc.author,
      doc.date,
      doc.id,
      doc.likes,
      doc.likedBy,
      doc.comments,
    ),
  );
  return post;
}

async function addChat(chat) {
  if (!chat.id) {
    chat.id = await getNextChatId();
  }
  const chatsCollection = db.collection("chats");
  const doc = { id: chat.id, users: chat.users, messages: chat.messages || [] };
  await chatsCollection.insertOne(doc);
  chats.push(new Chat(doc.id, doc.users, doc.messages));
  return chat;
}

// ---------- Other helpers ---------- \\

function findChatIdByUsers(userA, userB) {
  return chats.find(
    (chat) =>
      chat.users.length === 2 &&
      ((chat.users[0] === userA && chat.users[1] === userB) ||
        (chat.users[0] === userB && chat.users[1] === userA)),
  );
}

async function removeChatsForUser(userId) {
  chats = chats.filter((chat) => !chat.users.includes(userId));
  await saveChats(chats);
}

function dateConversion() {
  // This function is intended to be injected into client-side HTML and
  // referenced by views. Keep it as a string if it's serialized to templates.
  // For server-side usage, we keep a no-op that gets replaced in templates.
  // (index.js used this as a reference for client-side asset)
  // No-op here; templates still call `dateConversion` name.
}

// ---------- Bootstrap: initialize DB and load caches ---------- \\

await initializeDatabase();

// ensure module-level reference for analytics collection (created during init)
analyticsCollection = db.collection("analytics");

users = await loadUsers();
posts = await loadPosts();
chats = await loadChats();

console.log(
  chalk.green(
    `✅ Loaded caches: users=${users.length}, posts=${posts.length}, chats=${chats.length}`,
  ),
);

// -----------------------------
// Persistent analytics helpers
// -----------------------------

/**
 * recordAnalyticsEvent
 * Persist a single analytics event into the `analytics` collection.
 * event: { type: string, ts?: string|Date, meta?: object }
 * We store ts as a Date object to make aggregation queries simpler.
 */
async function recordAnalyticsEvent(event) {
  if (!analyticsCollection) analyticsCollection = db.collection("analytics");
  const doc = {
    type: String(event.type || "event"),
    ts: event.ts ? new Date(event.ts) : new Date(),
    meta: event.meta || {},
  };
  await analyticsCollection.insertOne(doc);
  return doc;
}

/**
 * getAnalyticsHourly
 * Returns an array of 24 numbers corresponding to counts per hour (UTC) for the given date (YYYY-MM-DD).
 * type is optional (defaults to 'visit'); pass null/undefined to include all types.
 */
async function getAnalyticsHourly(dateStr, type = "visit") {
  if (!analyticsCollection) analyticsCollection = db.collection("analytics");
  const start = new Date(dateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const match = { ts: { $gte: start, $lt: end } };
  if (type) match.type = type;

  const pipeline = [
    { $match: match },
    { $project: { hour: { $hour: { date: "$ts", timezone: "UTC" } } } },
    { $group: { _id: "$hour", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];

  const rows = await analyticsCollection.aggregate(pipeline).toArray();
  const counts = Array(24).fill(0);
  for (const r of rows) {
    // _id is hour number (0-23)
    if (typeof r._id === "number" && r._id >= 0 && r._id < 24)
      counts[r._id] = r.count;
  }
  return counts;
}

/**
 * getAnalyticsDailyTotals
 * Returns an array of { date: 'YYYY-MM-DD', count: Number } for the date range [fromDate, toDate].
 * Dates should be ISO strings or Date instances. The function uses UTC days.
 */
async function getAnalyticsDailyTotals(fromDate, toDate, type = "visit") {
  if (!analyticsCollection) analyticsCollection = db.collection("analytics");
  const start = new Date(fromDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1); // make end exclusive

  const match = { ts: { $gte: start, $lt: end } };
  if (type) match.type = type;

  const pipeline = [
    { $match: match },
    {
      $project: {
        day: {
          $dateToString: { format: "%Y-%m-%d", date: "$ts", timezone: "UTC" },
        },
      },
    },
    { $group: { _id: "$day", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];

  const rows = await analyticsCollection.aggregate(pipeline).toArray();
  return rows.map((r) => ({ date: r._id, count: r.count }));
}

/**
 * getAnalyticsWeeklyAverages
 * Compute average counts per weekday across the last `days` days (defaults to 28).
 * Returns an array of 7 numbers where index 0 = Sunday, 1 = Monday, ... 6 = Saturday.
 */
async function getAnalyticsWeeklyAverages(days = 28, type = "visit") {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);

  const dailyTotals = await getAnalyticsDailyTotals(
    start.toISOString(),
    end.toISOString(),
    type,
  );

  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);

  for (const d of dailyTotals) {
    const dow = new Date(d.date + "T00:00:00Z").getUTCDay();
    sums[dow] += d.count;
    counts[dow] += 1;
  }

  return sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
}

/**
 * loadVersionMarkers
 * Attempt to load version markers from a JSON file (user will provide).
 * Expected JSON format: [{ "version": "v3.0.1", "ts": "2025-10-12T01:02:03Z" }, ...]
 * Returns an array of normalized markers: { version, ts: ISOString }.
 */
async function loadVersionMarkers(filepath = "./version_releases.json") {
  try {
    const raw = await fs.readFile(filepath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => {
        if (!v || !v.version || !v.ts) return null;
        return { version: String(v.version), ts: new Date(v.ts).toISOString() };
      })
      .filter(Boolean);
  } catch (err) {
    // If file does not exist or is invalid, return empty array
    return [];
  }
}

// ---------- Export ---------- \\

export {
  Post,
  posts,
  savePosts,
  loadPosts,
  dateConversion,
  User,
  users,
  saveUsers,
  loadUsers,
  getNextUserId,
  addUser,
  addPost,
  addChat,
  Chat,
  Message,
  chats,
  saveChats,
  loadChats,
  findChatIdByUsers,
  removeChatsForUser,
  getNextPostId,
  db,
  initializeDatabase,
  // Analytics exports
  recordAnalyticsEvent,
  getAnalyticsHourly,
  getAnalyticsDailyTotals,
  getAnalyticsWeeklyAverages,
  loadVersionMarkers,
  // expose analytics collection reference for advanced queries if needed
  analyticsCollection,
};
