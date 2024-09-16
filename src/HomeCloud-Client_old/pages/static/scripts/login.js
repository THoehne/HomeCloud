function setLoading() {
    document.getElementById("login-field-footer-continue-btn").getElementsByTagName("span")[0].classList.add("hidden");
    document.getElementById("login-field-footer-continue-btn").getElementsByTagName("img")[0].classList.add("shown");
}

function unsetLoading() {
    document.getElementById("login-field-footer-continue-btn").getElementsByTagName("span")[0].classList.remove("hidden");
    document.getElementById("login-field-footer-continue-btn").getElementsByTagName("span")[0].innerText = "Retry"
    document.getElementById("login-field-footer-continue-btn").getElementsByTagName("img")[0].classList.remove("shown");
}

async function login(evt) {
    setLoading();

    const form_data = new FormData();
    const username = document.getElementById("username-in").value;
    const passwd = document.getElementById("password-in").value;
    const server = document.getElementById("server-domain-in").value;

    form_data.append("username", username);
    form_data.append("password", passwd);

    if (!server.endsWith("/")) {
        server += "/";
    }
    
    await content_policy.setServer(server);

    fetch(server + "session/login", {
        method:"POST",
        body:form_data,
    })
    .then(response => response.json())
    .then(obj => {
        if (Object.keys(obj).includes("error")) {
            unsetLoading();
            document.getElementById("login-field-content-pane-login-error").innerText = obj.error;
            document.getElementById("login-field-content-pane-login-error").style.display = "flex";
        } else {
            console.log(obj.result.msg);
            sessionStorage.setItem("SessionId", obj.result.session_id);
            sessionStorage.setItem("Server", server);
            
            let remember = document.getElementById("remember-me-checkbox-wrapper").getElementsByTagName("img")[0].getAttribute("checked");

            if (remember == "true") {
                localStorage.setItem("Server", server);
                localStorage.setItem("username", username);
                localStorage.setItem("password", passwd);
            } else {
                localStorage.removeItem("Server");
                localStorage.removeItem("username");
                localStorage.removeItem("password");
            }


            viewport.setDrive();
        }
    })
    .catch(error => {
        unsetLoading();
        document.getElementById("login-field-content-pane-login-error").innerText = "Connection to server could not be established.";
        document.getElementById("login-field-content-pane-login-error").style.display = "flex";
    });
}

function tryContinue() {
    const username = document.getElementById("username-in").value;
    const passwd = document.getElementById("password-in").value;
    const server = document.getElementById("server-domain-in").value;
    let _continue = true;
    
    if (username == "") {
        document.getElementById("username-in").style.borderBottom = "1px solid red";
        _continue = false;
    } 

    if (passwd == "") {
        document.getElementById("password-in").style.borderBottom = "1px solid red";
        _continue = false;
        
    } 
    
    if (server == "") {
        document.getElementById("server-domain-in").style.borderBottom = "1px solid red";
        _continue = false;
    } 
    
}

document.getElementById("username-in").addEventListener("input", (evt) => {evt.target.style.borderBottom = "1px solid white";});
document.getElementById("password-in").addEventListener("input", (evt) => {evt.target.style.borderBottom = "1px solid white"});
document.getElementById("server-domain-in").addEventListener("input", (evt) => {evt.target.style.borderBottom = "1px solid white"});

document.getElementById("username-in").addEventListener("input", tryContinue);
document.getElementById("password-in").addEventListener("input", tryContinue);
document.getElementById("server-domain-in").addEventListener("input", tryContinue);

document.getElementById("login-field-footer-continue-btn").addEventListener("click", login);

if (localStorage.getItem("Server") != null) {
    document.getElementById("server-domain-in").value = localStorage.getItem("Server");
}

if (localStorage.getItem("Server") != null) {
    document.getElementById("username-in").value = localStorage.getItem("username");
    document.getElementById("password-in").value = localStorage.getItem("password");
    document.getElementById("server-domain-in").value = localStorage.getItem("Server");
    toggleCheck(document.getElementById("remember-me-checkbox-wrapper").getElementsByTagName("img")[0]);
}