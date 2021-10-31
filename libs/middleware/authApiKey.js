'use strict';

/**
 * Middleware to check authorization with API key (X-API-KEY header) OR "apiKey" query parameter
 */
module.exports = function (req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.clientApiKey;

    const configClientApiKey = process.env.API_KEY; // API key used to authorize calling this endpoint
    if (!configClientApiKey) {
        return res.internalServerError('Invalid server configuration - missing API_KEY', 1);
    }

    if (apiKey === configClientApiKey) {
        return next();
    } else {
        return res.unauthorised('Invalid clientApiKey provided.', 1);
    }
};
