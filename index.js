import express from "express";
import chalk from "chalk";
import cookieParser from "cookie-parser";
import { statusCode } from "./errors.js";
import {
  Post,
  posts,
  savePosts,
  dateConversion,
  User,
  users,
  saveUsers,
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
  getNextUserId,
  // analytics helpers (persistent)
  recordAnalyticsEvent,
  getAnalyticsHourly,
  getAnalyticsDailyTotals,
  getAnalyticsWeeklyAverages,
  loadVersionMarkers,
} from "./appConfig.js";
import { SHA1 } from "./sha1.js";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import hljs from "highlight.js";

import dotenv from "dotenv";

const app = express();
const port = process.env.PORT || 3000;
const AutoMaintenanceMode = false;

dotenv.config();

// ---------- Analytics ---------- \\
let homeVisits = 0;
let logins = 0;
let signups = 0;

// ---------- Middleware ---------- \\

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    } else {
      return hljs.highlightAuto(code).value;
    }
  },
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
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt"],
    },
  });
}

function adminOnly(req, res, next) {
  // Assuming req.cookies.id is a string, convert to number
  if (Number(req.cookies.id) === 1) {
    return next();
  }
  return statusCode(req, res, 403); // Using custom API
}

function limitPostLength(fields, maxLength = 5000) {
  return (req, res, next) => {
    for (const field of fields) {
      if (req.body[field] && req.body[field].length > maxLength) {
        return statusCode(req, res, 413);
      }
    }
    next();
  };
}

// ---------- Routes ---------- \\

app.get("/", (req, res) => {
  // Data is persisted in MongoDB via appConfig — no local JSON update on each request
  statusCode(req, res, 200);

  // Analytics: count a visit to the home page
  homeVisits++;
  // Persist the visit event to the analytics collection (fire-and-forget)
  if (typeof recordAnalyticsEvent === "function") {
    recordAnalyticsEvent({ type: "visit", ts: new Date().toISOString() }).catch(
      (err) => console.error("Analytics record error:", chalk.red(err)),
    );
  }

  let userLoggedInRN = !!req.cookies.loggedIn;
  const isAdmin = Number(req.cookies.id) === 1;

  // Convert post content from Markdown to sanitized HTML
  const renderedPosts = posts.map((post) => ({
    ...post,
    htmlContent: renderMarkdown(post.content),
  }));

  res.render("index.ejs", {
    posts: renderedPosts,
    users,
    loggedIn: req.cookies.loggedIn || false,
    userId: req.cookies.id || null,
    userLoggedInRN,
    isAdmin,
  });
});

app
  .get("/post", (req, res) => {
    statusCode(req, res, 200);
    let userLoggedInRN;
    if (!req.cookies.loggedIn) {
      userLoggedInRN = false;
    } else {
      userLoggedInRN = true;
    }
    const isAdmin = Number(req.cookies.id) === 1;
    res.render("post.ejs", { userLoggedInRN, isAdmin });
  })
  .post(
    "/post",
    limitPostLength(["content"], 5000),
    limitPostLength(["title"], 500),
    async (req, res) => {
      try {
        statusCode(req, res, 202);
        console.log(req.body); // Debugging line
        let { title, content } = req.body;
        if (!title || !content) {
          return res.status(400).send("Title and content are required!");
        }
        const userId = req.cookies.id;
        // getNextPostId is now provided by the DB helper and is async — request the next ID
        const newId = await getNextPostId();
        const newPost = new Post(
          title,
          content,
          userId ? Number(userId) : null,
          undefined,
          newId,
        );

        await addPost(newPost);
        console.log(`New post added: ${title}`);
        res.status(201).redirect("/");
      } catch (error) {
        console.error("Error creating post:", chalk.red(error));
        return statusCode(req, res, 500);
      }
    },
  );

