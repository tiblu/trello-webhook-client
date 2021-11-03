const app = require('../app');
const assert = require('chai').assert;
const request = require('supertest');

const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = process.env.LOGGER_LEVEL || log4js.levels.DEBUG;

const trelloWebhooksRegister = async function (params, expectedHttpCode) {
    const path = '/api/trello/webhooks/register';

    return request(app)
        .get(path)
        .query(params)
        .expect('Content-Type', /json/)
        .expect(expectedHttpCode);
};

const trelloWebhooksDelete = async function (trelloWebhookId, params, expectedHttpCode) {
    const path = '/api/trello/webhooks/delete/:id'
        .replace(':id', trelloWebhookId);

    return request(app)
        .get(path)
        .query(params)
        .expect('Content-Type', /json/)
        .expect(expectedHttpCode);
};

suite('App', function () {

    suite('GET /', async function () {

        test('Success - 200 - return README.md as HTML', async function () {
            const marked = require('marked');
            const fs = require('fs').promises;

            const res = await request(app)
                .get('/')
                .expect('Content-Type', /html/)
                .expect(200);


            const file = await fs.readFile(`./README.md`, 'utf8');
            const expectedHtml = marked(file.toString());

            assert.equal(res.text, expectedHtml);
        });

    });

    /**
     * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
     */
    suite('GET /api/trello/webhooks/register', function () {
        setup(async function () {
            process.env.API_KEY = process.env.API_KEY || 'TEST_API_KEY';
            process.env.TRELLO_API_KEY = process.env.TRELLO_API_KEY || 'TEST_TRELLO_API_KEY';
            process.env.TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN || 'TRELLO_API_TOKEN';
            process.env.APP_BASE_URL = process.env.APP_BASE_URL || 'APP_BASE_URL';
        });

        test('Success', async function () {
            throw new Error('Implement');
        });

        test('Fail - 50001 - invalid server configuration, no API_KEY set', async function () {
            delete process.env.API_KEY;

            const resBody = (await trelloWebhooksRegister({}, 500)).body;
            const resbodyExpected = {
                status: {
                    code: 50001,
                    message: 'Invalid server configuration - missing API_KEY'
                }
            };

            assert.deepEqual(resBody, resbodyExpected);
        });

        test('Fail - 40101 - invalid API key provided (apiKey)', async function () {

            const resBody = (await trelloWebhooksRegister({}, 401)).body;
            const resbodyExpected = {
                status: {
                    code: 40101,
                    message: 'Invalid API key (apiKey) provided.'
                }
            };

            assert.deepEqual(resBody, resbodyExpected);
        });

        test('Fail - 40001 - missing required parameters', async function () {
            const resBody = (await trelloWebhooksRegister({apiKey: process.env.API_KEY}, 400)).body;
            const resbodyExpected = {
                status: {
                    code: 40001,
                    message: 'Missing one or more required parameters. Required parameters are trelloApiKey, trelloApiToken, description, idModel.'
                }
            };

            assert.deepEqual(resBody, resbodyExpected);
        });
    });

    suite('GET /api/trello/webhooks/delete/:id', function () {

        test('Success', async function () {
            process.env.API_KEY = process.env.API_KEY || 'TEST_API_KEY';
            process.env.TRELLO_API_KEY = process.env.TRELLO_API_KEY || 'TEST_TRELLO_API_KEY';
            process.env.TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN || 'TRELLO_API_TOKEN';

            throw new Error('Implement!');
        });

        if (process.env.TRELLO_API_KEY) {
            test('Fail - 400 - invalid webhook id', async function () {
                process.env.API_KEY = process.env.API_KEY || 'TEST_API_KEY';

                const resBody = (await trelloWebhooksDelete('irrelevant', {apiKey: process.env.API_KEY}, 400)).body;
                const resBodyExpected = {
                    code: 400,
                    message: 'invalid id'
                };

                assert.deepEqual(resBody, resBodyExpected);
            });
        } else {
            test.skip('Fail - invalid webhook id - SKIPPED: Test MUST have actual Trello API key set in the env TRELLO_API_KEY', async function () {
                // Skipped as it requires actual Trello API key in the env TRELLO_API_KEY
            });
        }


        test('Fail - 50001 - invalid server configuration, no API_KEY set', async function () {
            delete process.env.API_KEY;

            const resBody = (await trelloWebhooksDelete('irrelevant', {}, 500)).body;
            const resbodyExpected = {
                status: {
                    code: 50001,
                    message: 'Invalid server configuration - missing API_KEY'
                }
            };

            assert.deepEqual(resBody, resbodyExpected);
        });

    });

    /**
     * @see https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
     */
    suite('POST /api/trello/webhooks/callback', async function () {

        test('Success - 200', async function () {
            const res = await request(app)
                .post('/api/trello/webhooks/callback')
                .send({name: 'tiblu'})
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200);

            const resExpected = {
                status: {
                    code: 20000
                }
            };

            assert.deepEqual(res.body, resExpected);
        });

    });

    suite('GET /api/trello/*', function () {

        // Skipped by default, can only be tested with real credentials from env.
        if (process.env.API_KEY && process.env.TRELLO_API_KEY && process.env.TRELLO_API_TOKEN) {
            test('Success - 200', async function () {
                const res = await request(app)
                    .get('/api/trello/members/me/boards')
                    .query({
                        apiKey: process.env.API_KEY,
                        key: process.env.TRELLO_API_KEY,
                        token: process.env.TRELLO_API_TOKEN
                    })
                    .expect('Content-Type', /json/)
                    .expect(200);

                logger.debug(JSON.stringify(res.body, null, 2));
            });
        } else {
            test.skip('Success - 200', function () {
                // SKIP
            });
        }

    });

});
