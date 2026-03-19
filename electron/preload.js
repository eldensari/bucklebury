const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("storage", {
  set: (key, value) => ipcRenderer.invoke("storage:set", key, value),
  get: (key) => ipcRenderer.invoke("storage:get", key),
  delete: (key) => ipcRenderer.invoke("storage:delete", key),
  list: (prefix) => ipcRenderer.invoke("storage:list", prefix),
});

contextBridge.exposeInMainWorld("electronAPI", {
  selectFolder: () => ipcRenderer.invoke("dialog:selectFolder"),
  getDefaultPath: () => ipcRenderer.invoke("app:getDefaultPath"),
  callLLM: (apiKey, messages) => ipcRenderer.invoke("llm:call", apiKey, messages),
  deleteFerry: (ferryId, ferryData) => ipcRenderer.invoke("ferry:delete", ferryId, ferryData),
});
