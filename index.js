import express from 'express';
import chalk from 'chalk';
import cookieParser from 'cookie-parser';
import { statusCode } from './errors.js';
import { Post, posts, savePosts, dateConversion, User, users, saveUsers } from './appConfig.js';
import { SHA1 } from './sha1.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    statusCode(req, res, 200);
    let userLoggedInRN;
    if (!req.cookies.loggedIn) {
        userLoggedInRN = false;
    } else {
        userLoggedInRN = true;
    }
    res.render('index.ejs', { 
        posts,
        users,
        loggedIn: req.cookies.loggedIn || false,
        userId: req.cookies.id || null,
        userLoggedInRN
     });
});

app.get('/post', (req, res) => {
    statusCode(req, res, 200);
    let userLoggedInRN;
    if (!req.cookies.loggedIn) {
        userLoggedInRN = false;
    } else {
        userLoggedInRN = true;
    }
    res.render('post.ejs', { userLoggedInRN });
}).post('/post', (req, res) => {
    statusCode(req, res, 202);
    console.log(req.body); // Debugging line
    let { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).send('Title and content are required!');
    }
    const userId = req.cookies.id;
    const user = users.find(u => u.id === userId);
    const newPost = new Post(title, content, userId ? Number(userId) : null);
    posts.push(newPost);
    savePosts(posts);
    console.log(`New post added: ${title}`);
    res.status(201).redirect("/");
});

app.get('/login', (req, res) => {
    statusCode(req, res, 200);
    let userLoggedInRN;
    if (!req.cookies.loggedIn) {
        userLoggedInRN = false;
    } else {
        userLoggedInRN = true;
    }
    res.render('login.ejs', { userLoggedInRN, SHA1 });
}).post('/login', (req, res) => {
    statusCode(req, res, 202);
    console.log(req.body); // Debugging line
    const { username, password_sha1 } = req.body;
    const user = users.find(u => u.username === username && u.password === password_sha1);
    if (!user) {
        return res.status(401).send('Invalid username or password!');
    }
    console.log(`User logged in: ${username}`);
    res.status(200).cookie('loggedIn', true).cookie('id', user.id).redirect("/");
});

app.get('/signup', (req, res) => {
    statusCode(req, res, 200);
    let userLoggedInRN;
    if (!req.cookies.loggedIn) {
        userLoggedInRN = false;
    } else {
        userLoggedInRN = true;
    }
    res.render('signup.ejs', { userLoggedInRN });
}).post('/signup', (req, res) => {
    statusCode(req, res, 202);
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required!');
    }
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
        return res.status(409).send('Username already exists!');
    }
    const newUser = new User(username, SHA1(password));
    users.push(newUser);
    saveUsers(users);
    console.log(`New user signed up: ${chalk.greenBright(username)}`);
    res.status(201).cookie('loggedIn', true).cookie('id', newUser.id).redirect("/");
});

app.get('/logout', (req, res) => {
    statusCode(req, res, 200);
    res.clearCookie('loggedIn');
    res.clearCookie('id');
    res.redirect('/');
});

app.get('/posts', (req, res) => {
    statusCode(req, res, 200);
    let userLoggedInRN;
    if (!req.cookies.loggedIn) {
        userLoggedInRN = false;
    } else {
        userLoggedInRN = true;
    }
    res.render('posts.ejs', { posts, userLoggedInRN });
});

app.get('/error', (req, res, next) => {
    // This will trigger the error handler
    next(new Error('This is a test internal server error!'));
});

app.use((req, res, next) => {
    statusCode(req, res, 404);
    next();
});

app.use((err, req, res, next) => {
    statusCode(req, res, err.status || 500);
});

app.listen(port, () => {
    console.log(`Server is running on port ${chalk.green(port)}`);
});