const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("data", {
    get_file_id: () => ipcRenderer.send("get_data", "file_id"),
})