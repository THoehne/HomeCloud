const {app, BrowserWindow, Tray, Menu, ipcRenderer, ipcMain, dialog, shell, session} = require("electron");
const { resolve } = require("path");
const { homedir } = require("os");
const { openSync, writeFileSync, close, copyFileSync } = require("fs");

function base64ToArrayBuffer(b64) {
    var binaryString = atob(b64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}


const valid_uri_list = [
    app.getAppPath().replaceAll("\\", "/") + "/pages/drive.html",
    app.getAppPath().replaceAll("\\", "/") + "/pages/text_file_editor.html",
    app.getAppPath().replaceAll("\\", "/") + "/pages/image_viewer.html",
    app.getAppPath().replaceAll("\\", "/") + "/pages/login.html"
]

let main_wnd;
let tray;
let download = {};

const createWindow = () => {
    main_wnd = new BrowserWindow({
        width: 2048,
        height: 1024,
        autoHideMenuBar: true,
        icon: "icons/HomeCloud-Icon-white.ico",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true, 
            preload: app.getAppPath() + "/preload.js",
            
        }
    });



    main_wnd.loadFile(app.getAppPath() + "/pages/login.html");

    main_wnd.setMinimumSize(1000, 500);

    main_wnd.on("close", (evt) => {
        evt.preventDefault();
        main_wnd.hide();
    });
}

// Allow only single instance of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (main_wnd) {
        if (!main_wnd.isFocused()) main_wnd.show();
        main_wnd.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow(); 
        showAppTray();
    });
}

// app.whenReady().then(() => {
//     createWindow();
//     showAppTray();

//     // Enforce content security policy
//     // session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
//     //     callback({
//     //         responseHeaders: {
//     //             ...details.responseHeaders,
//     //             'Content-Security-Policy': ["default-src 'self'"]
//     //         }
//     //     })
//     // });
// });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

function showAppTray() {
    let tray = new Tray("icons/HomeCloud-Icon-white.ico");
    const contextMenu = Menu.buildFromTemplate([
        { id:"toggle-open-window", label: 'Open Window', type: "normal", click() { 
            main_wnd.show();
        }},
        { label: "", type:"separator"},
        { label: "Close Application", type: "normal", click() { app.exit(); }}
    ]);

    tray.setToolTip("HomeCloud - Client");

    tray.setContextMenu(contextMenu);
}

function validResource(src) {
    return true;

    
    let url = (new URL(src)).href.replace("file:///", "");
    if (valid_uri_list.includes(url).pathname.replace("/", "")) {
        return true;
    }

    return false;
}


ipcMain.on("load-viewport", (evt, viewport) => {
    if (!validResource(evt.senderFrame.url)) { 
        return; 
    }

    switch (viewport) {
        case "drive":
            main_wnd.loadFile(app.getAppPath() + "/pages/drive.html");
            break;
        case "text-editor":
            main_wnd.loadFile(app.getAppPath() + "/pages/text_file_editor.html");
            break;
        case "image-viewer":
            main_wnd.loadFile(app.getAppPath() + "/pages/image_viewer.html");
            break;
        case "helper":
            main_wnd.loadFile(app.getAppPath() + "/pages/help.html");
            break;
        case "admin-panel":
            main_wnd.loadFile(app.getAppPath() + "/pages/admin-panel.html");
            break;
        default:
            main_wnd.loadFile(app.getAppPath() + "/pages/login.html");
    }
});


ipcMain.on("move-to-tray", () => {
    main_wnd.hide();
});

ipcMain.handle("set-download", async (evt, file_name) => {
    if (!validResource(evt.senderFrame.url)) { return; }

    let resp = await dialog.showSaveDialog(main_wnd, {
        title: "Save file " + file_name,
        defaultPath: resolve(homedir(), 'Downloads', file_name),
        buttonLabel: "Download"
    });

    download = resp;

    return resp.canceled;
});

ipcMain.handle("store-file-chunk", (evt, chunk_b64) => {
    if (!validResource(evt.senderFrame.url)) { return; }

    const fd = openSync(download.filePath, "a");
    const buffer = Buffer.from(base64ToArrayBuffer(chunk_b64));

    writeFileSync(fd, buffer);
    close(fd);
    return;
});

ipcMain.on("open-d-file-at-location", (evt) => {
    if (!validResource(evt.senderFrame.url)) { return; }

    shell.showItemInFolder(download.filePath);
});

ipcMain.on("set-homecloud-server", (evt, server) => {
    if ((new URL(evt.senderFrame.url)).pathname.replace("/", "") != valid_uri_list[3]) { return; }
    // console.log('default-src \'self\'; connect-src ' + server);

    // Enforce content security policy
    // session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    //     callback({
    //         responseHeaders: {
    //         ...details.responseHeaders,
    //         'Content-Security-Policy': ["default-src 'self'; connect-src " + server + "*"]
    //         }
    //     })
    // });
});