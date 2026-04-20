const { app, BrowserWindow, shell } = require('electron');
const { autoUpdater }                = require('electron-updater');
const path                           = require('path');

// ─── Ventana principal ────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width:     1140,
        height:    860,
        minWidth:  780,
        minHeight: 600,
        title: 'Conquista Online — Loot & Craft Tracker',
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        webPreferences: {
            preload:          path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration:  false,
        },
    });

    mainWindow.loadFile('index.html');

    // Abre cualquier enlace <a target="_blank"> en el navegador del sistema
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Oculta el menú nativo (opcional — quitar esta línea para recuperarlo)
    mainWindow.setMenuBarVisibility(false);
}

// ─── Ciclo de vida ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // Solo busca actualizaciones en producción (app empaquetada)
    if (app.isPackaged) {
        setupAutoUpdater();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ─── Auto-updater ─────────────────────────────────────────────────────────────
function setupAutoUpdater() {
    // Silencia logs en producción; cámbialo a 'info' para depurar actualizaciones
    autoUpdater.logger = null;

    autoUpdater.on('update-available', () => {
        // Descarga la actualización en segundo plano automáticamente
    });

    autoUpdater.on('update-downloaded', () => {
        // Instala la actualización y reinicia cuando el usuario cierre la app
        autoUpdater.quitAndInstall(false, true);
    });

    autoUpdater.on('error', () => {
        // Error silencioso: si el servidor no está configurado, la app sigue funcionando
    });

    // Revisa actualizaciones al iniciar y luego cada 4 horas
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    setInterval(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 4 * 60 * 60 * 1000);
}
