const app = require('../app');
const assert = require('chai').assert;
const request = require('supertest');

const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = process.env.LOGGER_LEVEL || log4js.levels.DEBUG;

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

    suite('POST /api/trello/webhookCallback', async function () {

        test('Success - 200', async function () {
            const res = await request(app)
                .post('/api/trello/webhookCallback')
                .send({name: 'tiblu'})
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200);

            assert.deepEqual(res.body, {});
        });

    });

});
