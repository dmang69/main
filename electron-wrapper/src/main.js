const { app, BrowserWindow, shell, session } = require("electron");
const path = require("path");
const log = require("electron-log");
const { autoUpdater } = require("electron-updater");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

log.transports.file.level = "info";
autoUpdater.logger = log;

const isDev = process.env.NODE_ENV === "development";
const apiOrigin = process.env.API_ORIGIN || "https://api.example.com";
const devUrl = process.env.ELECTRON_DEV_URL || "http://localhost:8081";
const prodUrl = process.env.ELECTRON_START_URL || "";

let mainWindow;

function cspValue() {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    `connect-src 'self' ${apiOrigin} wss:${apiOrigin.replace(/^https:/, "")}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function loadApp(window) {
  if (isDev) {
    window.loadURL(devUrl);
    return;
  }

  if (prodUrl) {
    window.loadURL(prodUrl);
    return;
  }

  const localHtml = path.join(__dirname, "renderer", "index.html");
  window.loadFile(localHtml);
}

function createWindow() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [cspValue()],
      },
    });
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: "#0a0a0a",
    title: "Shennell Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  loadApp(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.error("autoUpdater failed", err);
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
