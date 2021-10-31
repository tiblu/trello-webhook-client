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
app.use(require('./libs/middleware/response'));

const authApiKey = require('./libs/middleware/authApiKey');

app.get('/', async function (req, res) {
    const file = await fs.readFile(`${__dirname}/README.md`, 'utf8');
    res.send(marked(file.toString()));
});

/**
 * Authorization with client API key in "clientApiKey" parameter.
 *
 * NOTE: GET for ease of use.
 *
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 * @see https://developer.atlassian.com/cloud/trello/rest/api-group-webhooks/#api-webhooks-post
 */
app.get('/api/trello/webhooks/register', authApiKey, async function (req, res) {
    const trelloApiKey = req.query.trelloApiKey || process.env.TRELLO_APIKEY;
    const trelloApiToken = req.query.trelloApiToken || process.env.TRELLO_APITOKEN;
    const description = req.query.description;
    const idModel = req.query.idModel;

    if (!trelloApiKey || !trelloApiToken || !description || !idModel) {
        return res.badRequest('Missing one or more required parameters. Required parameters are trelloApiKey, trelloApiToken, description, idModel.', 1);
    }

    res.ok({});
});

/**
 * Authorization with client API key in "clientApiKey" parameter.
 *
 * NOTE: GET for ease of use.
 *
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 * @see https://developer.atlassian.com/cloud/trello/rest/api-group-webhooks/#api-webhooks-post
 */
app.get('/api/trello/webhooks/delete/:id', authApiKey, async function (req, res) {
    const trelloWebhookId = req.params.id;

    if (!trelloWebhookId) {
        return res.badRequest('Missing one or more required parameters.', 1)
    }

    res.ok({});
});

/**
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 */
app.post('/api/trello/webhooks/callback', async function (req, res) {
    logger.debug(req.method, req.path, 'req.body', os.EOL + JSON.stringify(req.body, null, 2));

    res.status(200).json({});
});

app.use(require('./libs/middleware/error'));

module.exports = app;
