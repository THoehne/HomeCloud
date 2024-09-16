debug_mode = false;

class Globales {
    current_dlg = null;
    current_row = null;
    user_change_list = []
} 

const global_var = new Globales;

// HOMECLOUD API Lib
const session_id = sessionStorage.getItem("SessionId");

const adminAPI = new AdminAPI(sessionStorage.getItem("Server"), session_id);
const userAPI  = new UserAPI(sessionStorage.getItem("Server"), session_id);
const fileAPI  = new FileAPI(sessionStorage.getItem("Server"), session_id);

delete session_id;
// END HOMECLOUD API CONSTANTS

class ContextMenu {

    static getContextMenu(target) {
        if (target.nodeName == "INPUT" || target.type == "text") {
            document.getElementById("input-context-menu").input_dom = target;
            return document.getElementById("input-context-menu");
        } else if (target.id == "viewport") {
            return document.getElementById("general-context-menu");
        } else if (target.classList.contains("user")) {
            global_var.current_row = target.parentElement;
            return document.getElementById("user-context-menu");
        } else if (target.classList.contains("group")) {
            global_var.current_row = target.parentElement;
            return document.getElementById("group-context-menu");
        }
        return null;
    }
    
    static closeContextMenu() {
        if (global_var.open_context_menu != null) {
            global_var.open_context_menu.style.display = "none";
        }

        global_var.open_context_menu = null; 
    }
    
} // ContextMenu

function add_to_change_list(s) {
    if (global_var.user_change_list.indexOf(s) == -1) {
        global_var.user_change_list.push(s);
    }
}

