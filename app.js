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
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;

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
            callbackURL: `${appBaseUrl}/api/trello/webhooks/masterlist`
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
    const trelloApiKey = process.env.TRELLO_API_KEY;
    const trelloApiToken = process.env.TRELLO_API_TOKEN;

    if (!trelloApiKey || !trelloApiToken) {
        return res.internalServerError('Bad server configuration. Missing TRELLO_API_KEY and/or TRELLO_API_TOKEN', 1);
    }

    const trelloWebhookId = req.params.id;
    if (!trelloWebhookId) {
        return res.badRequest('Missing one or more required parameters.', 1)
    }

    const path = `${TRELLO_API_PREFIX}webhooks/${trelloWebhookId}`;

    try { // Weird, superagent treats all non 200-s on DELETE as errors...
        const apiRes = await request
            .del(path)
            .query({
                key: process.env.TRELLO_API_KEY,
                token: process.env.TRELLO_API_TOKEN
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
 * Webhook callback endpoint to dump and debug messages sent by Trello
 *
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 * @see https://docs.google.com/spreadsheets/d/1opvJZ2yqfWgVr5ol1NXkvhn7Y4RKon2xPhemMbQprwA/edit#gid=0 - action types
 */

// FIXME: VALIDATE REQUEST SIGNATURE! https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#webhook-signatures
app.post('/api/trello/webhooks/debug', async function (req, res) {
    logger.info(req.method, req.path, 'req.body', os.EOL + JSON.stringify(req.body, null, 2));

    res.ok();
});

/**
 * Upon registration of webhook, Trello calls HEAD on the callbackUrl
 *
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 */
app.head('/api/trello/webhooks/debug', async function (req, res) {
    logger.info(req.method, req.path, 'req.body', req.body);

    res.ok();
});


/**
 * Webhook callback endpoint to implement master list functionality
 *
 * @see https://developer.atlassian.com/cloud/trello/rest/api-group-actions/
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 * @see https://docs.google.com/spreadsheets/d/1opvJZ2yqfWgVr5ol1NXkvhn7Y4RKon2xPhemMbQprwA/edit#gid=0 - action types
 */
// FIXME: VALIDATE REQUEST SIGNATURE! https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#webhook-signatures
app.post('/api/trello/webhooks/masterlist', async function (req, res) {
    logger.debug(req.method, req.path, 'req.body', os.EOL + JSON.stringify(req.body, null, 2));

    const TRELLO_MASTER_CHECKLIST_ID = process.env.TRELLO_MASTER_CHECKLIST_ID;
    const TRELLO_CHECKLIST_NAME = process.env.TRELLO_CHECKLIST_NAME;

    const action = req.body.action;

    switch (action.type) {
        case 'createCheckItem':
            if (!TRELLO_MASTER_CHECKLIST_ID || !TRELLO_CHECKLIST_NAME) {
                logger.error(`IGNORE ACTION ${action.type}! Missing required server environment configuration - TRELLO_MASTER_CHECKLIST_ID and/or TRELLO_CHECKLIST_NAME.`);
                break;
            }
            // Avoid infinite loop - script creates a checklist item in the master list and triggers this again
            if (action.data.checklist.id !== TRELLO_MASTER_CHECKLIST_ID) {
                if (action.data.checklist.name.toLowerCase() === TRELLO_CHECKLIST_NAME.toLowerCase()) {
                    const card = action.data.card;
                    const checklist = action.data.checklist;
                    const checkItem = action.data.checkItem;

                    // Create a checkItem - https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/#api-checklists-id-checkitems-post
                    // NOTE: Interesting API - POST request but expects all data in query parameters.
                    await request
                        .post(`${TRELLO_API_PREFIX}checklists/${TRELLO_MASTER_CHECKLIST_ID}/checkItems`)
                        .query({
                            key: TRELLO_API_KEY,
                            token: TRELLO_API_TOKEN,
                            name: `${checkItem.name} - https://trello.com/c/${card.shortLink} \`(src: ${card.id}|${checklist.id}|${checkItem.id})\``,
                            checked: false,
                            pos: 'top'
                        });
                } else {
                    logger.warn(`IGNORE ACTION ${action.type}! Checklist name mismatch!`);
                }
            }
            break;
        case 'updateCheckItem':
            // CASES
            // 1. MASTER LIST CHECK ITEM UPDATE - check sub list name, IF they match (substract reference to child card from the end), IGNORE to avoid endless loop.
            // 2. SUB LIST CHECK ITEM UPDATE - check if master check-item matches (newname + the link to the subitem).
            break;
        case 'deleteCheckItem':
            // CASES
            // 1. MASTER LIST CHECK ITEM DELETE - delete from sub card by looking at card "shortLink" in the item AND find list named TRELLO_CHECKLIST_NAME. IF does not exist, ignore.
            // 2. SUB LIST CHECK ITEM DELETE - delete from master card by looking checklist.name.startsWith('checkitem'). IF not found, ignore.
            break;
        case 'updateCheckItemStateOnCard': // check and uncheck an item - change state incomplete/complete
            // CASES
            // 1. MASTER LIST CHECK ITEM IS CHECKED / UNCHECKED - if sub list item is already checked, ignore message. Trick is that we do not want infinite loop.
            // 2. SUB LIST CHECK ITEM IS CHECKED / UNCHECKED -if master list item is already checked, ignore message. Trick is we do not want infinite loop.
            logger.error('IMPLEMENT!', action.type);
            break;
        case 'removeChecklistFromCard': // whole list is deleted. We can ignore that on MASTER, we only need to check for child lists.
            const card = action.data.card;
            const checklist = action.data.checklist;

            // 1. MASTER CARD LIST DELETE - IGNORE MESSAGE
            if (card.id === TRELLO_MASTER_CHECKLIST_ID) {
                logger.warn('MASTER CHECKLIST WAS DELETED!', TRELLO_MASTER_CHECKLIST_ID);
                return;
            }

            // 2. SUB CARD LIST DELETE - IF matches the LIST NAME DELETE ALL checkItems that reference this card from MASTER LIST. That is, delete all checkitems that reference this cards "shortLink".
            // GET checkitems on a checklist (master) - https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/#api-checklists-id-checkitems-get
            const checkItemsOnMaster = (await request
                .get(`${TRELLO_API_PREFIX}checklists/${TRELLO_MASTER_CHECKLIST_ID}/checkItems`)
                .query({
                    key: TRELLO_API_KEY,
                    token: TRELLO_API_TOKEN
                })).body;

            logger.info('MASTER ITEMS', JSON.stringify(checkItemsOnMaster, null, 2));

            const checkItemsToDelete = checkItemsOnMaster.filter((checkItem) => {
                const checkItemNameRegex = new RegExp(`.*\\|${checklist.id}\\|.*`, 'i');
                const matches = checkItem.name.match(checkItemNameRegex);
                logger.info('MATCHING', checkItem.name, checkItemNameRegex, matches);
                return matches && matches.length;
            });

            logger.info('MASTER ITEMS TO DELETE', JSON.stringify(checkItemsToDelete, null, 2));

            break;
        default:
            logger.debug(`Ignoring message of with action type ${action.type}`);
    }

    res.ok();
});

/**
 * Upon registration of webhook, Trello calls HEAD on the callbackUrl
 *
 * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 */
app.head('/api/trello/webhooks/masterlist', async function (req, res) {
    logger.debug(req.method, req.path, 'req.body', req.body);

    res.ok();
});

app.get('/api/trello/boards/:boardId/masterlist/:listName', authApiKey, async function (req, res) {
    const boardId = req.boardId;
    const listName = req.listName;

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
