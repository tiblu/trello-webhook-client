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
        .expect('Content-Type', /json/)
        .expect(expectedHttpCode);
};

const trelloWebhooksDelete = async function (trelloWebhookId, expectedHttpCode) {
    const path = '/api/trello/webhooks/delete/:id'
        .replace(':id', trelloWebhookId);

    return request(app)
        .get(path)
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
        test('Success', async function () {
            throw new Error('Implement');
        });

        test('Fail - 50001 - invalid server configuration, no API_KEY set', async function () {
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
    });
    
    suite('GET /api/trello/webhooks/delete/:id', function() {

        test('Success', async function () {
            throw new Error('Implement');
        });

        test('Fail - 50001 - invalid server configuration, no API_KEY set', async function () {
            const resBody = (await trelloWebhooksDelete('irrelevant', 500)).body;
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

            assert.deepEqual(res.body, {});
        });

    });

});
