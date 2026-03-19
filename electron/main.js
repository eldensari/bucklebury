const { app, BrowserWindow, ipcMain, dialog, net } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

let mainWindow;
const isDev = !app.isPackaged;

/* ═══════ DEFAULT STORAGE PATH ═══════ */
function getDefaultBasePath() {
  return path.join(app.getPath("documents"), "Bucklebury");
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/* ═══════ STORAGE: ferry & chat data as .md / .json files ═══════ */
// Keys follow the pattern:
//   ferry:<timestamp>         → stored in <basePath>/ferries/<id>.json
//   gft:<ferryTs>:<chatTs>   → stored in <ferryPath>/chats/<chatTs>.md
//   app:basePath             → stored in <basePath>/settings.json

function getBasePath() {
  const settingsPath = path.join(getDefaultBasePath(), "settings.json");
  if (fs.existsSync(settingsPath)) {
    try {
      const s = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      if (s.basePath) return s.basePath;
    } catch {}
  }
  return getDefaultBasePath();
}

function getFerryDir(ferryData) {
  const basePath = getBasePath();
  if (ferryData && ferryData.storagePath) return ferryData.storagePath;
  if (ferryData && ferryData.name) return path.join(basePath, "ferries", ferryData.name);
  return basePath;
}

function getStoragePath(key) {
  const basePath = getBasePath();
  ensureDir(basePath);

  if (key.startsWith("ferry:")) {
    const ferriesDir = path.join(basePath, "_ferries");
    ensureDir(ferriesDir);
    return path.join(ferriesDir, key.replace("ferry:", "") + ".json");
  }

  if (key.startsWith("gft:")) {
    // gft:<ferryTimestamp>:<chatTimestamp>
    const parts = key.split(":");
    if (parts.length >= 3) {
      const ferryTs = parts[1];
      // Try to find ferry data to get its storage path
      const ferriesDir = path.join(basePath, "_ferries");
      const ferryFile = path.join(ferriesDir, ferryTs + ".json");
      let ferryDir = basePath;
      if (fs.existsSync(ferryFile)) {
        try {
          const fd = JSON.parse(fs.readFileSync(ferryFile, "utf-8"));
          ferryDir = getFerryDir(fd);
        } catch {}
      }
      const chatsDir = path.join(ferryDir, "chats");
      ensureDir(chatsDir);
      return path.join(chatsDir, parts.slice(2).join("_") + ".md");
    }
  }

  // Fallback: generic key
  return path.join(basePath, key.replace(/[^a-zA-Z0-9_-]/g, "_") + ".json");
}

/* ═══════ .md FILE FORMAT ═══════ */
function wrapAsMd(key, jsonStr) {
  // For chat files, wrap JSON in frontmatter-style .md
  if (key.startsWith("gft:")) {
    try {
      const data = JSON.parse(jsonStr);
      const frontmatter = {
        id: data.id,
        title: data.title,
        ferryId: data.ferryId,
        branch: data.branch,
        headId: data.headId,
        parentRef: data.parentRef,
        updated: data.u,
      };
      // Build readable .md
      let md = "---\n";
      md += JSON.stringify(frontmatter, null, 2) + "\n";
      md += "---\n\n";
      // Store full data as JSON block for faithful round-trip
      md += "<!-- bucklebury-data\n";
      md += jsonStr + "\n";
      md += "-->\n\n";
      // Human-readable conversation
      if (data.commits && data.commits.length > 0) {
        const branches = [...new Set(data.commits.map(c => c.branch))];
        for (const br of branches) {
          md += `## ${br}\n\n`;
          const branchCommits = data.commits.filter(c => c.branch === br);
          for (const cm of branchCommits) {
            md += `**User:** ${cm.prompt || ""}\n\n`;
            md += `**AI:** ${cm.response || ""}\n\n`;
          }
        }
      }
      return md;
    } catch {
      return jsonStr;
    }
  }
  return jsonStr;
}

function unwrapFromMd(content, key) {
  if (key.startsWith("gft:") && content.includes("<!-- bucklebury-data")) {
    const match = content.match(/<!-- bucklebury-data\n([\s\S]*?)\n-->/);
    if (match) return match[1];
  }
  return content;
}

/* ═══════ IPC HANDLERS ═══════ */

// storage.set(key, value)
ipcMain.handle("storage:set", async (_event, key, value) => {
  try {
    const filePath = getStoragePath(key);
    ensureDir(path.dirname(filePath));
    const content = wrapAsMd(key, value);
    fs.writeFileSync(filePath, content, "utf-8");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// storage.get(key)
ipcMain.handle("storage:get", async (_event, key) => {
  try {
    const filePath = getStoragePath(key);
    if (!fs.existsSync(filePath)) return { value: null };
    const raw = fs.readFileSync(filePath, "utf-8");
    const value = unwrapFromMd(raw, key);
    return { value };
  } catch (e) {
    return { value: null, error: e.message };
  }
});

// storage.delete(key)
ipcMain.handle("storage:delete", async (_event, key) => {
  try {
    const filePath = getStoragePath(key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// storage.list(prefix)
ipcMain.handle("storage:list", async (_event, prefix) => {
  try {
    const basePath = getBasePath();
    const keys = [];

    if (prefix.startsWith("ferry:")) {
      const ferriesDir = path.join(basePath, "_ferries");
      if (fs.existsSync(ferriesDir)) {
        const files = fs.readdirSync(ferriesDir).filter(f => f.endsWith(".json"));
        for (const f of files) {
          keys.push("ferry:" + f.replace(".json", ""));
        }
      }
    } else if (prefix.startsWith("gft:")) {
      // List all chats, optionally filtered by ferry
      const parts = prefix.split(":");
      const ferryFilter = parts.length >= 2 && parts[1] ? parts[1] : null;

      // Scan ferry dirs for chats
      const ferriesDir = path.join(basePath, "_ferries");
      if (fs.existsSync(ferriesDir)) {
        const ferryFiles = fs.readdirSync(ferriesDir).filter(f => f.endsWith(".json"));
        for (const ff of ferryFiles) {
          const ferryTs = ff.replace(".json", "");
          if (ferryFilter && ferryTs !== ferryFilter) continue;
          try {
            const fd = JSON.parse(fs.readFileSync(path.join(ferriesDir, ff), "utf-8"));
            const ferryDir = getFerryDir(fd);
            const chatsDir = path.join(ferryDir, "chats");
            if (fs.existsSync(chatsDir)) {
              const chatFiles = fs.readdirSync(chatsDir).filter(f => f.endsWith(".md"));
              for (const cf of chatFiles) {
                const chatTs = cf.replace(".md", "").replace(/_/g, ":");
                keys.push("gft:" + ferryTs + ":" + chatTs);
              }
            }
          } catch {}
        }
      }

      // Also check base path chats dir (for chats without ferry-specific dir)
      const defaultChatsDir = path.join(basePath, "chats");
      if (fs.existsSync(defaultChatsDir)) {
        const chatFiles = fs.readdirSync(defaultChatsDir).filter(f => f.endsWith(".md"));
        for (const cf of chatFiles) {
          const chatTs = cf.replace(".md", "").replace(/_/g, ":");
          const key = "gft:" + (ferryFilter || "") + ":" + chatTs;
          if (!keys.includes(key)) keys.push(key);
        }
      }
    }

    return { keys };
  } catch (e) {
    return { keys: [], error: e.message };
  }
});

// Dialog: select folder
ipcMain.handle("dialog:selectFolder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Get default base path
ipcMain.handle("app:getDefaultPath", async () => {
  return getDefaultBasePath();
});

// Delete ferry: remove meta + trash data folder
ipcMain.handle("ferry:delete", async (_event, ferryId, ferryData) => {
  try {
    // Delete ferry metadata file
    const metaPath = getStoragePath(ferryId);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

    // Trash the ferry data folder (chats etc.)
    const ferryDir = path.normalize(getFerryDir(ferryData));
    if (fs.existsSync(ferryDir)) {
      const { shell } = require("electron");
      try {
        await shell.trashItem(ferryDir);
      } catch {
        // Fallback: delete recursively if trash fails
        fs.rmSync(ferryDir, { recursive: true, force: true });
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/* ═══════ LLM API CALLS (Main Process — no CORS) ═══════ */

function detectProvider(key) {
  if (!key) return null;
  const k = key.trim();
  if (k.startsWith("sk-ant-")) return { id: "anthropic", name: "Anthropic" };
  if (k.startsWith("sk-") || k.startsWith("sk-proj-")) return { id: "openai", name: "OpenAI" };
  if (k.startsWith("AI")) return { id: "gemini", name: "Gemini" };
  return null;
}

ipcMain.handle("llm:call", async (_event, apiKey, messages) => {
  const key = apiKey.trim().replace(/[^\x20-\x7E]/g, "");
  const provider = detectProvider(key);
  if (!provider) throw new Error("Unknown API key format.");

  try {
    if (provider.id === "anthropic") {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, messages }),
        signal: AbortSignal.timeout(120000),
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new Error(resp.status === 401 ? "Invalid API key." : "API " + resp.status + ": " + body);
      }
      const d = await resp.json();
      return d.content?.[0]?.text || "";
    }

    if (provider.id === "openai") {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
        body: JSON.stringify({ model: "gpt-4o", max_tokens: 4096, messages }),
        signal: AbortSignal.timeout(120000),
      });
      if (!resp.ok) throw new Error(resp.status === 401 ? "Invalid API key." : "API " + resp.status);
      const d = await resp.json();
      return d.choices?.[0]?.message?.content || "";
    }

    if (provider.id === "gemini") {
      const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
        body: JSON.stringify({ model: "gemini-2.0-flash", max_tokens: 4096, messages }),
        signal: AbortSignal.timeout(120000),
      });
      if (!resp.ok) throw new Error(resp.status === 401 ? "Invalid API key." : "API " + resp.status);
      const d = await resp.json();
      return d.choices?.[0]?.message?.content || "";
    }

    throw new Error("Unsupported provider.");
  } catch (e) {
    throw e;
  }
});

/* ═══════ WINDOW ═══════ */
const { Menu } = require("electron");

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Bucklebury",
    icon: path.join(__dirname, "..", "assets", "icons", "icons", "win", "icon.ico"),
    ...(process.platform === "darwin" ? { titleBarStyle: "hiddenInset" } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "build", "index.html"));
  }
}

app.whenReady().then(() => {
  // Ensure default storage directory exists
  ensureDir(getDefaultBasePath());
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
