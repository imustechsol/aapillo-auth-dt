const { app, BrowserWindow } = require('electron');

console.log('Electron test started');

app.whenReady().then(() => {
    console.log('App is ready');
    
    const win = new BrowserWindow({
        width: 800,
        height: 600
    });
    
    win.loadURL('data:text/html,<h1>Electron Works!</h1>');
    
    console.log('Window created');
});

app.on('window-all-closed', () => {
    console.log('All windows closed');
    app.quit();
});