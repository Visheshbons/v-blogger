// Imports all the neccecary data
import express from 'express';
import chalk from 'chalk';
import fs from 'fs';

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
        this.author = author;
    };
};

let posts = loadPosts();

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

export { Post, posts, savePosts, dateConversion };