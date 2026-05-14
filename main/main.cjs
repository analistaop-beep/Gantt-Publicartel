const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Services = require('../src/services/dataService.cjs');
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
console.log('App starting in mode:', isDev ? 'Development' : 'Production');
console.log('NODE_ENV:', process.env.NODE_ENV);

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (isDev) {
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// IPC Handlers
ipcMain.handle('get-members', () => Services.getMembers());
ipcMain.handle('add-member', (_, m) => Services.addMember(m));
ipcMain.handle('update-member', (_, m) => Services.updateMember(m));
ipcMain.handle('delete-member', (_, id) => Services.deleteMember(id));

ipcMain.handle('get-vehicles', () => Services.getVehicles());
ipcMain.handle('add-vehicle', (_, v) => Services.addVehicle(v));
ipcMain.handle('update-vehicle', (_, v) => Services.updateVehicle(v));
ipcMain.handle('delete-vehicle', (_, id) => Services.deleteVehicle(id));

ipcMain.handle('get-teams', () => Services.getTeams());

ipcMain.handle('get-tasks', (_, type) => Services.getTasks(type));
ipcMain.handle('add-task', (_, t) => Services.addTask(t));
ipcMain.handle('update-task', (_, t) => Services.updateTask(t));
ipcMain.handle('delete-task', (_, id) => Services.deleteTask(id));
ipcMain.handle('clear-tasks-range', (_, { startDate, endDate, type }) => Services.clearTasksByDateRange(startDate, endDate, type));
ipcMain.handle('reset-database', () => Services.resetDatabase());
ipcMain.handle('get-daily-hours', (_, { teamId, date }) => Services.calculateDailyHours(teamId, date));

ipcMain.handle('save-file', async (_, { content, fileName, extension }) => {
    const { dialog } = require('electron');
    const fs = require('fs');
    const { filePath } = await dialog.showSaveDialog({
        defaultPath: fileName,
        filters: [{ name: extension, extensions: [extension] }]
    });

    if (filePath) {
        // Content might be a Uint8Array from the renderer
        fs.writeFileSync(filePath, Buffer.from(content));
        return true;
    }
    return false;
});

ipcMain.handle('get-logo', async () => {
    const fs = require('fs');
    const path = require('path');
    const logoPath = path.join(__dirname, '../public/logo-publicartel.png');
    if (fs.existsSync(logoPath)) {
        const logo = fs.readFileSync(logoPath);
        return `data:image/png;base64,${logo.toString('base64')}`;
    }
    return null;
});

ipcMain.handle('get-reminders', () => Services.getReminders());
ipcMain.handle('add-reminder', (_, r) => Services.addReminder(r));
ipcMain.handle('update-reminder', (_, r) => Services.updateReminder(r));
ipcMain.handle('delete-reminder', (_, id) => Services.deleteReminder(id));
ipcMain.handle('get-production-orders', () => Services.getProductionOrders());
ipcMain.handle('add-production-order', (_, o) => Services.addProductionOrder(o));
ipcMain.handle('update-production-order', (_, o) => Services.updateProductionOrder(o));
ipcMain.handle('delete-production-order', (_, id) => Services.deleteProductionOrder(id));

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
