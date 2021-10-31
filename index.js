const http = require('http');
const express = require('express');
require('express-async-errors'); // async/await support for routes
const app = express();

const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = process.env.LOGGER_LEVEL || log4js.levels.DEBUG;

const marked = require('marked');
const fs = require('fs').promises;

app.use(express.json());

app.get('/', async function (req, res) {
    const file = await fs.readFile(`${__dirname}/README.md`, 'utf8');
    res.send(marked(file.toString()));
});

app.get('/api', async function (req, res) {
    res.status(200).json({hello: 'world'});
});

// In development host === null binds 0.0.0.0, thus open on all interfaces. In useful in dev so that app running in Vbox is visible to the host machine.
const host = app.get('env') === 'development' ? null : process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;

// @see https://expressjs.com/en/guide/behind-proxies.html
let trustProxy = false;
const envTrustProxy = process.env.TRUST_PROXY;
if (envTrustProxy) {
    if (('' + envTrustProxy).trim().toLowerCase() === 'true') { // env variable is a string of "true"
        trustProxy = true;
    } else {
        trustProxy = envTrustProxy;
    }
}
app.set('trust proxy', trustProxy);

const serverHttp = http.createServer(app).listen(port, host, function () {
    logger.debug(`Express HTTP server listening on port ${serverHttp.address().port}. Env: ${app.get('env')}. Host: ${host}. Trust proxy: ${trustProxy}.`);
});