app
  .get("/login", (req, res) => {
    statusCode(req, res, 200);
    let userLoggedInRN;
    if (!req.cookies.loggedIn) {
      userLoggedInRN = false;
    } else {
      userLoggedInRN = true;
    }
    const isAdmin = Number(req.cookies.id) === 1;
    res.render("login.ejs", { userLoggedInRN, SHA1, isAdmin });
  })
  .post(
    "/login",
    checkForbiddenChars(["username", "password_sha1"]),
    (req, res) => {
      statusCode(req, res, 202);
      console.log(req.body); // Debugging line
      const { username, password_sha1 } = req.body;
      const user = users.find(
        (u) => u.username === username && u.password === password_sha1,
      );
      if (!user) {
        return res.status(401).send("Invalid username or password!");
        console.log(
          `${chalk.red(`401`)}: Attempted login with invalid credentials for user: ${username}`,
        );
      }
      console.log(`User logged in: ${username}`);

      // Analytics: successful login
      logins++;
      // Persist the login event
      if (typeof recordAnalyticsEvent === "function") {
        recordAnalyticsEvent({
          type: "login",
          ts: new Date().toISOString(),
          meta: { username },
        }).catch((err) =>
          console.error("Analytics record error:", chalk.red(err)),
        );
      }

      res
        .status(200)
        .cookie("loggedIn", true)
        .cookie("id", user.id)
        .redirect("/");
    },
  );

app
  .get("/signup", (req, res) => {
    statusCode(req, res, 200);
    let userLoggedInRN;
    if (!req.cookies.loggedIn) {
      userLoggedInRN = false;
    } else {
      userLoggedInRN = true;
    }
    const isAdmin = Number(req.cookies.id) === 1;
    res.render("signup.ejs", { userLoggedInRN, isAdmin });
  })
  .post(
    "/signup",
    checkForbiddenChars(["username", "password"]),
    async (req, res) => {
      try {
        statusCode(req, res, 202);
        const { username, password } = req.body;
        if (!username || !password) {
          return res.status(400).send("Username and password are required!");
        }
        const existingUser = users.find((u) => u.username === username);
        if (existingUser) {
          return res.status(409).send("Username already exists!");
        }

        const newUserId = await getNextUserId();
        const newUser = new User(username, SHA1(password), newUserId);
        await addUser(newUser);

        // Analytics: successful signup
        signups++;
        // Persist the signup event
        if (typeof recordAnalyticsEvent === "function") {
          recordAnalyticsEvent({
            type: "signup",
            ts: new Date().toISOString(),
            meta: { username },
          }).catch((err) =>
            console.error("Analytics record error:", chalk.red(err)),
          );
        }

        console.log(`New user signed up: ${chalk.greenBright(username)}`);
        res
          .status(201)
          .cookie("loggedIn", true)
          .cookie("id", newUser.id)
          .redirect("/");
      } catch (error) {
        console.error("Error creating user:", chalk.red(error));
        return statusCode(req, res, 500);
      }
    },
  );

app.get("/logout", (req, res) => {
  statusCode(req, res, 200);
  res.clearCookie("loggedIn");
  res.clearCookie("id");
  res.redirect("/");
});

app
  .get("/posts", (req, res) => {
    statusCode(req, res, 200);
    let userLoggedInRN;
    if (!req.cookies.loggedIn) {
      userLoggedInRN = false;
    } else {
      userLoggedInRN = true;
    }

    const renderedPosts = posts.map((post) => ({
      ...post,
      htmlContent: renderMarkdown(post.content),
    }));

    const isAdmin = Number(req.cookies.id) === 1;

    res.render("posts.ejs", {
      posts: renderedPosts,
      users,
      loggedIn: req.cookies.loggedIn || false,
      userId: req.cookies.id || null,
      userLoggedInRN,
      isAdmin,
    });
  })
  .post("/posts/:id/like", async (req, res) => {
    try {
      const post = posts.find((p) => p.id == req.params.id);
      if (!post) return statusCode(req, res, 404);

      const userId = Number(req.cookies.id);
      if (!userId) return statusCode(req, res, 401);

      post.likedBy = post.likedBy || [];
      const likedIndex = post.likedBy.indexOf(userId);
      if (likedIndex !== -1) {
        post.likedBy.splice(likedIndex, 1);
        post.likes = Math.max(0, (post.likes || 0) - 1);
        console.log(
          `User ${chalk.greenBright(userId)} unliked post ${chalk.greenBright(post.id)}`,
        );
        await savePosts(posts);
        return res.json({ likes: post.likes, liked: false });
      } else {
        post.likes = (post.likes || 0) + 1;
        post.likedBy.push(Number(userId));
        console.log(
          `User ${chalk.greenBright(userId)} liked post ${chalk.greenBright(post.id)}`,
        );
        await savePosts(posts);
        res.json({ likes: post.likes, liked: true });
      }
    } catch (err) {
      console.error("Like route error:", chalk.red(err));
      return statusCode(req, res, 500);
    }
  })
  .post("/posts/:id/comments", async (req, res) => {
    try {
      const post = posts.find((p) => p.id == req.params.id);
      if (!post) return statusCode(req, res, 404);
      const { content, author } = req.body;
      if (!content || !author) return statusCode(req, res, 400);
      post.comments = post.comments || [];
      post.comments.push({
        content,
        author: Number(author),
        date: new Date().toISOString(),
      });
      await savePosts(posts);
      res.json(post.comments);
      console.log(
        `New comment added to post ${chalk.greenBright(post.id)} by user ${chalk.greenBright(author)}: ${chalk.grey(content)}`,
      );
    } catch (err) {
      console.error("Comment route error:", chalk.red(err));
      return statusCode(req, res, 500);
    }
  });

