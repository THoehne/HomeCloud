let lock_id = "";
let current_dlg;
let default_width = 0;
let default_height = 0;

function changeFileTitle(input) {
    document.getElementsByTagName("title")[0].innerHTML = "HomeCloud - " + input.value;
}

function alertInput(input) {
    input.style.borderBottom = "2px solid red";
}

function unalertInput(input) {
    input.style.borderBottom = "2px solid white";
}

function openDlg(id) {
    const dlg = document.getElementById(id);
    dlg.style.display = "flex";
    current_dlg = dlg;
    document.getElementById("dlg-blocking-overlay").style.display = "block";
}

function closeDlg() {
    current_dlg.style.display = "none";
    console.log(current_dlg);
    current_dlg = null;
    document.getElementById("dlg-blocking-overlay").style.display = "none";
}

function checkFileName(input) {
    let found = false
    const illegal_char = ["/", "\\", ":", "<", ">", "|", "*", '"', "?", "@", "=", "&"];
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
        alertInput(input);
        return false;
    }
    else { 
        unalertInput(input);
        return true;
    }
}

function fontSizeChange(number) {
    if (parseInt(number.innerText) > 40) {
        number.innerText = "40";
    } else if (parseInt(number.innerText) < 1) {
        number.innerText = "1";
    }

    try {
        document.getElementById("filecontent-input").style.fontSize = number.innerText + "pt";
    } catch (error) {}
}

function openErrorDlg(msg) {
    document.getElementById("dlg-blocking-overlay").style.display ="block";
    const dlg = document.getElementById("file-open-error-dlg");
    const msg_output = document.getElementById("file-open-error-description").innerText = msg;
    dlg.style.display = "flex";
}

function get_file(file_id) {
    fetch(sessionStorage.getItem("Server") + "api/get_file", {
        headers: {
            "SessionId":sessionStorage.getItem("SessionId"),
            "HomeCloud-API-Args":file_id,
        }
    })
    .then(response => response.json())
    .then(obj => {

        let obj_json = JSON.parse(obj);

        if (Object.keys(obj_json).includes("error")) {
            if (obj.error == "get_file is not allowed with files larger than one (1) MiB") {
                openErrorDlg("File is to large to be edited on the fly.");
            } else {
                openErrorDlg(obj_json.error);
            }
            console.log(obj_json.error);
            return;
        }

        document.getElementsByTagName("title")[0].innerText = "HomeCloud - " + obj_json.result.file_name;

        let img = document.getElementById("image-viewport");
        img.style.visibility = "hidden";
        img.src = "data:image/jpg;base64," + obj_json.result.content;

        img.onload = () => {
            let v_height = document.getElementById("viewport-body").offsetHeight - 20;
            let v_width = document.getElementById("viewport-body").offsetWidth - 20;
    
            if (img.height > img.width) {
                img.height = v_height * 0.9;
                if (img.width > v_width) {
                        img.removeAttribute("height");
                        img.width = v_width * 0.9;
                    }
            } else {
                img.width = v_width * 0.9;
                if (img.height > v_height * 0.9) {
                    img.removeAttribute("width");
                    img.height = v_height * 0.9;
                }
            }
            img.style.visibility = "visible";
        }
        
    });
}

function setup() {
    url_param = new URLSearchParams(window.location.search);

    get_file(sessionStorage.getItem("file_id_to_open"));
    console.log("Trying to open file.");

    window.addEventListener("resize", () => {
        let img = document.getElementById("image-viewport");
        let v_height = document.getElementById("viewport-body").offsetHeight - 20;
        let v_width = document.getElementById("viewport-body").offsetWidth - 20;

        if (img.height > img.width) {
            img.removeAttribute("width");
            img.height = v_height * 0.9;
            if (img.width > v_width) {
                    img.removeAttribute("height");
                    img.width = v_width * 0.9;
                }
        } else {
            img.removeAttribute("height");
            img.width = v_width * 0.9;
            if (img.height > v_height * 0.9) {
                img.removeAttribute("width");
                img.height = v_height * 0.9;
            }
        }
    });
}

function updateContent() {
    url_param = new URLSearchParams(window.location.search);
    get_file(sessionStorage.getItem("file_id_to_open"));
}

function closeTextEditor() {
    window.close();
}

window.addEventListener("keydown", (evt) => {
    if (evt.ctrlKey && evt.key == "s") {
        saveFile();
    }
})