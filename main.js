import { app, BrowserWindow } from "electron";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Run backend as a separate Node process
const serverPath = path.join(__dirname, "server.js");
fork(serverPath);

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      nodeIntegration: true,   // allow require/import in renderer
      contextIsolation: false  // disable preload, renderer can use Node
    }
  });

  // win.maximize();

  // ✅ Load from backend instead of file://
  win.loadURL("http://localhost:3000");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