app.get("/profile", (req, res) => {
  statusCode(req, res, 200);
  let userLoggedInRN;
  if (!req.cookies.loggedIn) {
    userLoggedInRN = false;
  } else {
    userLoggedInRN = true;
  }
  const userId = req.cookies.id;
  const user = users.find((u) => u.id === Number(userId));
  if (!user) {
    return statusCode(req, res, 403);
  }
  const isAdmin = Number(req.cookies.id) === 1;
  res.render("user.ejs", { user, users, userLoggedInRN, isAdmin });
});

app
  .get("/chats/:userID", (req, res) => {
    statusCode(req, res, 200);
    const userID = Number(req.params.userID);
    const userChats = chats.filter((chat) => chat.users.includes(userID));
    res.json(userChats);
  })
  .post("/chats", checkForbiddenChars(["userA", "userB"]), async (req, res) => {
    try {
      statusCode(req, res, 202);
      let { userA, userB } = req.body;
      userA = Number(userA);
      userB = Number(userB);
      if (!userA || !userB) {
        return res.status(400).send("User A and User B are required!");
      }
      const chatObj = findChatIdByUsers(userA, userB);
      if (chatObj) {
        return res.status(409).send("Chat already exists!");
      }
      const newChat = new Chat(chats.length + 1, [userA, userB]);
      await addChat(newChat);
      res.status(201).json(newChat);
    } catch (err) {
      console.error("Chat creation error:", chalk.red(err));
      return statusCode(req, res, 500);
    }
  })
  .delete("/chats/:chatId", async (req, res) => {
    try {
      statusCode(req, res, 202);
      const chatId = req.params.chatId;
      const chatIndex = chats.findIndex((chat) => chat.id === Number(chatId));
      if (chatIndex === -1) {
        return res.status(404).send("Chat not found!");
      }
      chats.splice(chatIndex, 1);
      await saveChats(chats);
      res.status(204).send();
    } catch (err) {
      console.error("Chat deletion error:", chalk.red(err));
      return statusCode(req, res, 500);
    }
  })
  .post(
    "/chats/:chatId/messages",
    checkForbiddenChars(["from", "content"]),
    limitPostLength(["content"], 500),
    async (req, res) => {
      try {
        statusCode(req, res, 202);
        const chatId = Number(req.params.chatId);
        let { from, content } = req.body;
        from = Number(from);
        if (!from || !content) {
          return res.status(400).send("From and content are required!");
        }
        const chat = chats.find((c) => c.id === chatId);
        if (!chat) {
          return res.status(404).send("Chat not found!");
        }
        const newMessage = new Message(chatId, from, content);
        console.log(
          `New message from user ${chalk.greenBright(from)} in chat ${chalk.greenBright(chatId)}: ${chalk.grey(content)}`,
        );
        chat.messages.push(newMessage);
        await saveChats(chats);
        res.status(201).json(newMessage);
      } catch (err) {
        console.error("Message creation error:", chalk.red(err));
        return statusCode(req, res, 500);
      }
    },
  );

// ---------- Secret Routes ---------- \\

// Analytics page (admin-only) — render EJS page that will fetch aggregated data via API endpoints
app.get("/analytics", adminOnly, (req, res) => {
  statusCode(req, res, 200);
  const userLoggedInRN = !!req.cookies.loggedIn;
  const isAdmin = Number(req.cookies.id) === 1;

  // Render the analytics page. The page will call the API endpoints below to fetch
  // time-series and aggregated data and draw charts client-side.
  res.render("analytics.ejs", {
    homeVisits,
    logins,
    signups,
    totalUsers: users.length,
    totalPosts: posts.length,
    userLoggedInRN,
    isAdmin,
  });
});

