'use strict';

/**
 * Response object
 *
 * @param {number} httpCode HTTP response code
 * @param {string} statusMessage Status message
 * @param {number} [statusCode] Specific status code for numeric error codes.
 *
 * @constructor
 * @private
 */
function Response (httpCode, statusMessage, statusCode) {
    this.status = {
        code: parseInt(httpCode + ('00' + (statusCode || 0).toString()).slice(-2), 10) // Pad statusCode so that the response code is always 5 digit.
    };

    if (statusMessage) {
        this.status.message = statusMessage;
    }
}

/**
 * Response success
 *
 * @param {number} httpCode HTTP response code from 200 to 399.
 * @param {string} [statusMessage] Specific status message.
 * @param {number} [statusCode] Specific status code for numeric error codes.
 * @param {object|Array} [data] Whatever data
 *
 * @throws {Error} If httpCode is out of valid HTTP success code range.
 *
 * @constructor
 */
function ResponseSuccess (httpCode, statusMessage, statusCode, data) {
    if (httpCode < 200 || httpCode > 399) {
        throw new Error('HTTP error codes are between 400 and 599. Wanted to use ResponseError instead?');
    }

    //2 param call httpCode + data
    if (typeof statusMessage === 'object') {
        data = statusMessage;
        statusMessage = null;
    }

    if (typeof statusCode === 'object') {
        data = statusCode;
        statusCode = null;
    }

    Response.call(this, httpCode, statusMessage, statusCode);

    if (data) {
        this.data = data;
    }
}

ResponseSuccess.prototype = Object.create(Response.prototype);
ResponseSuccess.prototype.constructor = ResponseSuccess;

/**
 * Response error
 *
 * @param {number} httpCode HTTP response code from 400 to 599.
 * @param {string} [statusMessage] Specific status message.
 * @param {number} [statusCode] Specific status code for numeric error codes.
 * @param {*} [errors] Whatever error data.
 *
 * @throws {Error} If httpCode is out of valid HTTP error code range.
 *
 * @constructor
 */
function ResponseError (httpCode, statusMessage, statusCode, errors) {
    if (httpCode < 400 || httpCode > 599) {
        throw new Error('HTTP error codes are between 400 and 599. Wanted to use ResponseSuccess?');
    }

    //2 param call httpCode + data
    if (typeof statusMessage === 'object') {
        errors = statusMessage;
        statusMessage = null;
    }

    if (typeof statusCode === 'object') {
        errors = statusCode;
        statusCode = null;
    }

    Response.call(this, httpCode, statusMessage, statusCode);

    if (errors) {
        this.errors = errors;
    }
}

ResponseError.prototype = Object.create(Response.prototype);
ResponseError.prototype.constructor = ResponseError;

/**
 * Simplifed JSON response middleware
 *
 * Extends Express's "res" object with convenience methods.
 *
 * TODO: will do for now, but in the future may consider other approaches, specially when other response types come along.
 *
 * @param {object} req  Express request object
 * @param {object} res  Express response object
 * @param {function} next Express middleware function
 *
 * @returns {void}
 */
module.exports = function (req, res, next) {

    const buildJsonResponse = function (httpCode, defaultMessage) {
        return function (statusMessage, statusCode, data) {
            let response;

            if (defaultMessage && !statusMessage) {
                statusMessage = defaultMessage;
            }

            if (httpCode < 400) {
                response = new ResponseSuccess(httpCode, statusMessage, statusCode, data);
            } else {
                response = new ResponseError(httpCode, statusMessage, statusCode, data);
            }

            return res.status(httpCode).json(response);
        };
    };

    res.ok = buildJsonResponse(200);
    res.noContent = buildJsonResponse(204);
    res.reload = buildJsonResponse(205);
    res.created = buildJsonResponse(201);
    res.badRequest = buildJsonResponse(400, 'Bad request');
    res.unauthorised = buildJsonResponse(401, 'Unauthorized');
    res.forbidden = buildJsonResponse(403, 'Forbidden');
    res.notFound = buildJsonResponse(404, 'Not Found');
    res.gone = buildJsonResponse(410, 'Gone');
    res.internalServerError = buildJsonResponse(500, 'Internal Server Error');
    res.notImplemented = buildJsonResponse(501, 'Not Implemented');

    next();
};
