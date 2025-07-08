import express from 'express';
import chalk from 'chalk';
import { statusCode } from './errors.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    statusCode(req, res, 200);
    res.render('index.ejs')
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});