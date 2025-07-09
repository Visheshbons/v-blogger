import express from 'express';
import chalk from 'chalk';
import { statusCode } from './errors.js';
import { Post, posts, savePosts, dateConversion } from './appConfig.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    statusCode(req, res, 200);
    res.render('index.ejs', { posts });
});

app.get('/post', (req, res) => {
    statusCode(req, res, 200);
    res.render('post.ejs');
}).post('/post', (req, res) => {
    statusCode(req, res, 202);
    console.log(req.body); // Debugging line
    let { title, content, author } = req.body;
    if (!title || !content || !author) {
        return res.status(400).send('Title and content are required!');
    }
    const newPost = new Post(title, content, author);
    posts.push(newPost);
    savePosts(posts);
    console.log(`New post added: ${title}`);
    res.status(201).redirect("/");
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