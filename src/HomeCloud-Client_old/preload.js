const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("viewport", {
    setDrive: () => ipcRenderer.send("load-viewport", "drive"),
    setLogin: () => ipcRenderer.send("load-viewport", "login"),
    setTextEditor: () => ipcRenderer.send("load-viewport", "text-editor"),
    setImageViewer: () => ipcRenderer.send("load-viewport", "image-viewer"),
    setHelper: () => ipcRenderer.send("load-viewport", "helper"),
    setAdminPanel: () => ipcRenderer.send("load-viewport", "admin-panel"),
    hideWindow: () => ipcRenderer.send("move-to-tray"),
});

contextBridge.exposeInMainWorld("download", {
    setDownload: async (file_name) => {
        const resp = await ipcRenderer.invoke("set-download", file_name);
        return resp;
    },  
    
    storeFileChunk: async (chunk_b64) => { 
        await ipcRenderer.invoke("store-file-chunk", chunk_b64) 
    },

    showFile: () => ipcRenderer.send("open-d-file-at-location"),
});

contextBridge.exposeInMainWorld("content_policy", {
    setServer: (server) => ipcRenderer.send("set-homecloud-server", server),
});