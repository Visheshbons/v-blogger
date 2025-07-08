import chalk from 'chalk';

const experimentalPages = {};

const errData = {
    ERR404: {
        err: 'ERR_404',
        title: 'Page Not Found',
        description: 'The page you are looking for does not exist.',
        is501: false,
    },
    ERR501: {
        err: 'ERR_501',
        title: 'Not Implemented',
        description: 'The page you are looking for is not implemented yet.',
        is501: true,
    },
};

function statusCode(req, res, code, forced = false) {
    switch (code) {
        // 1xx Informational
        case 100:
            res.status(100);
            console.info(`${chalk.blue('100')}: the page ${req.path} received a continue response.`);
            break;
        case 101:
            res.status(101);
            console.info(`${chalk.blue('101')}: the page ${req.path} is switching protocols.`);
            break;
        case 102:
            res.status(102);
            console.info(`${chalk.blue('102')}: the page ${req.path} is processing.`);
            break;
        case 103:
            res.status(103);
            console.info(`${chalk.blue('103')}: the page ${req.path} received early hints.`);
            break;
        // 2xx Success
        case 200:
            res.status(200);
            console.log(`${chalk.green('200')}: the page ${req.path} was OK.`);
            break;
        case 201:
            res.status(201);
            console.log(`${chalk.green('201')}: the page ${req.path} was created.`);
            break;
        case 202:
            res.status(202);
            console.log(`${chalk.green('202')}: the page ${req.path} was accepted.`);
            break;
        case 203:
            res.status(203);
            console.log(`${chalk.green('203')}: the page ${req.path} returned non-authoritative information.`);
            break;
        case 204:
            res.status(204);
            console.log(`${chalk.green('204')}: the page ${req.path} returned no content.`);
            break;
        case 205:
            res.status(205);
            console.log(`${chalk.green('205')}: the page ${req.path} reset content.`);
            break;
        case 206:
            res.status(206);
            console.log(`${chalk.green('206')}: the page ${req.path} returned partial content.`);
            break;
        // 3xx Redirection
        case 300:
            res.status(300);
            console.warn(`${chalk.yellow('300')}: the page ${req.path} has multiple choices.`);
            break;
        case 301:
            res.status(301);
            console.warn(`${chalk.yellow('301')}: the page ${req.path} was moved permanently.`);
            break;
        case 302:
            res.status(302);
            console.warn(`${chalk.yellow('302')}: the page ${req.path} was found (redirected).`);
            break;
        case 303:
            res.status(303);
            console.warn(`${chalk.yellow('303')}: the page ${req.path} see other.`);
            break;
        case 304:
            res.status(304);
            console.warn(`${chalk.yellow('304')}: the page ${req.path} was not modified.`);
            break;
        case 307:
            res.status(307);
            console.warn(`${chalk.yellow('307')}: the page ${req.path} was temporarily redirected.`);
            break;
        case 308:
            res.status(308);
            console.warn(`${chalk.yellow('308')}: the page ${req.path} was permanently redirected.`);
            break;
        // 4xx Client Error
        case 400:
            res.status(400).send('<pre>ERR_400_BAD_REQUEST</pre>');
            console.warn(`${chalk.red('ERR_400')}: the page ${req.path} had a bad request.`);
            break;
        case 401:
            res.status(401).send('<pre>ERR_401_UNAUTHORIZED</pre>');
            console.warn(`${chalk.red('ERR_401')}: the page ${req.path} is unauthorized.`);
            break;
        case 403:
            res.status(403).send('<pre>ERR_403_FORBIDDEN</pre>');
            console.warn(`${chalk.red('ERR_403')}: the page ${req.path} is forbidden.`);
            break;
        case 404:
            if (!forced) {
                res.status(404).render('err.ejs', {
                    ...errData.ERR404,
                });
            } else {
                res.status(404).send('<pre>ERR_404_NOT_FOUND</pre>');
            };
            console.warn(`${chalk.red('ERR_404')}: the page ${req.path} was not found.`);
            break;
        case 405:
            res.status(405).send('<pre>ERR_405_METHOD_NOT_ALLOWED</pre>');
            console.warn(`${chalk.red('ERR_405')}: the method for ${req.path} is not allowed.`);
            break;
        case 406:
            res.status(406).send('<pre>ERR_406_NOT_ACCEPTABLE</pre>');
            console.warn(`${chalk.red('ERR_406')}: the page ${req.path} is not acceptable.`);
            break;
        case 408:
            res.status(408).send('<pre>ERR_408_REQUEST_TIMEOUT</pre>');
            console.warn(`${chalk.red('ERR_408')}: the page ${req.path} request timed out.`);
            break;
        case 409:
            res.status(409).send('<pre>ERR_409_CONFLICT</pre>');
            console.warn(`${chalk.red('ERR_409')}: the page ${req.path} has a conflict.`);
            break;
        case 410:
            res.status(410).send('<pre>ERR_410_GONE</pre>');
            console.warn(`${chalk.red('ERR_410')}: the page ${req.path} is gone.`);
            break;
        case 418:
            res.status(418).send('<pre>ERR_418_IM_A_TEAPOT</pre>');
            console.warn(`${chalk.red('ERR_418')}: the page ${req.path} is a teapot.`);
            break;
        case 429:
            res.status(429).send('<pre>ERR_429_TOO_MANY_REQUESTS</pre>');
            console.warn(`${chalk.red('ERR_429')}: too many requests for ${req.path}.`);
            break;
        case 451:
            res.status(451).send('<pre>ERR_451_UNAVAILABLE_FOR_LEGAL_REASONS</pre>');
            console.warn(`${chalk.red('ERR_451')}: the page ${req.path} is unavailable for legal reasons.`);
            break;
        // 5xx Server Error
        case 500:
            res.status(500).send('<pre>ERR_500_INTERNAL_SERVER_ERROR</pre>');
            console.error(`${chalk.magenta('ERR_500')}: internal server error at ${req.path}.`);
            break;
        case 501:
            if (!forced) {
                res.status(501).render('err.ejs', {
                    ...errData.ERR501,
                    devLink: experimentalPages[req.path] || null,
                });
            } else {
                res.status(501).send('<pre>ERR_501_NOT_IMPLEMENTED</pre>');
            };
            console.error(`${chalk.magenta('ERR_501')}: the page ${req.path} is not implemented.`);
            break;
        case 502:
            res.status(502).send('<pre>ERR_502_BAD_GATEWAY</pre>');
            console.error(`${chalk.magenta('ERR_502')}: bad gateway at ${req.path}.`);
            break;
        case 503:
            res.status(503).send('<pre>ERR_503_SERVICE_UNAVAILABLE</pre>');
            console.error(`${chalk.magenta('ERR_503')}: service unavailable at ${req.path}.`);
            break;
        case 504:
            res.status(504).send('<pre>ERR_504_GATEWAY_TIMEOUT</pre>');
            console.error(`${chalk.magenta('ERR_504')}: gateway timeout at ${req.path}.`);
            break;
        default:
            if (code >= 400 && code < 600) {
                res.send(`<pre>ERR_${code}_UNKNOWN</pre>`);
            };
            console.warn(`${chalk.gray(`ERR_${code}`)}: the page ${req.path} returned an unknown status.`);
            break;
    }
}

export { statusCode };