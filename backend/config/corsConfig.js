/* eslint-disable no-undef */
function getCorsOptions() {
    const env = process.env.NODE_ENV || 'dev'; // Dev for default

    const corsConfigs = {
        dev: {
            origin: [
                'http://10.18.1.242:3000',
                'http://10.181.1.31:8010',
                'http://10.18.7.123:3000',
                'http://localhost:3000'
            ],
            methods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'],
            credentials: true,
        },
        qa: {
            origin: [
                'http://10.18.7.123:3000',
                'http://10.18.1.242:3000',
                'http://localhost:3000',
                'http://10.18.1.242:3000',
                'http://10.181.1.31:8010',
            ],
            methods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'],
            credentials: false,
        },
        production: {
            origin: [
                'http://10.18.1.242:3000',
                'https://obps.grse.co.in',
                'https://obps.grse.in',
                'https://stageobps.grse.in',
                'http://stageobps.grse.in',
                'http://obps.grse.co.in',
                'http://10.181.1.53:8018',
                'http://localhost:3000'
            ],
            methods: ['OPTIONS', 'GET', 'POST'],
            credentials: false,
        },
    };

    return corsConfigs[env];
}

module.exports = getCorsOptions;
