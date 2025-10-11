// ---------- Importing Required Modules ---------- \\
import express from "express";
import chalk from "chalk";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
let db;

// Initialize MongoDB connection
async function initializeDatabase() {
  try {
    await client.connect();
    db = client.db("v-blogger");
    console.log("✅ Database connection initialized in appConfig");
    return db;
  } catch (err) {
    console.error("❌ Database initialization failed in appConfig:", err);
    throw err;
  }
}

// Call initialization
await initializeDatabase();

// ---------- Users ------------ \\

async function loadUsers() {
  try {
    const usersCollection = db.collection("users");
    const users = await usersCollection.find({}).sort({ id: 1 }).toArray();
    return users;
  } catch (err) {
    console.error("Error loading users from MongoDB:", err);
    return [];
  }
}

async function saveUsers(users) {
  try {
    const usersCollection = db.collection("users");

    // Clear existing users and insert new ones
    await usersCollection.deleteMany({});
    if (users.length > 0) {
      await usersCollection.insertMany(users);
    }

    console.log(`✅ Saved ${users.length} users to MongoDB`);
  } catch (err) {
    console.error("Error saving users to MongoDB:", err);
  }
}

async function getNextUserId() {
  try {
    const usersCollection = db.collection("users");
    const lastUser = await usersCollection.findOne({}, { sort: { id: -1 } });
    return lastUser ? lastUser.id + 1 : 1;
  } catch (err) {
    console.error("Error getting next user ID:", err);
    return 1;
  }
}

class User {
  constructor(username, password, id = null) {
    if (id === null) {
      // This will be set properly when saving
      this.id = null;
    } else {
      this.id = id;
    }
    this.username = username;
    this.password = password;
  }

  getUserName() {
    return this.username;
  }
}

let users = await loadUsers();

// -------------- Posts ------------ \\

async function loadPosts() {
  try {
    const postsCollection = db.collection("posts");
    const posts = await postsCollection.find({}).sort({ id: 1 }).toArray();
    return posts;
  } catch (err) {
    console.error("Error loading posts from MongoDB:", err);
    return [];
  }
}

async function savePosts(posts) {
  try {
    const postsCollection = db.collection("posts");

    // Clear existing posts and insert new ones
    await postsCollection.deleteMany({});
    if (posts.length > 0) {
      await postsCollection.insertMany(posts);
    }

    console.log(`✅ Saved ${posts.length} posts to MongoDB`);
  } catch (err) {
    console.error("Error saving posts to MongoDB:", err);
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
    this.likedBy = likedBy; // Array of user IDs who have liked this post
    this.comments = comments;
    this.id = id;
  }

  // Helper to get the username for display
  getAuthorName() {
    const user = users.find((user) => user.id === this.author);
    return user
      ? user.username
      : typeof this.author === "string"
        ? this.author
        : "Anonymous";
  }

  getComments() {
    return this.comments.map((comment) => ({
      content: comment.content,
      author: comment.getAuthorName ? comment.getAuthorName() : comment.author,
      date: comment.date,
    }));
  }
}

let posts = (await loadPosts()).map(
  (post) =>
    new Post(
      post.title,
      post.content,
      post.author,
      post.date,
      post.id,
      post.likes || 0,
      post.likedBy || [],
      post.comments || [],
    ),
);

function dateConversion() {
  document.addEventListener("DOMContentLoaded", () => {
    const dateElements = document.querySelectorAll("[data-post-date]");
    dateElements.forEach((element) => {
      const isoDate = element.getAttribute("data-post-date");
      const localDate = new Date(isoDate).toLocaleString();
      element.textContent = localDate;
    });
  });
}

// Helper function
function getNextPostId(posts) {
  return posts.length ? Math.max(...posts.map((p) => p.id || 0)) + 1 : 1;
}

class Comment {
  constructor(content, author, date = new Date().toISOString()) {
    this.content = content;
    this.author = author;
    this.date = date;
  }

  // Helper to get the username for display
  getAuthorName() {
    const user = users.find((user) => user.id === this.author);
    return user
      ? user.username
      : typeof this.author === "string"
        ? this.author
        : "Anonymous";
  }
}

// ------------- Chats ------------ \\

async function loadChats() {
  try {
    const chatsCollection = db.collection("chats");
    const chats = await chatsCollection.find({}).sort({ id: 1 }).toArray();
    return chats;
  } catch (err) {
    console.error("Error loading chats from MongoDB:", err);
    return [];
  }
}

async function saveChats(chats) {
  try {
    const chatsCollection = db.collection("chats");

    // Clear existing chats and insert new ones
    await chatsCollection.deleteMany({});
    if (chats.length > 0) {
      await chatsCollection.insertMany(chats);
    }

    console.log(`✅ Saved ${chats.length} chats to MongoDB`);
  } catch (err) {
    console.error("Error saving chats to MongoDB:", err);
  }
}

let chats = await loadChats();

// Helper: Find chat by user pair (order-insensitive)
function findChatIdByUsers(userA, userB) {
  return chats.find(
    (chat) =>
      chat.users.length === 2 &&
      ((chat.users[0] === userA && chat.users[1] === userB) ||
        (chat.users[0] === userB && chat.users[1] === userA)),
  );
}

// Helper: Remove chats if a user is deleted
async function removeChatsForUser(userId) {
  chats = chats.filter((chat) => !chat.users.includes(userId));
  await saveChats(chats);
}

class Chat {
  constructor(id, users, messages = []) {
    this.id = id;
    this.users = users;
    this.messages = messages;
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

// ---------- Helper Functions for User Management ---------- \\

async function addUser(user) {
  if (!user.id) {
    user.id = await getNextUserId();
  }
  users.push(user);
  await saveUsers(users);
  return user;
}

async function addPost(post) {
  if (!post.id) {
    post.id = getNextPostId(posts);
  }
  posts.push(post);
  await savePosts(posts);
  return post;
}

async function addChat(chat) {
  chats.push(chat);
  await saveChats(chats);
  return chat;
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
};
