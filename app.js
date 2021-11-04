const express = require('express');
require('express-async-errors'); // async/await support for routes
const app = express();

const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = process.env.LOGGER_LEVEL || log4js.levels.DEBUG;

const marked = require('marked');
const fs = require('fs').promises;
const os = require('os');
const request = require('superagent');

app.use(express.json());
app.use(require('./libs/middleware/response'));

const authApiKey = require('./libs/middleware/authApiKey');

const TRELLO_API_PREFIX = 'https://api.trello.com/1/';

app.get('/', async function (req, res) {
    const file = await fs.readFile(`${__dirname}/README.md`, 'utf8');
    res.send(marked(file.toString()));
});

/**
 * Authorization with client API key in "apiKey" parameter.
 *
 * NOTE: GET for ease of use.
 *
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 * @see https://developer.atlassian.com/cloud/trello/rest/api-group-webhooks/#api-webhooks-post
 */
app.get('/api/trello/webhooks/register', authApiKey, async function (req, res) {
    const trelloApiKey = process.env.TRELLO_API_KEY;
    const trelloApiToken = process.env.TRELLO_API_TOKEN;
    const appBaseUrl = process.env.APP_BASE_URL;

    if (!trelloApiKey || !trelloApiToken || !appBaseUrl) {
        return res.internalServerError('Bad server configuration. Missing TRELLO_API_KEY and/or TRELLO_API_TOKEN and/or APP_BASE_URL', 1);
    }

    const description = req.query.description;
    const idModel = req.query.idModel; // This can be the id of a member, card, board, or anything that actions apply to. Any event involving this model will trigger the webhook.

    if (!description || !idModel) {
        return res.badRequest('Missing one or more required parameters. Required parameters are trelloApiKey, trelloApiToken, description, idModel.', 1);
    }

    const path = `https://api.trello.com/1/tokens/${trelloApiToken}/webhooks/`;

    const apiRes = await request
        .post(path)
        .send({
            key: trelloApiKey,
            description: description,
            idModel: idModel,
            callbackURL: `${appBaseUrl}/api/trello/webhooks/callback`
        });

    if (apiRes.status < 400) {
        logger.debug('Trello API webhook registration succeeded', os.EOL + JSON.stringify(apiRes.body, null, 2));

        return res.ok(apiRes.body);
    } else {
        logger.error('Trello API webhook registration failed', apiRes.status, apiRes.text);

        return res
            .status(apiRes.status)
            .json({
                code: apiRes.status,
                message: apiRes.text
            });
    }
});

/**
 * Authorization with client API key in "apiKey" parameter.
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

    const path = `${TRELLO_API_PREFIX}webhooks/${trelloWebhookId}`;

    try { // Weird, superagent treats all non 200-s on DELETE as errors...
        const apiRes = await request
            .del(path)
            .query({
                key: process.env.TRELLO_API_KEY
            });

        return res.ok(apiRes.body);
    } catch (err) {
        return res
            .status(err.status)
            .json({
                code: err.status,
                message: err.response.text
            });
    }
});

/**
 * Actual hard working callbackUrl
 *
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 */
app.post('/api/trello/webhooks/callback', async function (req, res) {
    console.log('callback POST', req.method);
    logger.debug(req.method, req.path, 'req.body', os.EOL + JSON.stringify(req.body, null, 2));

    res.ok();
});

/**
 * Upon registration of webhook, Trello calls HEAD on the callbackUrl
 *
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 */
app.head('/api/trello/webhooks/callback', async function (req, res) {
    res.ok();
});


/**
 * Proxy all GET requests through to Trello API and return whatever they respond
 *
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/
 * @see https://developer.atlassian.com/cloud/trello/rest/api-group-actions/
 */
app.get('/api/trello/*', authApiKey, async function (req, res) {
    const path = TRELLO_API_PREFIX + req.path.replace('/api/trello/', '');
    const params = Object.assign(
        {},
        {
            key: process.env.TRELLO_API_KEY,
            token: process.env.TRELLO_API_TOKEN
        },
        req.query
    );

    const apiRes = await request
        .get(path)
        .query(params);

    if (apiRes.status < 400) {
        return res.ok(apiRes.body);
    } else {
        return res
            .status(apiRes.status)
            .json({
                code: apiRes.status,
                message: apiRes.text
            });
    }
});

app.use(require('./libs/middleware/error'));

module.exports = app;
