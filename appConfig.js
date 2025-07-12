// ---------- Importing Required Modules ---------- \\
import express from 'express';
import chalk from 'chalk';
import fs from 'fs';




// ---------- Users ------------ \\

const userFilePath = './users.json';
function loadUsers() {
    if (fs.existsSync(userFilePath)) {
        const data = fs.readFileSync(userFilePath, 'utf-8');
        return JSON.parse(data);
    }
    return [];
}

function saveUsers(users) {
    fs.writeFileSync(userFilePath, JSON.stringify(users, null, 2), 'utf-8');
}

class User {
    constructor(username, password, id = users.length + 1) {
        this.id = id;
        this.username = username;
        this.password = password;
    }

    getUserName() {
        return this.username;
    }
}

let users = loadUsers();






// -------------- Posts ------------ \\

const postsFilePath = './posts.json';

// Function to load posts from the file
function loadPosts() {
    if (fs.existsSync(postsFilePath)) {
        const data = fs.readFileSync(postsFilePath, 'utf-8');
        return JSON.parse(data);
    }
    return [];
}

// Function to save posts to the file
function savePosts(posts) {
    fs.writeFileSync(postsFilePath, JSON.stringify(posts, null, 2), 'utf-8');
}

class Post {
    constructor(title, content, author, date = new Date().toISOString(), id = null, likes = 0, likedBy = [], comments = []) {
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
        const user = users.find(user => user.id === this.author);
        return user ? user.username : (typeof this.author === 'string' ? this.author : 'Anonymous');
    }

    getComments() {
        return this.comments.map(comment => ({
            content: comment.content,
            author: comment.getAuthorName(),
            date: comment.date
        }));
    }
}

let posts = loadPosts().map(
  post => new Post(
    post.title, post.content, post.author, post.date, post.id,
    post.likes || 0,
    post.likedBy || [],
    post.comments || []
  )
);

function dateConversion() {
    document.addEventListener('DOMContentLoaded', () => {
        const dateElements = document.querySelectorAll('[data-post-date]');
        dateElements.forEach(element => {
            const isoDate = element.getAttribute('data-post-date');
            const localDate = new Date(isoDate).toLocaleString();
            element.textContent = localDate;
        });
    });
};

// Helper function
function getNextPostId(posts) {
    return posts.length ? Math.max(...posts.map(p => p.id || 0)) + 1 : 1;
}

class Comment {
    constructor(content, author, date = new Date().toISOString()) {
        this.content = content;
        this.author = author;
        this.date = date;
    }

    // Helper to get the username for display
    getAuthorName() {
        const user = users.find(user => user.id === this.author);
        return user ? user.username : (typeof this.author === 'string' ? this.author : 'Anonymous');
    }
}





// ------------- Chats ------------ \\

const chatsFilePath = './chats.json';
function loadChats() {
    if (fs.existsSync(chatsFilePath)) {
        const data = fs.readFileSync(chatsFilePath, 'utf-8');
        return JSON.parse(data);
    }
    return [];
}

function saveChats(chats) {
    fs.writeFileSync(chatsFilePath, JSON.stringify(chats, null, 2), 'utf-8');
}

let chats = loadChats();

// Helper: Find chat by user pair (order-insensitive)
function findChatIdByUsers(userA, userB) {
    return chats.find(chat =>
        chat.users.length === 2 &&
        ((chat.users[0] === userA && chat.users[1] === userB) ||
         (chat.users[0] === userB && chat.users[1] === userA))
    );
}

// Helper: Remove chats if a user is deleted
function removeChatsForUser(userId) {
    chats = chats.filter(chat => !chat.users.includes(userId));
    saveChats(chats);
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





// ---------- Export ---------- \\

export { Post, posts, savePosts, dateConversion, User, users, saveUsers, Chat, Message, chats, saveChats, loadChats, findChatIdByUsers, removeChatsForUser, getNextPostId };