// ---------- Analytics API (admin-only) ---------- \\
app.get("/api/analytics/hourly", adminOnly, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const type = req.query.type || "visit";
    if (typeof getAnalyticsHourly !== "function") {
      return res.status(500).json({ error: "Analytics backend not available" });
    }
    const counts = await getAnalyticsHourly(date, type);
    const labels = Array.from({ length: 24 }, (_, i) =>
      String(i).padStart(2, "0"),
    );
    res.json({ labels, data: counts });
  } catch (err) {
    console.error("Hourly analytics error:", chalk.red(err));
    return statusCode(req, res, 500);
  }
});

app.get("/api/analytics/daily", adminOnly, async (req, res) => {
  try {
    const from = req.query.from;
    const to = req.query.to;
    const type = req.query.type || "visit";
    if (!from || !to)
      return res
        .status(400)
        .json({ error: "from and to query parameters required (YYYY-MM-DD)" });
    if (typeof getAnalyticsDailyTotals !== "function") {
      return res.status(500).json({ error: "Analytics backend not available" });
    }
    const series = await getAnalyticsDailyTotals(from, to, type);
    res.json(series);
  } catch (err) {
    console.error("Daily analytics error:", chalk.red(err));
    return statusCode(req, res, 500);
  }
});

app.get("/api/analytics/weekly-averages", adminOnly, async (req, res) => {
  try {
    const days = Number(req.query.days) || 28;
    const type = req.query.type || "visit";
    if (typeof getAnalyticsWeeklyAverages !== "function") {
      return res.status(500).json({ error: "Analytics backend not available" });
    }
    const averages = await getAnalyticsWeeklyAverages(days, type);
    // Return averages in order Sunday..Saturday
    res.json({
      days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      averages,
    });
  } catch (err) {
    console.error("Weekly averages error:", chalk.red(err));
    return statusCode(req, res, 500);
  }
});

app.get("/api/analytics/version-markers", adminOnly, async (req, res) => {
  try {
    if (typeof loadVersionMarkers !== "function") {
      return res
        .status(500)
        .json({ error: "Version markers loader not available" });
    }
    // loadVersionMarkers will attempt to read the JSON file you place in the project root
    // (or another path if you modify the helper). Default expects a JSON array of
    // { version: 'v3.0.1', ts: '2025-10-12T01:02:03Z' }.
    const markers = await loadVersionMarkers();
    res.json(markers);
  } catch (err) {
    console.error("Version markers error:", chalk.red(err));
    return statusCode(req, res, 500);
  }
});

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

app.get("/error", (req, res, next) => {
  // This will trigger the error handler
  next(new Error("This is a test internal server error!"));
});

app.get("/testErrResponse/:code", (req, res) => {
  const code = Number(req.params.code);
  if (code < 400 || code > 599) {
    res.redirect("/");
  } else if (code >= 400 && code <= 599) {
    statusCode(req, res, code);
  } else {
    res.redirect("/");
  }
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

// Since the database connection is already initialized in appConfig,
// we can start the server directly
app.listen(port, () => {
  console.log(`Server is running on port ${chalk.green(port)}`);
});

import { spawn } from "child_process";

function runOnShutdown() {
  console.log(
    chalk.yellow(`[AUTO MAINTENENCE]: ${chalk.green("STARTING...")}`),
  );

  // Build the command and arguments
  const maintenancePath = "../../Please Wait/Fullstack"; // Adjust as needed
  const child = spawn("node", ["index.js"], {
    cwd: maintenancePath, // Set working directory
    detached: true, // Detach from parent
    stdio: "ignore", // Ignore stdio so parent can exit
    shell: true, // Use shell for Windows compatibility
  });

  child.unref(); // Allow the child to keep running after parent exits
  console.log(chalk.yellow(`[AUTO MAINTENENCE]: ${chalk.green("RUNNING")}`));
  process.exit(0);
}

if (AutoMaintenanceMode) {
  console.log(chalk.yellow(`[AUTO MAINTENENCE]: ${chalk.green("ACTIVE")}`));
  process.on("SIGINT", runOnShutdown);
  process.on("SIGTERM", runOnShutdown);
} else {
  console.log(chalk.yellow(`[AUTO MAINTENENCE]: ${chalk.red("INACTIVE")}`));
}
