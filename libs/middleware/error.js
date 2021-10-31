'use strict';

const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = process.env.LOGGER_LEVEL || log4js.levels.DEBUG;

/**
 * Default error handler
 *
 * Hides away stack traces from the caller and log using a configured logger with a fallback to console.
 *
 * @see http://expressjs.com/en/guide/error-handling.html
 */
function errorHandler (err, req, res, next) { //eslint-disable-line no-unused-vars
    logger.error(
        'Endpoint',
        req.method,
        '"' + req.path + '"',
        'failed miserably.',
        err
    );

    let status = 500;
    let message = 'Internal Server Error';

    if (req.accepts('json')) {
        // If the request Content-Type is JSON...
        if (req.is('json')) {
            // body-parser has 2 validations - 1 based on first character and other is just JSON parser exception, need to handle both
            if ((err.message = 'invalid json' || err instanceof SyntaxError) && err.status === 400 && 'body' in err) {
                status = 400;
                message = 'Invalid JSON in request body';
            }
        }

        return res.status(status).json({
            status: {
                code: parseInt((status + '00000').slice(0, 5)),
                message: message
            }
        });
    }

    res.status(status).send(message);
}

module.exports = errorHandler;
