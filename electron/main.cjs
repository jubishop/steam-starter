const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const game = require("../game.config.json");

const isDevelopment = process.argv.includes("--dev");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.setName(game.title);

function createWindow() {
  const window = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 960,
    minHeight: 540,
    fullscreen: !isDevelopment,
    autoHideMenuBar: true,
    backgroundColor: "#08090d",
    title: game.title,
    show: false,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
    window.focus();
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  if (isDevelopment) {
    void window.loadURL("http://127.0.0.1:5173");
  } else {
    void window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
