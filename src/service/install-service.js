const Service = require('node-windows').Service;
const path = require('path');
const log = require('../utils/logger');
const config = require('../config/default-config');

const svc = new Service({
    name: config.service.name,
    description: config.service.description,
    script: path.join(__dirname, '../main.js'),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ],
    env: [{
        name: 'NODE_ENV',
        value: 'production'
    }]
});

svc.on('install', () => {
    console.log('Service installed successfully!');
    console.log('Starting service...');
    svc.start();
});

svc.on('alreadyinstalled', () => {
    console.log('Service is already installed.');
});

svc.on('start', () => {
    console.log('Service started successfully!');
    console.log('Aapillo Auth is now running in the background.');
});

svc.on('error', (err) => {
    console.error('Service error:', err);
});

console.log('Installing Aapillo Auth Service...');
console.log('Service Name:', config.service.name);
console.log('Description:', config.service.description);

svc.install();