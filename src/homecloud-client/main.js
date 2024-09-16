const {app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell} = require("electron");
const { resolve } = require("path");
const { homedir } = require("os");
const { openSync, writeFileSync, close, readFileSync } = require("fs");

const app_path = app.getAppPath().replaceAll("\\", "/");

const crimsondawn_stylesheets = {
    "form:login-form": app_path + "/statics/viewport/crimson-dawn-style/forms/styles/login-form.css",
    "themes:current": app_path + "/statics/viewport/crimson-dawn-style/themes/crimsondawn-dark.css"
}

function base64ToArrayBuffer(b64) {
    var binaryString = atob(b64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}


const valid_uri_list = [
    app_path + "/statics/viewport/drive.html",
    app_path + "/statics/viewport/text_file_editor.html",
    app_path + "/statics/viewport/image_viewer.html",
    app_path + "/statics/viewport/login.html"
]

// TODO: UPDATE PATHS

let main_wnd;
let download = {};

const createWindow = () => {
    main_wnd = new BrowserWindow({
        width: 2048,
        height: 1024,
        autoHideMenuBar: true,
        icon: app.getAppPath() + "/statics/img/HomeCloud-Icon-white.png",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true, 
            preload: app.getAppPath() + "/preload.js",
            
        }
    });

    main_wnd.loadFile(app.getAppPath() + "/statics/viewport/login.html");

    main_wnd.setMinimumSize(1000, 500);

    main_wnd.on("close", (evt) => {
        evt.preventDefault();
        main_wnd.hide();
    });
}



app.whenReady().then(() => {
    createWindow();
    showAppTray();

    // it's possible to define a kind of local protocol

    // Enforce content security policy
    // session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    //     callback({
    //         responseHeaders: {
    //             ...details.responseHeaders,
    //             'Content-Security-Policy': ["default-src 'self'"]
    //         }
    //     })
    // });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

function showAppTray() {
    let tray = new Tray("statics/img/HomeCloud-Icon-white.png");
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
    if (valid_uri_list.includes((new URL(src)).pathname.replace("/", ""))) {
        return true;
    }

    return false;
}


ipcMain.on("load-viewport", (evt, viewport) => {
    if (!validResource(evt.senderFrame.url)) { return; }

    switch (viewport) {
        case "drive":
            main_wnd.loadFile(app.getAppPath() + "/statics/viewport/drive.html");
            break;
        case "text-editor":
            main_wnd.loadFile(app.getAppPath() + "/statics/viewport/text_file_editor.html");
            break;
        case "image-viewer":
            main_wnd.loadFile(app.getAppPath() + "/statics/viewport/image_viewer.html");
            break;
        case "helper":
            main_wnd.loadFile(app.getAppPath() + "/statics/viewport/help.html");
            break;
        default:
            main_wnd.loadFile(app.getAppPath() + "/statics/viewport/login.html");
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


ipcMain.handle("load-crimson-dawn-style", async (evt, src) => {
    if (!validResource(evt.senderFrame.url)) { return; }

    const fd = openSync(crimsondawn_stylesheets[src], "r");
    const buffer = readFileSync(fd);


    return buffer.toString("utf8");
});