function closeDlg() {
    
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

function openDlg(id) {
    const dlg = document.getElementById(id);
    dlg.style.display = "flex";
    global_var.current_dlg = dlg;
    document.getElementById("dlg-blocking-overlay").style.display = "block";
}

function openErrorDlg(msg) {
    document.getElementById("dlg-blocking-overlay").style.display ="block";
    const dlg = document.getElementById("error-dlg");
    document.getElementById("error-description").innerText = msg;
    dlg.style.display = "flex";
    global_var.current_dlg = dlg;
}

function createTableRow(items, custom_class) {
    const row = document.createElement("div");
    row.classList.add("table-row");

    for (let i = 0; i < items.length; i++) {
        const element = items[i];
        const cell = document.createElement("p");
        cell.innerText = element;
        cell.classList.add(custom_class);
        
        row.appendChild(cell);
    }

    return row;
}

async function loadUser() {
    const account_ids = await adminAPI.get_accounts();

    
    switch (account_ids[0]) {
        case SUCCESS:
            
            break;
            
            case API_ERROR:
                openErrorDlg(account_ids[1]);
            console.log(account_ids[1]);
            return;
            
            case SERVER_ERROR:
            console.log(account_ids[1])
            return;
            
        default:
            return;
    }
    
    const user_table = document.getElementById("viewport");
    
    for (let i = 0; i < account_ids[1].ids.length; i++) {
        const element = account_ids[1].ids[i];

        const user_properties = await userAPI.get_account_properties(element, ["username", "group_id", "root_folder_id"]);

        const group_name = await userAPI.get_group_properties(user_properties[1].group_id, ["group_name"]);

        const root_folder_name = await fileAPI.get_folder_properties(user_properties[1].root_folder_id, ['folder_name']);

        switch (user_properties[0]) {
            case SUCCESS:
                const table_row = createTableRow([user_properties[1].username, group_name[1].group_name, root_folder_name[1].folder_name], "user");
                table_row.setAttribute("user_id", element);
                user_table.appendChild(table_row);
                

                break;
            
            case API_ERROR:
                console.log(user_properties[1]);
                return;
    
            case SERVER_ERROR:
                console.log(user_properties[1])
                return;
        
            default:
                return;
        }

        
    }
}   

function add_user_add_group_id() {
    
    const property_list = document.getElementById("add-user-groupname-list")
    const groupname_dlg = document.getElementById("groupname-grep-dlg");
    const input = document.getElementById("groupname-grep-id-in");
    const error_out = document.getElementById("groupname-grep-error");

    document.getElementById("groupname-grep-dlg").style.display = "flex";
    document.getElementById("add-user-dlg").style.visibility = "hidden";

    groupname_dlg.getElementsByClassName("dlg-action-wrapper")[0].getElementsByClassName("execute-act-btn")[0].onclick = async () => {

        const group_name = await userAPI.get_group_properties(input.value, ["group_name"]);

        switch (group_name[0]) {
            case SUCCESS:
    
                const property = add_property_to_list(property_list, group_name[1].group_name, () => {
                    property_list.getElementsByClassName("property-add-to-list")[0].style.display = "flex";
                });
                
                property.setAttribute("value", input.value);

                reloadPropertyList(property_list);
                
                break;
            
            case API_ERROR:
                error_out.innerText = group_name[1];
                error_out.style.display = "block";
                console.log(group_name[1]);
                return;
    
            case SERVER_ERROR:
                console.log(group_name[1])
                return;
        
            default:
                return;
        }

        document.getElementById("groupname-grep-dlg").style.display = "none";
        input.value = "";

        property_list.getElementsByClassName("property-add-to-list")[0].style.display = "none";

        document.getElementById("add-user-dlg").style.visibility = "visible";
    }

}

async function dlgAddUser() {
    const username = document.getElementById("add-user-name-input").value;
    let group_id = null;
    try {
        group_id = document.getElementById("add-user-groupname-list").getElementsByClassName("property-wrapper")[0].getAttribute("value");
    } catch (error) {
        console.log(error)
        showSnackbar("Add user", "User has to be part of a group.", 3000);
        return;
    }

    if (username == undefined) {
        showSnackbar("Add user", "User has to have a name.", 3000);
        return;
    }

    const result = await adminAPI.create_account(username, group_id);

    switch (result[0]) {
        case SUCCESS:
            showSnackbar("Add user", "User \"" + username + "\" successfully added.", 3000);

            const user_properties = await userAPI.get_account_properties(result[1].user_id, ["username", "group_id", "root_folder_id"]);
            const group_name = await userAPI.get_group_properties(group_id, ["group_name"]);
            const root_folder_name = await fileAPI.get_folder_properties(user_properties[1].root_folder_id, ['folder_name']);
            const user_table = document.getElementById("viewport");
            const table_row = createTableRow([username, group_name[1].group_name, root_folder_name[1].folder_name], "user");
            table_row.setAttribute("user_id", result[1].user_id);
            user_table.appendChild(table_row);
            
            break;
        
        case API_ERROR:
            showSnackbar("Add user error", result[1], 3000);
            console.log(result[1]);
            return;

        case SERVER_ERROR:
            showSnackbar("Add user error", result[1], 3000);
            console.log(result[1])
            return;
    
        default:
            return;
    }
}

function removeUser() {
    const accept_dlg = document.getElementById("accept-dlg");
    document.getElementById("accept-description").innerText = "Do you really want to delete this user. Deleting a user will remove all it's files."
    openDlg("accept-dlg");

    accept_dlg.getElementsByClassName("dlg-action-wrapper")[0].getElementsByClassName("execute-act-btn")[0].onclick = async () => {
        const result = await adminAPI.delete_account(global_var.current_row.getAttribute("user_id"));

        switch (result[0]) {
            case SUCCESS:
                showSnackbar("Remove user", "User successfully removed.", 3000);
    
                delete global_var.current_row.remove();

                closeDlg();
                
                break;
            
            case API_ERROR:
                showSnackbar("Remove user error", result[1], 3000);
                console.log(result[1]);
                return;
    
            case SERVER_ERROR:
                showSnackbar("Remove user error", result[1], 3000);
                console.log(result[1])
                return;
        
            default:
                return;
        }
    }
}

async function dlgLoadSetUserProperties() {
    clearPropertyList(document.getElementById("set-user-properties-group-id-list"));

    const user = await userAPI.get_account_properties(global_var.current_row.getAttribute("user_id"), ["username", "group_id"]);

    document.getElementById("set-user-properties-name-input").value = user[1].username;

    const group_name = await userAPI.get_group_properties(user[1].group_id, ["group_name"]);

    const property = add_property_to_list(document.getElementById("set-user-properties-group-id-list"), group_name[1].group_name, () => {
        add_to_change_list("user_group");
        document.getElementById("set-user-properties-group-id-list").getElementsByClassName("property-add-to-list")[0].style.display = "flex";
    });

    property.setAttribute("value", user[1].group_id);

    reloadPropertyList(document.getElementById("set-user-properties-group-id-list"));

    document.getElementById("set-user-properties-group-id-list").getElementsByClassName("property-add-to-list")[0].style.display = "none";

    openDlg("set-user-properties-dlg");
}

function set_user_properties_set_group() {
    const property_list = document.getElementById("set-user-properties-group-id-list")
    const groupname_dlg = document.getElementById("groupname-grep-dlg");
    const input = document.getElementById("groupname-grep-id-in");
    const error_out = document.getElementById("groupname-grep-error");

    document.getElementById("groupname-grep-dlg").style.display = "flex";
    document.getElementById("set-user-properties-dlg").style.visibility = "hidden";

    groupname_dlg.getElementsByClassName("dlg-action-wrapper")[0].getElementsByClassName("execute-act-btn")[0].onclick = async () => {

        const group_name = await userAPI.get_group_properties(input.value, ["group_name"]);

        switch (group_name[0]) {
            case SUCCESS:
    
                const property = add_property_to_list(property_list, group_name[1].group_name, () => {
                    property_list.getElementsByClassName("property-add-to-list")[0].style.display = "flex";
                });
                
                property.setAttribute("value", input.value);

                reloadPropertyList(property_list);
                
                break;
            
            case API_ERROR:
                error_out.innerText = group_name[1];
                error_out.style.display = "block";
                console.log(group_name[1]);
                return;
    
            case SERVER_ERROR:
                console.log(group_name[1])
                return;
        
            default:
                return;
        }

        document.getElementById("groupname-grep-dlg").style.display = "none";
        input.value = "";

        property_list.getElementsByClassName("property-add-to-list")[0].style.display = "none";

        document.getElementById("set-user-properties-dlg").style.visibility = "visible";
    }

    groupname_dlg.getElementsByClassName("dlg-action-wrapper")[0].getElementsByClassName("cancel-act-btn")[0].onclick = () => {
        document.getElementById("groupname-grep-dlg").style.display = "none";
        document.getElementById("set-user-properties-dlg").style.visibility = "visible";
    }
}

async function dlgSetUserProperties() {
    const username = document.getElementById("set-user-properties-name-input").value;
    const password = document.getElementById("set-user-properties-password-input").value;
    const group_id = document.getElementById("set-user-properties-group-id-list").getElementsByClassName("property-wrapper")[0].getAttribute("value");

    let value_list = []

    global_var.user_change_list.forEach(property => {
        switch (property) {
            case "username":
                value_list.push(username);
                break;

            case "password":
                value_list.push(btoa(password))

            case "user_group":
                value_list.push(group_id);
        
            default:
                break;
        }
    });

    const result = await adminAPI.set_account_properties(global_var.current_row.getAttribute("user_id"),global_var.user_change_list, value_list);

    switch (result[0]) {
        case SUCCESS:
            showSnackbar("Set user properties", "Properties successfully changed", 3000);
            global_var.user_change_list = [];
            break;
        
        case API_ERROR:
            showSnackbar("Set user properties error", result[1], 3000);
            console.log(result[1]);
            return;

        case SERVER_ERROR:
            showSnackbar("Set user properties error", result[1], 3000);
            console.log(result[1])
            return;
    
        default:
            return;
    }

    let user_id = global_var.current_row.getAttribute("user_id");
    global_var.current_row.remove();
    
    const user_properties = await userAPI.get_account_properties(user_id, ["username", "group_id", "root_folder_id"]);
    const group_name = await userAPI.get_group_properties(group_id, ["group_name"]);
    const root_folder_name = await fileAPI.get_folder_properties(user_properties[1].root_folder_id, ['folder_name']);
    const user_table = document.getElementById("viewport");
    const table_row = createTableRow([username, group_name[1].group_name, root_folder_name[1].folder_name], "user");
    table_row.setAttribute("user_id", user_id);
    user_table.appendChild(table_row);
}












async function loadGroup(params) {
    const group_ids = await adminAPI.get_groups();

    
    switch (group_ids[0]) {
        case SUCCESS:
            
            break;
            
        case API_ERROR:
            openErrorDlg(group_ids[1]);
            console.log(group_ids[1]);
            return;
        
        case SERVER_ERROR:
            console.log(group_ids[1])
            return;
            
        default:
            return;
    }
    
    const group_table = document.getElementById("viewport");
    
    for (let i = 0; i < group_ids[1].ids.length; i++) {
        const element = group_ids[1].ids[i];

        const group_properties = await userAPI.get_group_properties(element, ["group_name", "is_admin"]);

        switch (group_properties[0]) {
            case SUCCESS:
                const table_row = createTableRow([group_properties[1].group_name, group_properties[1].is_admin], "group");
                table_row.setAttribute("group_id", element);
                group_table.appendChild(table_row);
                

                break;
            
            case API_ERROR:
                console.log(group_properties[1]);
                return;
    
            case SERVER_ERROR:
                console.log(group_properties[1])
                return;
        
            default:
                return;
        }

        
    }
}





function showGroups() {
    let rows = document.getElementById("viewport").getElementsByClassName("table-row");

    for (let i = 0; i <= rows.length + 1; i++) {
        document.getElementById("viewport").removeChild(document.getElementById("viewport").lastChild)
    }

    document.getElementById("user-th").style.display = "none";
    document.getElementById("group-th").style.display = "flex";

    document.getElementById("notpad-select").getElementsByTagName("p")[0].classList.remove("active");
    document.getElementById("notpad-select").getElementsByTagName("p")[1].classList.add("active");

    loadGroup();
}

function showUsers() {
    let rows = document.getElementById("viewport").getElementsByClassName("table-row");

    for (let i = 0; i <= rows.length + 1; i++) {
        document.getElementById("viewport").removeChild(document.getElementById("viewport").lastChild)
    }

    document.getElementById("user-th").style.display = "flex";
    document.getElementById("group-th").style.display = "none";

    document.getElementById("notpad-select").getElementsByTagName("p")[0].classList.add("active");
    document.getElementById("notpad-select").getElementsByTagName("p")[1].classList.remove("active");

    loadUser();
}


function setup() {
    loadUser();

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

    document.addEventListener("click", function (e) {
        ContextMenu.closeContextMenu();
    });
}