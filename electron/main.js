// Desktop app: runs the game server inside the app and opens the game in a window.
// Friends on the same network join from a browser at the address shown in the window title.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) app.quit(); // a second copy would start a second server

app.whenReady().then(async () => {
  process.env.CITY_SAVE = path.join(app.getPath('userData'), 'city.json'); // the app folder is read-only once installed
  const server = require('../server.js');
  const { port, lan } = await server.start();
  const win = new BrowserWindow({
    width: 1400, height: 900, autoHideMenuBar: true, title: 'Город вместе',
    // backgroundThrottling: the city keeps running at full speed while the window is minimised
    webPreferences: { backgroundThrottling: false, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.on('page-title-updated', e => e.preventDefault());
  win.setTitle(lan.length ? `Город вместе — друзья в вашей сети заходят по адресу ${lan.join(' или ')}` : 'Город вместе');
  win.loadURL(`http://localhost:${port}`);
  app.on('before-quit', () => server.saveNow());
});

app.on('second-instance', () => { const [w] = BrowserWindow.getAllWindows(); if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('window-all-closed', () => app.quit());
