const express = require('express');
require('express-async-errors'); // async/await support for routes
const app = express();

const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = process.env.LOGGER_LEVEL || log4js.levels.DEBUG;

const marked = require('marked');
const fs = require('fs').promises;
const os = require('os');

app.use(express.json());

app.get('/', async function (req, res) {
    const file = await fs.readFile(`${__dirname}/README.md`, 'utf8');
    res.send(marked(file.toString()));
});

app.post('/api/trello/webhookCallback', async function (req, res) {
    logger.debug(req.method, req.path, 'req.body', os.EOL + JSON.stringify(req.body, null, 2));

    res.status(200).json({});
});

module.exports = app;
