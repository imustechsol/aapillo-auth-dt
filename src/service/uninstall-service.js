const Service = require('node-windows').Service;
const path = require('path');
const config = require('../config/default-config');

const svc = new Service({
    name: config.service.name,
    script: path.join(__dirname, '../main.js')
});

svc.on('uninstall', () => {
    console.log('Service uninstalled successfully!');
    console.log('Aapillo Auth has been removed from Windows services.');
});

svc.on('alreadyuninstalled', () => {
    console.log('Service is not installed.');
});

svc.on('stop', () => {
    console.log('Service stopped.');
    console.log('Uninstalling service...');
    svc.uninstall();
});

svc.on('error', (err) => {
    console.error('Service error:', err);
});

console.log('Stopping Aapillo Auth Service...');
svc.stop();