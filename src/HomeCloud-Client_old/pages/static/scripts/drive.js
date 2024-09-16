class Globales {
    path_prefix = document.getElementById('header-path-viewer-username');
    current_selected_file = null;
    cwd = null;
    current_files = null;
    current_folder = "";
    username = "";
    open_context_menu = null;
    current_dlg = null;
    server = sessionStorage.getItem("Server");
    cancel_current_process = false;
    prev_folder = [];
    file_property_change_list = [];
    process_is_running = false;
}

const global_var = new Globales;
const debug_mode = false;

// HOMECLOUD API Lib
const session_id = sessionStorage.getItem("SessionId");

const fileAPI           = new FileAPI(global_var.server, session_id);
const downloadAPI       = new DownloadAPI(global_var.server, session_id);
const uploadAPI         = new UploadAPI(global_var.server, session_id);
const userAPI           = new UserAPI(global_var.server, session_id);
const sessionAPI        = new SessionAPI(global_var.server, session_id);

delete session_id;
// END HOMECLOUD API CONSTANTS

class Progressbar {

    #progress_bar;
    #time_ms;
    #percentage;
    #running;
    #max_val;
    #interval;
    
    constructor(progress_bar_id, max_val, current_val, time_ms) {
        this.#progress_bar = document.getElementById(progress_bar_id).getElementsByClassName("progress-bar-filling")[0];
        this.#max_val = max_val;
        this.#time_ms = time_ms; 
        this.#percentage = (current_val / max_val) * 100;   
        this.#progress_bar.style.width = "0%";

        this.#running = false;
    }

