let lock_id = "";
let current_dlg; 

const fileAPI = new FileAPI(sessionStorage.getItem("Server"), sessionStorage.getItem("SessionId"))

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

function saveFile() {
    const file_id = sessionStorage.getItem("file_id_to_open");
    const file_content = document.getElementById("filecontent-input").value;
    const file_name = document.getElementById("filename-input").value;
    const arg_name = btoa(file_name)

    if (!checkFileName(document.getElementById("filename-input"))) {
        return;
    }

    const content_data = {data:btoa(file_content)}

    fetch(sessionStorage.getItem("Server") + "api/save_file", {
        method:"POST",
        headers: {
            "HomeCloud-API-Args":file_id + " " + arg_name,
            "SessionId":sessionStorage.getItem("SessionId"),
            "Content-Type":"application/json",
        },
        body: JSON.stringify(content_data),
    })
    .then(response => response.json())
    .then(response => {
        if (Object.keys(response).includes("Error")) {
            
            document.getElementById("file-save-error-description").innerText = response.Error;
            openDlg("file-save-error-dlg");

            console.log(response.Error);
            document.getElementById("save-file-btn").style.backgroundColor = "red";
            setTimeout(() => {
                document.getElementById("save-file-btn").style.backgroundColor = "inherit";
            }, 500);
        } else {
            document.getElementById("save-file-btn").style.backgroundColor = "green";
            setTimeout(() => {
                document.getElementById("save-file-btn").style.backgroundColor = "inherit";
            }, 500);
        }
    })
}

function openErrorDlg(msg) {
    document.getElementById("dlg-blocking-overlay").style.display ="block";
    const dlg = document.getElementById("file-open-error-dlg");
    const msg_output = document.getElementById("file-open-error-description").innerText = msg;
    dlg.style.display = "flex";
}

async function get_file(file_id) {
    const result = await fileAPI.getFile(file_id);
    
    switch (result[0]) {
        case SUCCESS:
    
            document.getElementsByTagName("title")[0].innerText = "HomeCloud - " + result[1].file_name;
            document.getElementById("filename-input").value = result[1].file_name;
            document.getElementById("filecontent-input").value = atob(result[1].content);
            
            break;
        
        case API_ERROR:
            openErrorDlg(result[1]);
            console.log("Error loading file: " + result[1]);
            return;

        case SERVER_ERROR:
            console.log(result[1]);
            return;
    
        default:
            break;
    }
}

function setup() {
    document.getElementById("font-size-input").addEventListener("input-change", function () {
        fontSizeChange(this.getElementsByClassName("number-input-value").item(0));
    })

    document.getElementById("text-wrap-toggle").addEventListener("button-toggle", function () {
        if (this.getAttribute("on") == "true") {
            document.getElementById("filecontent-input").setAttribute("wrap", "soft");
            this.innerText = "Textwrap: on";
        } else {
            document.getElementById("filecontent-input").setAttribute("wrap", "off");
            this.innerText = "Textwrap: off";
        }
    }); 

    url_param = new URLSearchParams(window.location.search);

    get_file(sessionStorage.getItem("file_id_to_open"));
    console.log("Trying to open file.");
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