// Imports all the neccecary data
import express from 'express';
import chalk from 'chalk';
import fs from 'fs';



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
}

let users = loadUsers();








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
    constructor(title, content, author, date = new Date().toISOString()) {
        this.title = title;
        this.content = content;
        this.date = date;
        // Always store the user ID (or null/undefined for anonymous)
        this.author = author;
    }

    // Helper to get the username for display
    getAuthorName() {
        const user = users.find(user => user.id === this.author);
        return user ? user.username : (typeof this.author === 'string' ? this.author : 'Anonymous');
    }
}

let posts = loadPosts().map(
  post => new Post(post.title, post.content, post.author, post.date)
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



export { Post, posts, savePosts, dateConversion, User, users, saveUsers };