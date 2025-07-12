import chalk from 'chalk';
import cookieParser from 'cookie-parser';

const experimentalPages = {};

const errData = {
    ERR404: {
        err: 'ERR_404',
        title: 'Page Not Found',
        catImg: 'https://http.cat/404.jpg',
        description: 'The page you are looking for does not exist.',
        is501: false,
    },
    ERR501: {
        err: 'ERR_501',
        title: 'Not Implemented',
        catImg: 'https://http.cat/501.jpg',
        description: 'The page you are looking for is not implemented yet.',
        is501: true,
    },
};

const cat = (code) => `<br><img src="https://http.cat/${code}.jpg" alt="Cat image for error code ${code}" style="max-width: 100%; height: auto; margin-top: 10px;" />`;

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
        case 207:
            res.status(207);
            console.log(`${chalk.green('207')}: the page ${req.path} returned multi-status.`);
            break;
        case 208:
            res.status(208);
            console.log(`${chalk.green('208')}: the page ${req.path} returned already reported.`);
            break;
        case 226:
            res.status(226);
            console.log(`${chalk.green('226')}: the page ${req.path} returned IM Used.`);
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
            console.warn(`${chalk.yellow('303')}: the page ${req.path} requires user to see others.`);
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
            res.status(400).send(`<center><pre>ERR_400_BAD_REQUEST</pre>${cat(400)}</center>`);
            console.warn(`${chalk.red('ERR_400')}: the page ${req.path} had a bad request.`);
            break;
        case 401:
            res.status(401).send(`<center><pre>ERR_401_UNAUTHORIZED</pre>${cat(401)}</center>`);
            console.warn(`${chalk.red('ERR_401')}: the page ${req.path} is unauthorized.`);
            break;
        case 403:
            res.status(403).send(`<center><pre>ERR_403_FORBIDDEN</pre>${cat(403)}</center>`);
            console.warn(`${chalk.red('ERR_403')}: the page ${req.path} is forbidden.`);
            break;
        case 404:
            if (!forced) {
                let userLoggedInRN;
                if (!req.cookies.loggedIn) {
                    userLoggedInRN = false;
                } else {
                    userLoggedInRN = true;
                }
                res.status(404).render('err.ejs', {
                    ...errData.ERR404,
                    userLoggedInRN
                });
            } else {
                res.status(404).send(`<center><pre>ERR_404_NOT_FOUND</pre>${cat(404)}</center>`);
            };
            console.warn(`${chalk.red('ERR_404')}: the page ${req.path} was not found.`);
            break;
        case 405:
            res.status(405).send(`<center><pre>ERR_405_METHOD_NOT_ALLOWED</pre>${cat(405)}</center>`);
            console.warn(`${chalk.red('ERR_405')}: the method for ${req.path} is not allowed.`);
            break;
        case 406:
            res.status(406).send(`<center><pre>ERR_406_NOT_ACCEPTABLE</pre>${cat(406)}</center>`);
            console.warn(`${chalk.red('ERR_406')}: the page ${req.path} is not acceptable.`);
            break;
        case 407:
            res.status(407).send(`<center><pre>ERR_407_PROXY_AUTHENTICATION_REQUIRED</pre>${cat(407)}</center>`);
            console.warn(`${chalk.red('ERR_407')}: the page ${req.path} requires proxy authentication.`);
            break;
        case 408:
            res.status(408).send(`<center><pre>ERR_408_REQUEST_TIMEOUT</pre>${cat(408)}</center>`);
            console.warn(`${chalk.red('ERR_408')}: the page ${req.path} request timed out.`);
            break;
        case 409:
            res.status(409).send(`<center><pre>ERR_409_CONFLICT</pre>${cat(409)}</center>`);
            console.warn(`${chalk.red('ERR_409')}: the page ${req.path} has a conflict.`);
            break;
        case 410:
            res.status(410).send(`<center><pre>ERR_410_GONE</pre>${cat(410)}</center>`);
            console.warn(`${chalk.red('ERR_410')}: the page ${req.path} is gone.`);
            break;
        case 411:
            res.status(411).send(`<center><pre>ERR_411_LENGTH_REQUIRED</pre>${cat(411)}</center>`);
            console.warn(`${chalk.red('ERR_411')}: the page ${req.path} requires a length.`);
            break;
        case 412:
            res.status(412).send(`<center><pre>ERR_412_PRECONDITION_FAILED</pre>${cat(412)}</center>`);
            console.warn(`${chalk.red('ERR_412')}: the page ${req.path} precondition failed.`);
            break;
        case 413:
            res.status(413).send(`<center><pre>ERR_413_PAYLOAD_TOO_LARGE</pre>${cat(413)}</center>`);
            console.warn(`${chalk.red('ERR_413')}: the page ${req.path} payload is too large.`);
            break;
        case 414:
            res.status(414).send(`<center><pre>ERR_414_URI_TOO_LONG</pre>${cat(414)}</center>`);
            console.warn(`${chalk.red('ERR_414')}: the page ${req.path} URI is too long.`);
            break;
        case 415:
            res.status(415).send(`<center><pre>ERR_415_UNSUPPORTED_MEDIA_TYPE</pre>${cat(415)}</center>`);
            console.warn(`${chalk.red('ERR_415')}: the page ${req.path} has an unsupported media type.`);
            break;
        case 416:
            res.status(416).send(`<center><pre>ERR_416_RANGE_NOT_SATISFIABLE</pre>${cat(416)}</center>`);
            console.warn(`${chalk.red('ERR_416')}: the page ${req.path} range is not satisfiable.`);
            break;
        case 417:
            res.status(417).send(`<center><pre>ERR_417_EXPECTATION_FAILED</pre>${cat(417)}</center>`);
            console.warn(`${chalk.red('ERR_417')}: the page ${req.path} expectation failed.`);
            break;
        case 418:
            res.status(418).send(`<center><pre>ERR_418_IM_A_TEAPOT</pre>${cat(418)}</center>`);
            console.warn(`${chalk.red('ERR_418')}: the page ${req.path} is a teapot.`);
            break;
        case 421:
            res.status(421).send(`<center><pre>ERR_421_MISDIRECTED_REQUEST</pre>${cat(421)}</center>`);
            console.warn(`${chalk.red('ERR_421')}: the page ${req.path} is misdirected.`);
            break;
        case 422:
            res.status(422).send(`<center><pre>ERR_422_UNPROCESSABLE_ENTITY</pre>${cat(422)}</center>`);
            console.warn(`${chalk.red('ERR_422')}: the page ${req.path} is unprocessable.`);
            break;
        case 423:
            res.status(423).send(`<center><pre>ERR_423_LOCKED</pre>${cat(423)}</center>`);
            console.warn(`${chalk.red('ERR_423')}: the page ${req.path} is locked.`);
            break;
        case 424:
            res.status(424).send(`<center><pre>ERR_424_FAILED_DEPENDENCY</pre>${cat(424)}</center>`);
            console.warn(`${chalk.red('ERR_424')}: the page ${req.path} has a failed dependency.`);
            break;
        case 425:
            res.status(425).send(`<center><pre>ERR_425_TOO_EARLY</pre>${cat(425)}</center>`);
            console.warn(`${chalk.red('ERR_425')}: the page ${req.path} is too early.`);
            break;
        case 426:
            res.status(426).send(`<center><pre>ERR_426_UPGRADE_REQUIRED</pre>${cat(426)}</center>`);
            console.warn(`${chalk.red('ERR_426')}: the page ${req.path} requires an upgrade.`);
            break;
        case 428:
            res.status(428).send(`<center><pre>ERR_428_PRECONDITION_REQUIRED</pre>${cat(428)}</center>`);
            console.warn(`${chalk.red('ERR_428')}: the page ${req.path} precondition is required.`);
            break;
        case 429:
            res.status(429).send(`<center><pre>ERR_429_TOO_MANY_REQUESTS</pre>${cat(429)}</center>`);
            console.warn(`${chalk.red('ERR_429')}: too many requests for ${req.path}.`);
            break;
        case 431:
            res.status(431).send(`<center><pre>ERR_431_REQUEST_HEADER_FIELDS_TOO_LARGE</pre>${cat(431)}</center>`);
            console.warn(`${chalk.red('ERR_431')}: the request header fields for ${req.path} are too large.`);
            break;
        case 451:
            res.status(451).send(`<center><pre>ERR_451_UNAVAILABLE_FOR_LEGAL_REASONS</pre>${cat(451)}</center>`);
            console.warn(`${chalk.red('ERR_451')}: the page ${req.path} is unavailable for legal reasons.`);
            break;
        // 5xx Server Error
        case 500:
            res.status(500).send(`<center><pre>ERR_500_INTERNAL_SERVER_ERROR</pre>${cat(500)}</center>`);
            console.error(`${chalk.magenta('ERR_500')}: internal server error at ${req.path}.`);
            break;
        case 501:
            if (!forced) {
                let userLoggedInRN;
                if (!req.cookies.loggedIn) {
                    userLoggedInRN = false;
                } else {
                    userLoggedInRN = true;
                }
                res.status(501).render('err.ejs', {
                    ...errData.ERR501,
                    devLink: experimentalPages[req.path] || null,
                    userLoggedInRN
                });
            } else {
                res.status(501).send(`<center><pre>ERR_501_NOT_IMPLEMENTED</pre>${cat(501)}</center>`);
            };
            console.error(`${chalk.magenta('ERR_501')}: the page ${req.path} is not implemented.`);
            break;
        case 502:
            res.status(502).send(`<center><pre>ERR_502_BAD_GATEWAY</pre>${cat(502)}</center>`);
            console.error(`${chalk.magenta('ERR_502')}: bad gateway at ${req.path}.`);
            break;
        case 503:
            res.status(503).send(`<center><pre>ERR_503_SERVICE_UNAVAILABLE</pre>${cat(503)}</center>`);
            console.error(`${chalk.magenta('ERR_503')}: service unavailable at ${req.path}.`);
            break;
        case 504:
            res.status(504).send(`<center><pre>ERR_504_GATEWAY_TIMEOUT</pre>${cat(504)}</center>`);
            console.error(`${chalk.magenta('ERR_504')}: gateway timeout at ${req.path}.`);
            break;
        case 505:
            res.status(505).send(`<center><pre>ERR_505_HTTP_VERSION_NOT_SUPPORTED</pre>${cat(505)}</center>`);
            console.error(`${chalk.magenta('ERR_505')}: HTTP version not supported at ${req.path}.`);
            break;
        case 506:
            res.status(506).send(`<center><pre>ERR_506_VARIANT_ALSO_NEGOTIATES</pre>${cat(506)}</center>`);
            console.error(`${chalk.magenta('ERR_506')}: variant also negotiates at ${req.path}.`);
            break;
        case 507:
            res.status(507).send(`<center><pre>ERR_507_INSUFFICIENT_STORAGE</pre>${cat(507)}</center>`);
            console.error(`${chalk.magenta('ERR_507')}: insufficient storage at ${req.path}.`);
            break;
        case 508:
            res.status(508).send(`<center><pre>ERR_508_LOOP_DETECTED</pre>${cat(508)}</center>`);
            console.error(`${chalk.magenta('ERR_508')}: loop detected at ${req.path}.`);
            break;
        case 510:
            res.status(510).send(`<center><pre>ERR_510_NOT_EXTENDED</pre>${cat(510)}</center>`);
            console.error(`${chalk.magenta('ERR_510')}: not extended at ${req.path}.`);
            break;
        case 511:
            res.status(511).send(`<center><pre>ERR_511_NETWORK_AUTHENTICATION_REQUIRED</pre>${cat(511)}</center>`);
            console.error(`${chalk.magenta('ERR_511')}: network authentication required at ${req.path}.`);
            break;
        default:
            if (code >= 400 && code < 600) {
                res.send(`<center><pre>ERR_${code}_UNKNOWN</pre></center>`);
            };
            console.warn(`${chalk.gray(`ERR_${code}`)}: the page ${req.path} returned an unknown status.`);
            break;
    }
}

export { statusCode };