    set_current_val(current_val) {
        if (current_val > this.#max_val) {
            return;
        }

        let new_percentage = (current_val / this.#max_val) * 100;   

        if  (!(new_percentage <= this.#percentage)) {
            this.#percentage = new_percentage;
        } 
    }

    reset() {
        this.#progress_bar.style.width = "0%";
    }

    stop() {
        clearInterval(this.#interval);
    }

    set_new_time(time_ms) {
        if (time_ms > 0) {
            this.#time_ms = time_ms;
        }
        else {
            this.#time_ms = 1;
        }
    }

    is_running() {
        return this.#running;
    }

    update_current_val(current_val) {
        this.set_current_val(current_val);
        
        if (!this.#running) {
            this.start();
        }
    }

    start() {
        if (this.#running) { return };
        this.#running = true;
        this.#interval = setInterval(() => {
            let current_perc = parseFloat(this.#progress_bar.style.width.replace("%", ""));

            if (current_perc >= this.#percentage) {
                this.#progress_bar.style.width = this.percentage + "%";
                this.stop();
                this.#running = false;
            } else {
                current_perc += 0.5;
                this.#progress_bar.style.width = current_perc + "%";
            }

        }, this.#time_ms);
    }
} // Progressbar

class QuickDlg {

    static showConnectionError() {
        QuickDlg.openFolderErrorDlg("Connection to server failed.");
    }

    static openFolderErrorDlg(msg) {
        document.getElementById("folder-open-error-description").innerText = msg;
        Dialog.openDlg("folder-open-error-dlg");
    }

    static openInfoDlg(heading, description) {
        document.getElementById("info-dlg").getElementsByTagName("header")[0].innerText = heading;
        document.getElementById("info-description").innerText = description;
        Dialog.openDlg("info-dlg");
    }

    static async loadAccountDlg() {
        const username = document.getElementById("account-settings-dlg-username");
        const user_group_td = document.getElementById("account-settings-dlg-usergroup");
        const root_folder_id = document.getElementById("account-settings-dlg-root-folder-id");

        const result = await userAPI.get_account_properties("!null", ["username", "root_folder_id", "group_id", "id"]);

        switch (result[0]) {
            case SUCCESS:

                let group_name = await userAPI.get_group_properties(result[1].group_id, ["group_name"])

                if (group_name[0] == API_ERROR) {
                    console.log(group_name[1]);
                }
        
                username.innerText = result[1].username;
                username.setAttribute("copy_data", result[1].id);

                root_folder_id.innerText = result[1].root_folder_id;

                user_group_td.innerText = group_name[1].group_name;
                user_group_td.setAttribute("copy_data", result[1].group_id);

                
                break;
            
            case API_ERROR:
                console.log(result[1]);
                break;

            case SERVER_ERROR:
                console.log(result[1])
                break;
        
            default:
                break;
        }

        Dialog.openDlg("account-settings-dlg");
    }

} // QuickDlg

class FileBrowser {
    static goToPrevFolder() {
        let path = global_var.cwd;
        const prev_path = path.split("/").slice(0,-2).join("/") + "/";
        global_var.cwd = prev_path;
    
        global_var.current_folder = global_var.prev_folder.pop();
    
        FileBrowser.loadNewCwd();
    
        document.getElementById("header-path-viewer-path").innerHTML = global_var.cwd.slice(1,-1).replaceAll("/", "::");
        document.getElementsByTagName("title").item(0).innerHTML = "HomeCloud - /" + global_var.cwd.slice(1, -1);
    }
    
    // Handles click on a file.
    static fileClickedEvt(target) {
        if (target.id == "selected-file") {
            return
        }
    
        target.id = "selected-file"
        try {
            global_var.current_selected_file.id = ""
        } catch (error) {
        }
        global_var.current_selected_file = target;
    }

    // handle opening files (files/folder/safes)
    static openFolder(target) {
        let folder_name = target.getElementsByClassName("file-filename")[0].innerHTML;

        global_var.prev_folder.push(global_var.current_folder);
        global_var.current_folder = target.getAttribute("file_id");

        global_var.cwd = global_var.cwd  + folder_name + "/";
        FileBrowser.loadNewCwd();

        document.getElementById("header-path-viewer-path").innerHTML = global_var.cwd.slice(1,-1).replaceAll("/", "::");
        document.getElementsByTagName("title").item(0).innerHTML = "HomeCloud - /" + global_var.cwd.slice(1, -1);
    }

    
    static openFile(target) {
        let file_id = target.getAttribute("file_id");
        let file_type = global_var.current_files.files[file_id].file_type;

        sessionStorage.setItem("file_id_to_open", global_var.current_selected_file.getAttribute("file_id"));
        sessionStorage.setItem("cwd", global_var.cwd);
        sessionStorage.setItem("folder_path", global_var.prev_folder.join("/") + "/" + global_var.current_folder);

        switch (file_type) {
            case "Image File":
                viewport.setImageViewer();
                break;
            default:
                this.editFile();
        }
    }


    // Handle file edit call
    static editFile() {
        sessionStorage.setItem("file_id_to_open", global_var.current_selected_file.getAttribute("file_id"));
        sessionStorage.setItem("cwd", global_var.cwd);
        sessionStorage.setItem("folder_path", global_var.prev_folder.join("/") + "/" + global_var.current_folder);
        viewport.setTextEditor();
    }

    // register a new file in the current_files storage
    static async registerFile(file_id, file_name, file_size, file_type, last_changed) {
        
        global_var.current_files.files[file_id] = {
            "file_name":            file_name,
            "file_size":            file_size,
            "file_type":            file_type,
            "last_changed":         last_changed,
            "owner":                global_var.username,
        }
        
    }

    static async registerFolder(folder_id, folder_name, folder_type, last_changed, owner_id) {

        global_var.current_files.folders[folder_id] = {
            "folder_name":          folder_name,
            "folder_type":          folder_type,
            "last_changed":         last_changed,
            "owner":                global_var.username,
        }
    }

    static loadNewCwd() {
        FileBrowserRenderer.clearFileViewport();
        loadFolder();
        FileBrowserRenderer.checkGoBack();
    }
} // FileBrowser

class FileBrowserRenderer {

    static createFileNode(file_id_in, file_name_in, owner_in, last_changed_in, file_size_in, type) {
        let file_size_mb = file_size_in * 0.000001;
    
        let filenode = document.createElement("div");
            filenode.classList.add("file");
            filenode.setAttribute("file_id", file_id_in)
            filenode.onclick = function() {
                FileBrowser.fileClickedEvt(filenode);
            };
    
            filenode.oncontextmenu = function () {
                FileBrowser.fileClickedEvt(filenode);
            }
    
            if (type == "Folder" || type == "UserFolder") {
                filenode.classList.add("folder");
            } else {
                filenode.classList.add("real_file");
            }
    
            Tools.addEventForFileType(filenode, type);
    
            let file_name = document.createElement("div");
            file_name.classList.add("file-filename");
        
            let file_owner = document.createElement("div");
            file_owner.classList.add("file-fileowner");
        
            let file_lastchanged = document.createElement("div");
            file_lastchanged.classList.add("file-lastchanged");
        
            let file_size = document.createElement("div");
            file_size.classList.add("file-filesize");
    
            let file_icon = document.createElement("img");
            file_icon.src = Tools.getIconPathForFileType(type);
            file_icon.width = "24";
            file_icon.height = "24";
            file_icon.style.position = "absolute";
            file_icon.style.left = "50px";
            file_icon.style.border = "2px solid white"
            file_icon.style.padding = "5px"
            file_icon.classList.add("no-highlight");
            file_icon.draggable = false;
    
            filenode.appendChild(file_icon);
    
            file_name.appendChild(document.createTextNode(file_name_in));
            filenode.appendChild(file_name);
    
            file_owner.appendChild(document.createTextNode(owner_in));
            filenode.appendChild(file_owner);
    
            file_lastchanged.appendChild(document.createTextNode(last_changed_in));
            filenode.appendChild(file_lastchanged);
    
            if (file_size_in == null) {
                file_size.appendChild(document.createTextNode("-"));
            } else {
                file_size.appendChild(document.createTextNode(file_size_mb.toFixed(2) + " MB"));
            }
    
            filenode.appendChild(file_size);
    
            if (type == "Folder" || type == "UserFolder") {
                document.getElementById("file-viewport-file-viewer-body-folders").appendChild(filenode);
            } else {
                document.getElementById("file-viewport-file-viewer-body-files").appendChild(filenode);
            }
    }

    static removeFileNode(obj) {
        obj.remove();
    }

    static clearFileViewport() {
        let folders = document.getElementById("file-viewport-file-viewer-body-folders");
        let files = document.getElementById("file-viewport-file-viewer-body-files");
    
        while (folders.firstChild) {
            const element = folders.lastChild;
            folders.removeChild(element);
        }
    
        while (files.firstChild) {
            const element = files.lastChild;
            files.removeChild(element);
        }
    }


    static checkGoBack() {
        if (global_var.cwd == "/") {
            document.getElementById("go-back-btn").style.display = "none";
        } else {
            document.getElementById("go-back-btn").style.display = "flex";
        }
    }

    static async renderPage() {
        FileBrowserRenderer.clearFileViewport();
    
        // Open root folder
        if (sessionStorage.getItem("folder_path") != null) {
            let folder_path = sessionStorage.getItem("folder_path").split("/");
    
            global_var.cwd = sessionStorage.getItem("cwd");
            global_var.current_folder = folder_path.pop();
            global_var.prev_folder = folder_path;
            
            document.getElementById("header-path-viewer-path").innerHTML = global_var.cwd.slice(1,-1).replaceAll("/", "::");
            document.getElementsByTagName("title").item(0).innerHTML = "HomeCloud - /" + global_var.cwd.slice(1, -1);
            
            sessionStorage.removeItem("cwd");
            sessionStorage.removeItem("folder_path");
            sessionStorage.removeItem("file_id_to_open");
        }
    
        // Render path display
        if (global_var.cwd == null) 
        { 
            global_var.cwd = "/";
        }
    
        if (global_var.cwd == "/") {
            loadRootFolder();
        } else {
            loadFolder();
        }


        const username = await userAPI.get_username("!null", null);

        if (username != null) {
            global_var.username = username;
            global_var.path_prefix.innerHTML = username + "@" + (new URL(global_var.server)).host + "://";
            if (global_var.path_prefix.innerHTML === "root@" + (new URL(global_var.server)).host + "://") {
                global_var.path_prefix.style.color = "red";
                document.getElementById("admin_panel_btn").style.display = "block";
            }
        }
    
        // Check if it's necessary to display back arrow 
        FileBrowserRenderer.checkGoBack();
    }

    static showSkeletonFiles() {
        document.getElementById("file-viewport-file-viewer-body-skeletons").classList.add("shown-skeleton");
    
    }
    
    static hideSkeletonFiles() {
        document.getElementById("file-viewport-file-viewer-body-skeletons").classList.remove("shown-skeleton");
    }
} // FileBrowserRenderer

class Dialog {
    static openDlg(id) {
        const dlg = document.getElementById(id);
        dlg.style.display = "flex";
        global_var.current_dlg = dlg;
        document.getElementById("dlg-blocking-overlay").style.display = "block";
    }
    
    static closeDlg() {
    
        // Handle overlaping of system closing and user closing.
        try {
            global_var.current_dlg.style.display = "none";
    
            document.getElementById("dlg-blocking-overlay").style.display = "none";
            
            const dlg_error = global_var.current_dlg.querySelector(".dlg-error");
            
            dlg_error.innerText = "";
            dlg_error.style.display = "none";

            global_var.current_dlg = null;
        } catch (error) {
            if (debug_mode) {
                console.error(error);
            }
        }
    
    }

    static showError(msg) {
        const dlg_error = global_var.current_dlg.querySelector(".dlg-error");
        dlg_error.innerText = msg;
        dlg_error.style.display = "block";
    }
} // Dialog

class Tools {
    // Gets Folder id by folder name
    static getFolderId(name) {
        const folders = global_var.current_files['folders'];
    
        Object.keys(folders).forEach(id => {
            if  (folders[id]['folder_name'] == name) {
                return id;
            }
        });
    
        return null;
    }
    
    // Gets File id by file name
    static getFileId(name) {
        const files = global_var.current_files['files'];
    
        Object.keys(files).forEach(id => {
            if  (files[id]['file_name'] == name) {
                return id;
            }
        });
    
        return null;
    }
    
    static getIconPathForFileType(file_type) {
        switch (file_type) {
            case "TextFile":
                return "static/img/file.png";
            case "Folder":
                return "static/img/folder.png";
            case "UserFolder":
                return "static/img/user.png";
            default:
                return "static/img/file.png";
        }
    }
    
    static addEventForFileType(filenode, type) {
        switch (type) {
            case "Folder":
            case "UserFolder":
                filenode.ondblclick = function () {
                    FileBrowser.openFolder(filenode);
                }
                break;
    
            default: // TextFile
                filenode.ondblclick = function () {
                    FileBrowser.openFile(filenode);
                }
        }
    }

    static checkFileName(input, on_true, on_false) {
        let found = false
        const illegal_char = ["/", "\\", ":", "<", ">", "|", "*", '"', "?", "@", "=", "&", "ä", "Ä", "ü", "Ü", "ö", "Ö", "ß"];
        const text = input.value;
    
        illegal_char.forEach(char => {
            if (text.includes(char)) { 
                found = true;
            } 
        });
    
        if (text.lastIndexOf(".") == text.length - 1) {
            found = true;
        }
    
        if (found) {
            input.style.borderBottom = on_false;
            input.setAttribute("clean", "false");
        }
        else { 
            input.style.borderBottom = on_true;
            input.setAttribute("clean", "true");
        }
    }

    static async chunkFile(file, callback_per_chunk) {
        const chunk_size = 1024 * 1024;
        const chunks = Math.ceil(file.size / chunk_size, chunk_size);
        let chunk_list = [] 
    
        for (let i = 0; i < chunks; i++) {
            let offset = i * chunk_size;
            const chunkBlob = file.slice(offset, offset + chunk_size);
    
            const chunkBuffer = await chunkBlob.arrayBuffer();
            const bytes = new Uint8Array(chunkBuffer);
            let binary = "";
    
            for (let ij = 0; ij < bytes.length; ij++) {
                binary += String.fromCharCode(bytes[ij]);
            }
    
            const base64Chunk = btoa(binary);  
            chunk_list.push(base64Chunk);
            if (callback_per_chunk(i+1)) {
                return;
            }   
        }
    
        return chunk_list;
    }

} // Tools

class ContextMenu {

    static getContextMenu(target) {
        if (target.id == "file-viewport-file-viewer-body" || target.parentNode.id == "file-viewport-file-viewer-header") {
            return document.getElementById("general-fileviewer-context-menu");
        } else if (target.classList.contains("folder") || target.parentNode.classList.contains("folder")) {
            return document.getElementById("folder-context-menu");
        } else if (target.classList.contains("real_file") || target.parentNode.classList.contains("real_file")) {
            return document.getElementById("file-context-menu");
        } else if (target.nodeName == "INPUT" || target.type == "text") {
            document.getElementById("input-context-menu").input_dom = target;
            return document.getElementById("input-context-menu");
        } else if (target.nodeName == "TEXTAREA") {
            return document.getElementById("textarea-context-menu");
        }
        return null;
    }
    
    static closeContextMenu() {
        global_var.open_context_menu.style.display = "none";
        global_var.open_context_menu = null;
    }
    
} // ContextMenu


async function setup() {

    FileBrowserRenderer.renderPage();

    // Open Contextmenu
    window.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        
        if (global_var.open_context_menu != null) {
            global_var.open_context_menu.style.display = "none";
        }
        global_var.open_context_menu = null; 
        
        const x = e.clientX;
        const y = e.clientY;
        
        const menu = ContextMenu.getContextMenu(e.target);
        
        if (menu == null) {
            return;
        }
        
        let menu_height = menu.children.length * 35; 
        
        if (x + 170 + 20 > window.innerWidth) {
            menu.style.left = x - 170 + "px";
        } else {
            menu.style.left = x + "px";
        }
        
        if (y + menu_height + 20 > window.innerHeight) {
            menu.style.top = y + "px";
        } else {
            menu.style.top = y + "px";
        }
        
        menu.style.display = "flex";
        global_var.open_context_menu = menu;
    });

    // Close Contextmenu
    document.addEventListener("click", function (e) {
        if (global_var.open_context_menu != null) {
            global_var.open_context_menu.style.display = "none";
        }

        global_var.open_context_menu = null; 
    });

    // check for resize 
    window.addEventListener("resize", (evt) => {
        const file_owner = document.getElementsByClassName("file-fileowner");
        const file_size = document.getElementsByClassName("file-filesize");
        const file_date = document.getElementsByClassName("file-lastchanged");
        if (window.innerWidth < 1201) {

           for (let i = 0; i < file_owner.length; i++) {
                file_owner.item(i).style.display = "none";
                file_size.item(i).style.display = "none";
                file_date.item(i).style.display = "none";
            }
        } else {
            for (let i = 0; i < file_owner.length; i++) {
                file_owner.item(i).style.display = "flex";
                file_size.item(i).style.display = "flex";
                file_date.item(i).style.display = "flex";
            }
        }
    });

    // window.addEventListener("mousemove", evt => {
    //     if (Menu.is_active()) {
    //         if (evt.clientX < 20) {
    //             Menu.shown_open_arrow();
    //         } else {
    //             Menu.hide_open_arrow();
    //         }
    //     } else {

    //     }
    // });
}

// class Menu {
    
//     // class: hidden (no menu / no arrow)
//     // class: no hidden (show arrow / no menu)
//     // class: shown (show menu / show arrow)
//     // class: no shown (depends on class hidden)

//     static #menu = document.getElementById("discrete-side-menu");

//     static shown_open_arrow() {
//         this.#menu.classList.remove("hidden");
//     }

//     static hide_open_arrow() {
//         this.#menu.classList.add("hidden");
//     }

//     static toggle_open_menu() {
//         this.#menu.classList.toggle("shown");

//         if (this.is_open()) {
//             this.#menu.querySelectorAll("img")[0].style.transform = "rotate(180deg)";
//         } else {
//             this.#menu.querySelectorAll("img")[0].style.transform = "rotate(0deg)";
//         }
//     }

//     static close_menu() {
//         this.#menu.classList.remove("shown");
//         this.#menu.querySelectorAll("img")[0].style.transform = "rotate(0deg)";
//     }

//     static is_open() {
//         if (this.#menu.classList.contains("shown")) {
//             return true;
//         }
//         return false;
//     }

//     static is_active() {
//         if (this.#menu.classList.contains("active")) {
//             return true;
//         } else {
//             return false;
//         }
//     }
    
// } // Menu

async function loadFolder() {
    
    const show_skeleton_timout = setTimeout(() => {
        FileBrowserRenderer.showSkeletonFiles();
    }, 200);

    let result = await fileAPI.get_folder(global_var.current_folder);

    switch (result[0]) {
        case SUCCESS:
    
            const folders = result[1].folders;
            const files = result[1].files;

            Object.keys(folders).forEach(id => {
                if (!Object.keys(folders[id]).includes("owner")) {
                    folders[id].owner = "hidden";
                    folders[id].last_changed = "hidden";
                }

                FileBrowserRenderer.createFileNode(id, folders[id]["folder_name"], folders[id]["owner"], unixepochToString(folders[id]["last_changed"]), null, folders[id]["folder_type"]);
            }); 

            Object.keys(files).forEach(id => {
                if (!Object.keys(files[id]).includes("owner")) {
                    files[id].owner = "hidden";
                    files[id].last_changed = "hidden";
                }


                FileBrowserRenderer.createFileNode(id, files[id]["file_name"], files[id]["owner"], unixepochToString(files[id]["last_changed"]), files[id]["file_size"], files[id]["file_type"]);
            }); 

            global_var.current_files = result[1];
            
            clearTimeout(show_skeleton_timout);
            FileBrowserRenderer.hideSkeletonFiles();
            
            break;
        
        case API_ERROR:
            QuickDlg.openFolderErrorDlg(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            return;
    
        default:
            break;
    }

    
    const file_owner = document.getElementsByClassName("file-fileowner");
    const file_size = document.getElementsByClassName("file-filesize");
    const file_date = document.getElementsByClassName("file-lastchanged");
    if (window.innerWidth < 1201) {

        for (let i = 0; i < file_owner.length; i++) {
            file_owner.item(i).style.display = "none";
            file_size.item(i).style.display = "none";
            file_date.item(i).style.display = "none";
        }
    } else {
        for (let i = 0; i < file_owner.length; i++) {
            file_owner.item(i).style.display = "flex";
            file_size.item(i).style.display = "flex";
            file_date.item(i).style.display = "flex";
        }
    }
}

async function loadRootFolder() {
    let result = await userAPI.get_account_properties("!null", ["root_folder_id"]);

    switch (result[0]) {
        case SUCCESS:
            global_var.current_folder = result[1].root_folder_id;
            global_var.prev_folder.push(global_var.current_folder);
            loadFolder();
            break;
        
        case API_ERROR:
            QuickDlg.openFolderErrorDlg(result[1]);
            break;

        case SERVER_ERROR:
            console.log(result[1]);
            break;
    
        default:
            break;
    
    }

}

async function uploadFile(file, name, callback) {
    if (global_var.process_is_running) { return; }
    global_var.process_is_running = true;

    const chunks_len = Math.ceil(file.size / (1024 * 1024), 1024 * 1024);

    const progress = new Progressbar("upload_progress_bar", chunks_len * 2, 0, 1);

    const chunks = await Tools.chunkFile(file, (i) => {
        progress.update_current_val(i);
        return global_var.cancel_current_process;
    });

    if (global_var.cancel_current_process) {
        global_var.cancel_current_process = false;
        showSnackbar("Upload", "Upload successfully canceled", 2000);
        return;
    }

    // Create a new file to upload to
    let result = await fileAPI.new_file(name, global_var.current_folder);

    let file_id;

    switch (result[0]) {
        case SUCCESS:
            file_id = result[1].file_id;
            break;
        
        case API_ERROR:
            callback("Chunked Upload - Stage: New File: " + result[1], null);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            callback("Chunked Upload - Stage: New File: " + result[1], null);
            return;
    
        default:
            break;
    
    }

    // init upload
    result = await uploadAPI.init_chunked_upload(file_id);

    let upload_id;

    switch (result[0]) {
        case SUCCESS:
            upload_id = result[1].upload_id;
            break;
        
        case API_ERROR:
            callback("Chunked Upload - Stage: Init Upload: " + result[1], null);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            callback("Chunked Upload - Stage: Init Upload: " + result[1], null);
            return;
    
        default:
            break;

    }

    // upload chunkes
    for (let i = 0; i < chunks.length; i++) {
        if (global_var.cancel_current_process) {
            // cancel on user input
            result = await uploadAPI.cancel_chunked_upload(upload_id);

            switch (result[0]) {
                case SUCCESS:
                    callback("cancel");
                    showSnackbar("Upload", "Upload successfully canceled", 2000);
                    break;
                
                case API_ERROR:
                    callback("Chunked Upload - Stage: Canceling Upload: " + result[1], null);
                    return;
        
                case SERVER_ERROR:
                    console.log(result[1]);
                    callback("Chunked Upload - Stage: Canceling Upload: " + result[1], null);
                    return;
            
                default:
                    break;
        
            }

            global_var.cancel_current_process=false;
            return;
        }

        const chunk = chunks[i];

        result = await uploadAPI.upload_chunk(upload_id, chunk);

        switch (result[0]) {
            case API_ERROR:
                callback("Chunked Upload - Stage: Chunk upload: " + result[1], null);
                return;
    
            case SERVER_ERROR:
                console.log(result[1]);
                callback("Chunked Upload - Stage: Chunk upload: " + result[1], null);
                return;
        
            default:
                break;
    
        }
    
        progress.update_current_val(chunks_len + i + 1);
        
    }
    
    delete progress;

    result = await uploadAPI.complete_chunked_upload(upload_id);

    switch (result[0]) {
        case SUCCESS:
            FileBrowser.registerFile(file_id);
            break;
        
        case API_ERROR:
            callback("Chunked Upload - Stage: Finish upload: " + result[1], null);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            callback("Chunked Upload - Stage: Finish upload: " + result[1], null);
            return;
    
        default:
            break;

    }

    global_var.process_is_running = false;

    result = await fileAPI.get_file_properties(file_id, ["last_changed", "file_size", "file_type"]);

    result[1].file_id = file_id;

    result[1].last_changed = unixepochToString(result[1].last_changed);

    callback("true", result[1]);
}

async function downloadFile(file_id, callback) {
    if (global_var.process_is_running) { return; }
    global_var.process_is_running = true;
    Dialog.openDlg("download-file-dlg");

    let download_canceled = await download.setDownload(global_var.current_selected_file.getElementsByClassName("file-filename")[0].innerText);
    if (download_canceled) {
        Dialog.closeDlg();
        global_var.process_is_running = false;
        return;
    }

    let download_id;
    let chunks_amount;

    let result = await downloadAPI.init_chunked_download(file_id);

    switch (result[0]) {
        case SUCCESS:
            download_id = result[1].download_id;
            chunks_amount = result[1].chunks;
            break;
        
        case API_ERROR:
            Dialog.showError("Chunked Download - Stage: Initilazing download: " + result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            Dialog.showError("Chunked Download - Stage: Initilazing download: " + result[1]);
            return;
    
        default:
            break;

    }


    const progressbar = new Progressbar("download_progress_bar", chunks_amount, 0, 1);

    for (let i = 0; i < chunks_amount; i++) {
        if (global_var.cancel_current_process) {
            result = await downloadAPI.complete_chunked_download(download_id);
            
            switch (result[0]) {
                case API_ERROR:
                    console.log(result[1]);
                    return;

                case SERVER_ERROR:
                    console.log(result[1]);
                    return;
            
                default:
                    break;

            }

            global_var.cancel_current_process = false;
            break;
        }

        result = await downloadAPI.download_chunk(download_id);

        switch (result[0]) {
            case API_ERROR:
                Dialog.showError("Chunked Download - Stage: Initilazing download: " + result[1]);
                return;
    
            case SERVER_ERROR:
                console.log(result[1]);
                Dialog.showError("Chunked Download - Stage: Initilazing download: " + result[1]);
                return;
        
            default:
                break;
    
        }

        await download.storeFileChunk(result[1]);

        progressbar.update_current_val(i + 1);
    }

    result = await downloadAPI.complete_chunked_download(download_id);

    switch (result[0]) {
        case API_ERROR:
            console.log(result[1]);
            Dialog.showError(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            Dialog.showError(result[1]);
            return;
    
        default:
            break;

    }

    setTimeout(() => {
        Dialog.closeDlg();
        document.getElementById("download_progress_bar").getElementsByClassName("progress-bar-filling")[0].style.width = "0%";
        download.showFile();
    }, 1000);

    global_var.process_is_running = false;
}

async function createFile(filename, callback) {
    const result = await fileAPI.new_file(filename, global_var.current_folder);

    switch (result[0]) {
        case SUCCESS:
            callback("true", result[1].file_id);
            break;
        
        case API_ERROR:
            callback(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            callback(result[1]);
            return;
    
        default:
            break;
    
    } 
}

function dlgCreateFile() {
    const filename = document.getElementById("create-file-name-in").value;
    const name_is_clean = document.getElementById("create-file-name-in").getAttribute("clean");

    if (name_is_clean != "true") { 
        Dialog.showError("You used illegal characters in your filename.");
        return;
    }

    createFile(filename, async (result, file_id) => {
        if (result != "true") {
            Dialog.showError(result);
            return;
        }

        const properties = await fileAPI.get_file_properties(file_id, ["file_name", "last_changed", "file_type"]);

        switch (properties[0]) {
            case SUCCESS:
                FileBrowserRenderer.createFileNode(file_id, properties[1].file_name, global_var.username, unixepochToString(properties[1].last_changed), 0, properties[1].file_type);
                FileBrowser.registerFile(file_id);
                break;
            
            case API_ERROR:
                console.log(properties[1])
                Dialog.showError(properties[1]);
                return;
    
            case SERVER_ERROR:
                console.log(properties[1]);
                Dialog.showError(properties[1]);
                return;
        
            default:
                break;
        
        }
        Dialog.closeDlg();
        
    });
}

async function createFolder(foldername, callback) {

    const result = await fileAPI.new_folder(foldername, global_var.current_folder);

    switch (result[0]) {
        case SUCCESS:
            callback("true", result[1].folder_id);
            break;
        
        case API_ERROR:
            callback(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            callback(result[1]);
            return;
    
        default:
            break;
    
    } 
}

function dlgCreateFolder() {
    const foldername = document.getElementById("create-folder-name-in").value;
    const name_is_clean = document.getElementById("create-folder-name-in").getAttribute("clean");

    if (name_is_clean != "true") { 
        Dialog.showError("You used illegal characters in your foldername.");
        return;
    } 

    createFolder(foldername, async (result, folder_id) => {
        if (result != "true") {
            Dialog.showError(result);
            return;
        } 

        const properties = await fileAPI.get_folder_properties(folder_id, ["folder_name", "last_changed", "folder_type", "owner_id"]);

        switch (properties[0]) {
            case SUCCESS:
                FileBrowserRenderer.createFileNode(folder_id, properties[1].folder_name, global_var.username, unixepochToString(properties[1].last_changed), null, properties[1].folder_type);
                FileBrowser.registerFolder(folder_id, properties[1].folder_name, properties[1].folder_type, properties[1].last_changed, properties[1].owner_id);
                break;
            
            case API_ERROR:
                console.log(properties[1])
                Dialog.showError(properties[1]);
                return;
    
            case SERVER_ERROR:
                console.log(properties[1]);
                Dialog.showError(properties[1]);
                return;
        
            default:
                break;
        
        }


        Dialog.closeDlg();
    });

}

async function deleteFolder(folder_id, callback) {
    const result = await fileAPI.removeFolder(folder_id);

    switch (result[0]) {
        case SUCCESS:
            FileBrowserRenderer.removeFileNode(global_var.current_selected_file);
            
            global_var.current_selected_file = null;
            delete global_var.current_files.folders[folder_id];

            callback("true");
            break;
        
        case API_ERROR:
            console.log(result[1])
            Dialog.showError(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            Dialog.showError(result[1]);
            return;
    
        default:
            break;
    
    }
}

function openDeleteFolderDlg() {
    filename = global_var.current_selected_file.getElementsByClassName("file-filename")[0].innerText;
    document.getElementById("delete-folder-foldername").innerText = filename;

    Dialog.openDlg("delete-folder-dlg");
}   

function dlgDeleteFolder() {
    const folder_id = global_var.current_selected_file.getAttribute("file_id");

    deleteFolder(folder_id, result => {
        if (result != "true") {
            Dialog.showError(result);
        } else {
            Dialog.closeDlg();
            showSnackbar("Info", "Folder successfully deleted.", 2000);
        }
    });
}


async function deleteFile(file_id, callback) {

    const result = await fileAPI.removeFile(file_id);

    switch (result[0]) {
        case SUCCESS:
            FileBrowserRenderer.removeFileNode(global_var.current_selected_file);

            global_var.current_selected_file = null;
            delete global_var.current_files.files[file_id];

            callback("true");
            break;
        
        case API_ERROR:
            console.log(result[1])
            Dialog.showError(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            Dialog.showError(result[1]);
            return;
    
        default:
            break;
    
    }
}

function openDeleteFileDlg() {
    filename = global_var.current_selected_file.getElementsByClassName("file-filename")[0].innerText;
    document.getElementById("delete-file-filename").innerText = filename;

    Dialog.openDlg("delete-file-dlg");
}   

function dlgDeleteFile() {
    const file_id = global_var.current_selected_file.getAttribute("file_id");

    deleteFile(file_id, result => {
        if (result != "true") {
            Dialog.showError(result);

        } else {
            Dialog.closeDlg();
            showSnackbar("Info", "File successfully deleted.", 2000);
        }
    });
}

function dlgUploadFile() {
    document.getElementById("file-upload-dlg-file-input").setAttribute("readonly", "readonly");
    document.getElementById("file-upload-dlg-new-name-in").setAttribute("readonly", "readonly");
    const file = document.getElementById("file-upload-dlg-file-input").files[0];
    const orig_name = file.name;
    const custom_name = document.getElementById("file-upload-dlg-new-name-in").value;
    let name = "";

    if (custom_name != "") {
        name = custom_name;
    } else {
        name = orig_name;
    }

    uploadFile(file, name, async (result, obj) => {
        if (result == "true") {
            FileBrowserRenderer.createFileNode(obj.file_id, name, global_var.username, obj.last_changed, obj.file_size, obj.file_type);
            setTimeout(() => {
                Dialog.closeDlg();
                document.getElementById("file-upload-dlg-file-input").removeAttribute("readonly");
                document.getElementById("file-upload-dlg-new-name-in").removeAttribute("readonly");
            }, 1000);
        } else if (result == "cancel") {
            return;
        } else {
            Dialog.showError(result);
        }
    });
}

async function logout() {
    document.getElementById("header-path-viewer-path").innerText = "";
    global_var.path_prefix.innerText = "Trying to log out...";

    const result = await sessionAPI.logout();

    switch (result[0]) {
        case SUCCESS:

            sessionStorage.removeItem("SessionId");
            sessionStorage.removeItem("Server");
            sessionStorage.removeItem("cwd");
            sessionStorage.removeItem("current_folder");
            viewport.setLogin();
        
        case API_ERROR:
            console.log(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            return;
    
        default:
            break;
    }


}

async function dlgRenameFile() {
    const new_name = document.getElementById("rename-name-in-file").value;
    const name_is_clean = document.getElementById("rename-name-in-file").getAttribute("clean");

    if (name_is_clean == "false") {
        Dialog.showError("You used illegal characters in your filename.");
        return;
    }

    const result = await fileAPI.renameFile(global_var.current_selected_file.getAttribute("file_id"), new_name);

    switch (result[0]) {
        case SUCCESS:
    
            global_var.current_selected_file.getElementsByClassName("file-filename")[0].innerText = new_name;
            global_var.current_files.files[global_var.current_selected_file.getAttribute("file_id")].file_name = new_name;
            
            const file_type = await fileAPI.get_file_properties(global_var.current_selected_file.getAttribute("file_id"), ["file_type"]);

            if (file_type[0] == SERVER_ERROR) {
                console.log(result[1]);
                return;
            }

            global_var.current_files.files[global_var.current_selected_file.getAttribute("file_id")].file_type = file_type[1];
            Dialog.closeDlg();

            break;
        
        case API_ERROR:
            console.log(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            return;
    
        default:
            break;
    }
}

async function dlgRenameFolder() {
    const new_name = document.getElementById("rename-name-in-folder").value;
    const name_is_clean = document.getElementById("rename-name-in-folder").getAttribute("clean");

    if (name_is_clean == "false") {
        Dialog.showError("You used illegal characters in your foldername.");
        return;
    }

    const result = await fileAPI.renameFolder(global_var.current_selected_file.getAttribute("file_id"), new_name);

    switch (result[0]) {
        case SUCCESS:
    
            global_var.current_selected_file.getElementsByClassName("file-filename")[0].innerText = new_name;
            global_var.current_files.folders[global_var.current_selected_file.getAttribute("file_id")].folder_name = new_name;
            Dialog.closeDlg();

            break;
        
        case API_ERROR:
            console.log(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            return;
    
        default:
            break;
    }
}


// file property manager

function setPermissionProperty(perm, field_id_list) {
    if (perm.length != 6 || field_id_list.length != 6) { return; }
    let i = 0;

    field_id_list.forEach(id => {
        const element = document.getElementById(id).getElementsByTagName("img")[0];
        if (perm.charAt(i) == "_") {
            setChecked(element, false);
        } else {
            setChecked(element, true);
        }
        i++;
    });
}

async function openFilePropertiesDlg() {
    let file_id = global_var.current_selected_file.getAttribute("file_id");

    const result = await fileAPI.get_file_properties(file_id, ["file_name", "containing_folder", "created", "last_changed", "last_opened", "file_type", "owner_id", "file_size", "description", "perm", "allowed_users", "public"])

    if (Object.keys(result[1]).includes("Error")) {
        console.log(result[1].Error);
        QuickDlg.openFolderErrorDlg(result[1].Error);
        return;
    }

    switch (result[0]) {
        
        case API_ERROR:
            console.log(result[1]);
            QuickDlg.openFolderErrorDlg(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            QuickDlg.openFolderErrorDlg(result[1]);
            return;
    
        default:
            break;
    }

    document.getElementById("file-property-viewer-file-name-input").value = result[1].file_name;
    document.getElementById("file-property-viewer-id").innerText = file_id;
    document.getElementById("file-property-viewer-containing-folder").innerText = result[1].containing_folder;
    document.getElementById("file-property-viewer-created").innerText = new Date(result[1].created).toString();
    document.getElementById("file-property-viewer-last-changed").innerText = new Date(result[1].last_changed).toString();
    document.getElementById("file-property-viewer-last-opened").innerText = new Date(result[1].last_opened * 1000).toString();
    document.getElementById("file-property-viewer-file-type").innerText = result[1].file_type;
    document.getElementById("file-property-viewer-owner").innerText = await userAPI.get_username(result[1].owner_id);
    document.getElementById("file-property-viewer-file-size").innerText = result[1].file_size + " Bytes";
    document.getElementById("file-property-viewer-file-description-input").value = result[1].description;

    if (result[1].public == "1") {
        setChecked(document.getElementById("file-property-viewer-is-public-checkbox").getElementsByTagName("img")[0], true);
    } else {
        setChecked(document.getElementById("file-property-viewer-is-public-checkbox").getElementsByTagName("img")[0], false);
    }

    setPermissionProperty(result[1].perm, ["file-property-viewer-perm-owner-read", "file-property-viewer-perm-owner-write", "file-property-viewer-perm-group-read", "file-property-viewer-perm-group-write", "file-property-viewer-perm-public-read", "file-property-viewer-perm-public-write"]);
    
    clearPropertyList(document.getElementById("file-property-viewer-allowed-users").getElementsByClassName("property-list")[0]);
    
    let allowed_user_ids = result[1].allowed_users.split(";");
    if (allowed_user_ids[0] != "") {
        allowed_user_ids.forEach(async id => {
            let username = await userAPI.get_username(id);
            let username_was_not_defined = false;

            if (username == undefined) {
                username = "Unknown User";
                username_was_not_defined = true;
            }

            let property = add_property_to_list(document.getElementById("file-property-viewer-allowed-users").getElementsByClassName("property-list")[0], username, () => {
                file_property_change("allowed_users");
            });
            property.setAttribute("user_id", id);
            if (username_was_not_defined) {
                property.style.fontStyle = "italic";
            }
        });
    }

    setTimeout(() => {
        reloadPropertyElements();
        Dialog.openDlg("file-property-viewer");
    }, 20);

}

function file_property_change(property) { 
    if (global_var.file_property_change_list.indexOf(property) == -1) {
        global_var.file_property_change_list.push(property);
    }
}

function add_allowed_file_user() {

    const username_dlg = document.getElementById("username-grep-dlg");

    username_dlg.getElementsByClassName("dlg-action-wrapper")[0].getElementsByClassName("execute-act-btn")[0].onclick = async () => {
        const property_list = document.getElementById("file-property-viewer-allowed-users").getElementsByClassName("property-list")[0];
        const user_id = document.getElementById("username-grep-id-in").value;

        if (user_id == "") {
            return;
        }
        
        
        const username = await userAPI.get_username(user_id, document.getElementById("username-grep-error"));
        
        if (username == null) {
            document.getElementById("username-grep-error").style.display = "block";
            return;
        }
        
        if (property_list_contains(property_list, username)) {
            document.getElementById("username-grep-error").innerText = "User already on the list.";
            document.getElementById("username-grep-error").style.display = "block";
            return;
        }

        const property = add_property_to_list(property_list, username, () => {});
        property.setAttribute("user_id", user_id);

        Dialog.closeDlg("username-grep-dlg");
        Dialog.openDlg("file-property-viewer");

        file_property_change("allowed_users");

        document.getElementById("username-grep-error").style.display = "none";
        document.getElementById("username-grep-id-in").value = "";

        
        reloadPropertyList(property_list);
    }

    username_dlg.getElementsByClassName("dlg-action-wrapper")[0].getElementsByClassName("cancel-act-btn")[0].onclick = () => {
        Dialog.closeDlg("username-grep-dlg");
        Dialog.openDlg("file-property-viewer");
        document.getElementById("username-grep-error").style.display = "none";
        document.getElementById("username-grep-id-in").value = "";
    }

    Dialog.closeDlg("file-property-viewer");
    Dialog.openDlg("username-grep-dlg");
}

function getAllowedUserIds(property_list) {
    let id_list = [];
    
    let users = property_list.getElementsByClassName("property-wrapper");

    for (let i = 0; i < users.length; i++) {
        const element = users[i];
        id_list.push(element.getAttribute("user_id"));


    }

    return id_list;
}

function parsePermList(list) {
    let perm_list = [];
    let pool = ["r", "w", "r", "w", "r", "w"];

    if (list.length != 6) { return; }

    for (let i = 0; i < list.length; i++) {
        if (document.getElementById(list[i]).getElementsByTagName("img")[0].getAttribute("checked") == "true") {
            perm_list.push(pool[i]);
        } else {
            perm_list.push("_");
        }
    }

    return perm_list;
}

async function setFileProperties() {
    if (global_var.file_property_change_list.length == 0) { return; }

    let value_list = []
    
    global_var.file_property_change_list.forEach(property => {
        switch (property) {
            case "name":
                let name = document.getElementById("file-property-viewer-file-name-input").value;
                global_var.current_selected_file.getElementsByClassName("file-filename")[0].innerText = name;
                global_var.current_files.files[global_var.current_selected_file.getAttribute("file_id")].file_name = name;
                value_list.push(btoa(name));
                break;
            case "description":
                let description = document.getElementById("file-property-viewer-file-description-input").value
                global_var.current_files.files[global_var.current_selected_file.getAttribute("file_id")].description = description;
                value_list.push(btoa(description));
                break;
            case "is_public":
                let is_public = (document.getElementById("file-property-viewer-is-public-checkbox").getElementsByTagName("img")[0].getAttribute("checked") == "true") ? "1" : "0";
                value_list.push(is_public);
                break;
            case "allowed_users":
                let ids = getAllowedUserIds(document.getElementById("file-property-viewer-allowed-users").getElementsByClassName("property-list")[0]);
                value_list.push(ids.toString().replaceAll(",", ";"));
                break;
            case "perm":
                let perm_list = parsePermList(["file-property-viewer-perm-owner-read", "file-property-viewer-perm-owner-write", "file-property-viewer-perm-group-read", "file-property-viewer-perm-group-write", "file-property-viewer-perm-public-read", "file-property-viewer-perm-public-write"]);
                value_list.push(perm_list.toString().replaceAll(",", ""));
                break;
            default:
                break;
        }
    });

    const result = await fileAPI.set_file_properties(global_var.current_selected_file.getAttribute("file_id"), global_var.file_property_change_list, value_list);

    switch (result[0]) {
        case SUCCESS:
            showSnackbar("Info", "Properties updated.", 2000);
            global_var.file_property_change_list = [];
            break;

        case API_ERROR:
            console.log(result[1]);
            QuickDlg.openFolderErrorDlg(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            return;
    
        default:
            break;
    }
}


// folder property manager

async function openFolderPropertiesDlg() {
    let folder_id = global_var.current_selected_file.getAttribute("file_id");

    const result = await fileAPI.get_folder_properties(folder_id, ["folder_name", "containing_folder", "created", "last_changed", "folder_type", "owner_id", "description", "allowed_users", "perm", "public"]);

    switch (result[0]) {

        case API_ERROR:
            console.log(result[1]);
            QuickDlg.openFolderErrorDlg(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            QuickDlg.openFolderErrorDlg(result[1]);
            return;
    
        default:
            break;
    }

    document.getElementById("folder-property-viewer-folder-name-input").value = result[1].folder_name;
    document.getElementById("folder-property-viewer-id").innerText = folder_id;
    document.getElementById("folder-property-viewer-containing-folder").innerText = result[1].containing_folder;
    document.getElementById("folder-property-viewer-created").innerText = new Date(result[1].created).toString();
    document.getElementById("folder-property-viewer-last-changed").innerText = new Date(result[1].last_changed).toString();
    document.getElementById("folder-property-viewer-folder-type").innerText = result[1].folder_type;
    document.getElementById("folder-property-viewer-owner").innerText = await userAPI.get_username(result[1].owner_id);
    document.getElementById("folder-property-viewer-folder-description-input").value = result[1].description;
    
    if (result[1].public == "1") {
        setChecked(document.getElementById("folder-property-viewer-is-public-checkbox").getElementsByTagName("img")[0], true);
    } else {
        setChecked(document.getElementById("folder-property-viewer-is-public-checkbox").getElementsByTagName("img")[0], false);
    }

    setPermissionProperty(result[1].perm, ["folder-property-viewer-perm-owner-read", "folder-property-viewer-perm-owner-write", "folder-property-viewer-perm-group-read", "folder-property-viewer-perm-group-write", "folder-property-viewer-perm-public-read", "folder-property-viewer-perm-public-write"]);
    
    clearPropertyList(document.getElementById("folder-property-viewer-allowed-users").getElementsByClassName("property-list")[0]);
    
    let allowed_user_ids = result[1].allowed_users.split(";");
    if (allowed_user_ids[0] != "") {
        allowed_user_ids.forEach(async id => {
            let username = await userAPI.get_username(id);
            let username_was_not_defined = false;

            if (username == undefined) {
                username = "Unknown User";
                username_was_not_defined = true;
            }

            let property = add_property_to_list(document.getElementById("folder-property-viewer-allowed-users").getElementsByClassName("property-list")[0], username, () => {
                file_property_change("allowed_users");
            });
            property.setAttribute("user_id", id);
            if (username_was_not_defined) {
                property.style.fontStyle = "italic";
            }
        });
    }

    setTimeout(() => {
        reloadPropertyElements();
        Dialog.openDlg("folder-property-viewer");
    }, 20);

}

function add_allowed_folder_user() {

    const username_dlg = document.getElementById("username-grep-dlg");

    username_dlg.getElementsByClassName("dlg-action-wrapper")[0].getElementsByClassName("execute-act-btn")[0].onclick = async () => {
        const property_list = document.getElementById("folder-property-viewer-allowed-users").getElementsByClassName("property-list")[0];
        const user_id = document.getElementById("username-grep-id-in").value;

        if (user_id == "") {
            return;
        }
        
        
        const username = await userAPI.get_username(user_id, document.getElementById("username-grep-error"));
        
        if (username == null) {
            document.getElementById("username-grep-error").innerText = "User id not known.";
            document.getElementById("username-grep-error").style.display = "block";
            return;
        }
        
        if (property_list_contains(property_list, username)) {
            document.getElementById("username-grep-error").innerText = "User already on the list.";
            document.getElementById("username-grep-error").style.display = "block";
            return;
        }

        const property = add_property_to_list(property_list, username, () => {});
        property.setAttribute("user_id", user_id);

        Dialog.closeDlg("username-grep-dlg");
        Dialog.openDlg("folder-property-viewer");

        file_property_change("allowed_users");

        document.getElementById("username-grep-error").style.display = "none";
        document.getElementById("username-grep-id-in").value = "";

        
        reloadPropertyList(property_list);
    }

    username_dlg.getElementsByClassName("dlg-action-wrapper")[0].getElementsByClassName("cancel-act-btn")[0].onclick = () => {
        Dialog.closeDlg("username-grep-dlg");
        Dialog.openDlg("folder-property-viewer");
        document.getElementById("username-grep-error").style.display = "none";
        document.getElementById("username-grep-id-in").value = "";
    }

    Dialog.closeDlg("folder-property-viewer");
    Dialog.openDlg("username-grep-dlg");
}

function getAllowedUserIds(property_list) {
    let id_list = [];
    
    let users = property_list.getElementsByClassName("property-wrapper");

    for (let i = 0; i < users.length; i++) {
        const element = users[i];
        id_list.push(element.getAttribute("user_id"));


    }

    return id_list;
}

async function setFolderProperties() {
    if (global_var.file_property_change_list.length == 0) { return; }

    let value_list = []
    
    global_var.file_property_change_list.forEach(property => {
        switch (property) {
            case "name":
                let name = document.getElementById("folder-property-viewer-folder-name-input").value;
                global_var.current_selected_file.getElementsByClassName("file-filename")[0].innerText = name;
                global_var.current_files.folders[global_var.current_selected_file.getAttribute("file_id")].folder_name = name;
                value_list.push(btoa(name));
                break;
            case "description":
                let description = document.getElementById("folder-property-viewer-folder-description-input").value;
                global_var.current_files.folders[global_var.current_selected_file.getAttribute("file_id")].description = description;
                value_list.push(btoa(description));
                break;
            case "is_public":
                let is_public = (document.getElementById("folder-property-viewer-is-public-checkbox").getElementsByTagName("img")[0].getAttribute("checked") == "true") ? "1" : "0";
                value_list.push(is_public);
                break;
            case "allowed_users":
                let ids = getAllowedUserIds(document.getElementById("folder-property-viewer-allowed-users").getElementsByClassName("property-list")[0]);
                value_list.push(ids.toString().replaceAll(",", ";"));
                break;
            case "perm":
                let perm_list = parsePermList(["folder-property-viewer-perm-owner-read", "folder-property-viewer-perm-owner-write", "folder-property-viewer-perm-group-read", "folder-property-viewer-perm-group-write", "folder-property-viewer-perm-public-read", "folder-property-viewer-perm-public-write"]);
                value_list.push(perm_list.toString().replaceAll(",", ""));
                break;
            default:
                break;
        }
    });

    const result = await fileAPI.set_folder_properties(global_var.current_selected_file.getAttribute("file_id"), global_var.file_property_change_list, value_list);

    switch (result[0]) {
        case SUCCESS:
            showSnackbar("Info", "Properties updated.", 2000);
            global_var.file_property_change_list = [];
            break;

        case API_ERROR:
            console.log(result[1]);
            QuickDlg.openFolderErrorDlg(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            return;
    
        default:
            break;
    }
}

async function dlgMoveFile() {
    const file_id = global_var.current_selected_file.getAttribute("file_id");
    const new_folder_id = document.getElementById("move-file-new-folder-id-in").value;
    let new_name = document.getElementById("move-file-new-name-in").value;

    if (new_folder_id == global_var.current_folder) {
        Dialog.showError("Can't move to same folder. Use rename instead.");
        return;
    }

    if (new_name == "") {
        new_name = "!null";
    }

    const result = await fileAPI.moveFile(file_id, new_folder_id, new_name);

    switch (result[0]) {
        case SUCCESS:
            
            FileBrowserRenderer.removeFileNode(global_var.current_selected_file);
            Dialog.closeDlg();
            document.getElementById('move-file-new-folder-id-in').value = '';
            document.getElementById('move-file-new-folder-id-in').style.display = 'block';


            const new_folder_name = await fileAPI.get_folder_properties(new_folder_id, ["folder_name"]); 

            if (new_folder_name[0] == SERVER_ERROR) {
                console.log(new_folder_name[1]);
                return;
            }

            showSnackbar("Move File", "File sucessfully moved to: " + new_folder_name[1].folder_name, 2000);

            break;

        case API_ERROR:
            console.log(result[1]);
            Dialog.showError(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            Dialog.showError(result[1]);
            return;
    
        default:
            break;
    }

}

async function dlgMoveFolder() {
    const folder_id = global_var.current_selected_file.getAttribute("file_id");
    const new_folder_id = document.getElementById("move-folder-new-folder-id-in").value;
    let new_name = document.getElementById("move-folder-new-name-in").value;

    if (new_folder_id == global_var.current_folder) {
        Dialog.showError("Can't move to same folder. Use rename instead.");
        return;
    }

    if (new_name == "") {
        new_name = "!null";
    }

    const result = await fileAPI.moveFolder(folder_id, new_folder_id, new_name);

    switch (result[0]) {
        case SUCCESS:
            FileBrowserRenderer.removeFileNode(global_var.current_selected_file);
            Dialog.closeDlg();
            document.getElementById('move-folder-new-folder-id-in').value = '';
            document.getElementById('move-folder-new-folder-id-in').style.display = 'block';

            const new_folder_name = await fileAPI.get_folder_properties(new_folder_id, ["folder_name"]);

            if (new_folder_name[0] == SERVER_ERROR) {
                console.log(new_folder_name[1]);
                return;
            }

            showSnackbar("Move File", "Folder sucessfully moved to: " + new_folder_name[1].folder_name, 2000);
            break;

        case API_ERROR:
            console.log(result[1]);
            Dialog.showError(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            Dialog.showError(result[1]);
            return;
    
        default:
            break;
    }
}

async function dlgCopyFile() {
    const file_id = global_var.current_selected_file.getAttribute("file_id");
    const new_folder_id = document.getElementById("copy-file-new-folder-id-in").value;

    if (new_folder_id == global_var.current_folder) {
        Dialog.showError("Can't copy to same folder.");
    }

    const result = await fileAPI.copyFile(file_id, new_folder_id);

    switch (result[0]) {
        case SUCCESS:
            Dialog.closeDlg();
            document.getElementById('copy-file-new-folder-id-in').value = '';
            document.getElementById('copy-file-new-folder-id-in').style.display = 'block';

            const new_folder_name = await fileAPI.get_folder_properties(new_folder_id, ["folder_name"]);

            if (new_folder_name[0] == SERVER_ERROR) {
                console.log(new_folder_name[1]);
                return;
            }

            showSnackbar("Copy File", "File sucessfully moved to: " + new_folder_name[1].folder_name, 2000);
            break;

        case API_ERROR:
            console.log(result[1]);
            Dialog.showError(result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            Dialog.showError(result[1]);
            return;
    
        default:
            break;
        }
}