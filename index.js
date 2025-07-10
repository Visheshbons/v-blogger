import express from 'express';
import chalk from 'chalk';
import cookieParser from 'cookie-parser';
import { statusCode } from './errors.js';
import { Post, posts, savePosts, dateConversion, User, users, saveUsers, Chat, Message, chats, saveChats, loadChats, findChatIdByUsers, removeChatsForUser } from './appConfig.js';
import { SHA1 } from './sha1.js';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import hljs from 'highlight.js';

const app = express();
const port = process.env.PORT || 3001;
const AutoMaintenanceMode = false;



// ---------- Middleware ---------- \\

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    } else {
      return hljs.highlightAuto(code).value;
    }
  }
});


const forbiddenChars = /[\/\\{}\[\]<>\"']/;

function checkForbiddenChars(fields) {
    return (req, res, next) => {
        for (const field of fields) {
            if (req.body[field] && forbiddenChars.test(req.body[field])) {
                return res.status(400).send(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>Input Error</title>
                    </head>
                    <body>
                        <center><pre>
                        Input contains illegal characters: / \\ { } [ ] < > " ' <br>
                        You are an idiot. <br>
                        Eres un idiota. <br>
                        Vous êtes un idiot. <br>
                        你是个白痴。 <br>
                        君はバカだ。 <br>
                        Tu es un imbécile. <br>
                        Du bist ein Idiot. <br>
                        Você é um idiota. <br>
                        </pre></center>
                    </body>
                    </html>
                `);
            }
        }
        next();
    };
}


function renderMarkdown(mdText) {
    const html = marked.parse(mdText);
    return sanitizeHtml(html, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ['src', 'alt']
        }
    });
}

function adminOnly(req, res, next) {
    // Assuming req.cookies.id is a string, convert to number
    if (Number(req.cookies.id) === 0) {
        return next();
    }
    return res.statusCode(403); // Using custom API
}




// ---------- Routes ---------- \\

app.get('/', (req, res) => {
    statusCode(req, res, 200);
    let userLoggedInRN = !!req.cookies.loggedIn;

    // Convert post content from Markdown to sanitized HTML
    const renderedPosts = posts.map(post => ({
        ...post,
        htmlContent: renderMarkdown(post.content)
    }));

    res.render('index.ejs', {
        posts: renderedPosts,
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
}).post('/post', checkForbiddenChars(['title']), (req, res) => {
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
}).post('/login', checkForbiddenChars(['username', 'password_sha1']), (req, res) => {
    statusCode(req, res, 202);
    console.log(req.body); // Debugging line
    const { username, password_sha1 } = req.body;
    const user = users.find(u => u.username === username && u.password === password_sha1);
    if (!user) {
        return res.status(401).send('Invalid username or password!');
        console.log(`${chalk.red(`401`)}: Attempted login with invalid credentials for user: ${username}`);
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
}).post('/signup', checkForbiddenChars(['username', 'password']), (req, res) => {
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


    const renderedPosts = posts.map(post => ({
        ...post,
        htmlContent: renderMarkdown(post.content)
    }));

    res.render('posts.ejs', {
        posts: renderedPosts,
        users,
        loggedIn: req.cookies.loggedIn || false,
        userId: req.cookies.id || null,
        userLoggedInRN
    });
});

app.get('/profile', (req, res) => {
    statusCode(req, res, 200);
    let userLoggedInRN;
    if (!req.cookies.loggedIn) {
        userLoggedInRN = false;
    } else {
        userLoggedInRN = true;
    }
    const userId = req.cookies.id;
    const user = users.find(u => u.id === Number(userId));
    if (!user) {
        return statusCode(403);
    }
    res.render('user.ejs', { user, users, userLoggedInRN });
});

app.get('/chats/:userID', (req, res) => {
    statusCode(req, res, 200);
    const userID = Number(req.params.userID);
    const userChats = chats.filter(chat => chat.users.includes(userID));
    res.json(userChats);
}).post('/chats', checkForbiddenChars(['userA', 'userB']), (req, res) => {
    statusCode(req, res, 202);
    let { userA, userB } = req.body;
    userA = Number(userA);
    userB = Number(userB);
    if (!userA || !userB) {
        return res.status(400).send('User A and User B are required!');
    }
    const chatObj = findChatIdByUsers(userA, userB);
    if (chatObj) {
        return res.status(409).send('Chat already exists!');
    }
    const newChat = new Chat(chats.length + 1, [userA, userB]);
    chats.push(newChat);
    saveChats(chats);
    res.status(201).json(newChat);
}).delete('/chats/:chatId', (req, res) => {
    statusCode(req, res, 202);
    const chatId = req.params.chatId;
    const chatIndex = chats.findIndex(chat => chat.id === Number(chatId));
    if (chatIndex === -1) {
        return res.status(404).send('Chat not found!');
    }
    chats.splice(chatIndex, 1);
    saveChats(chats);
    res.status(204).send();
}).post('/chats/:chatId/messages', checkForbiddenChars(['from']), (req, res) => {
    statusCode(req, res, 202);
    const chatId = Number(req.params.chatId);
    let { from, content } = req.body;
    from = Number(from);
    if (!from || !content) {
        return res.status(400).send('From and content are required!');
    }
    const chat = chats.find(c => c.id === chatId);
    if (!chat) {
        return res.status(404).send('Chat not found!');
    }
    const newMessage = new Message(chatId, from, content);
    console.log(`New message from user ${chalk.greenBright(from)} in chat ${chalk.greenBright(chatId)}: ${chalk.grey(content)}`);
    chat.messages.push(newMessage);
    saveChats(chats);
    res.status(201).json(newMessage);
});




// ---------- Secret Routes ---------- \\

// app.get('/letMeSeeAllThePrivateMessages', (req, res) => {
//     res.status(200).sendFile('./chats.json')
// });

// app.get('/letMeSeeAllTheUsers', (req, res) => {
//     res.status(200).sendFile('./users.json')
// });

// app.get('/letMeSeeAllThePosts', (req, res) => {
//     res.status(200).sendFile('./posts.json')
// });




// ---------- Debug routes ---------- \\

app.get('/error', (req, res, next) => {
    // This will trigger the error handler
    next(new Error('This is a test internal server error!'));
});




// ---------- Error Handler ---------- \\

app.use((req, res, next) => {
    statusCode(req, res, 404);
    next();
});

app.use((err, req, res, next) => {
    statusCode(req, res, err.status || 500);
});




// ---------- Runtime ---------- \\

app.listen(port, () => {
    console.log(`Server is running on port ${chalk.green(port)}`);
});

import { spawn } from 'child_process';

function runOnShutdown() {

    console.log(chalk.yellow(`[AUTO MAINTENENCE]: ${chalk.green('STARTING...')}`));

    // Build the command and arguments
    const maintenancePath = '../../Please Wait/Fullstack'; // Adjust as needed
    const child = spawn(
        'nodemon',
        ['index.js'],
        {
            cwd: maintenancePath,    // Set working directory
            detached: true,          // Detach from parent
            stdio: 'ignore',         // Ignore stdio so parent can exit
            shell: true              // Use shell for Windows compatibility
    });

    child.unref(); // Allow the child to keep running after parent exits
    console.log(chalk.yellow(`[AUTO MAINTENENCE]: ${chalk.green('RUNNING')}`));
    process.exit(0);
}

if (AutoMaintenanceMode) {
    console.log(chalk.yellow(`[AUTO MAINTENENCE]: ${chalk.green('ACTIVE')}`));
    process.on('SIGINT', runOnShutdown);
    process.on('SIGTERM', runOnShutdown);
} else {
    console.log(chalk.yellow(`[AUTO MAINTENENCE]: ${chalk.red('INACTIVE')}`));
}