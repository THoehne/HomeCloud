const inputchange = new Event("input-change");
const button_toggle = new Event("button-toggle");
const button_press = new Event("button-press");

window.addEventListener("mouseup", (e) => {
    if (e.button === 3 || e.button === 4)
       e.preventDefault();
 });

function changeNumberInputValue(el, step) {
    const currentValue = parseInt(el.getElementsByClassName("number-input-value")[0].textContent);

    if (currentValue + step > parseInt(el.getAttribute("max")) || currentValue + step < parseInt(el.getAttribute("min"))) {
        return;
    }

    el.getElementsByClassName("number-input-value")[0].textContent = String(currentValue + step);
}

function loadNumberInput(el) {
    const minus = document.createElement("div");
    minus.classList.add("number-input-minus");
    minus.classList.add("no-highlight");
    minus.innerText = "-";
    minus.onclick = function() {
        changeNumberInputValue(el, -1);
        el.dispatchEvent(inputchange);
    };


    const value = document.createElement("span");
    value.classList.add("number-input-value");
    value.setAttribute("contenteditable", "true");
    value.innerText = el.getAttribute("default");
    value.oninput = function () {
        el.dispatchEvent(inputchange)
    }

    const plus = document.createElement("div");
    plus.classList.add("number-input-plus")
    plus.classList.add("no-highlight");
    plus.innerText = "+";
    plus.onclick = function () {
        changeNumberInputValue(el, 1);
        el.dispatchEvent(inputchange);
    }

    el.appendChild(minus);
    el.appendChild(value);
    el.appendChild(plus);
}

function toggle_toggle_button_color(button) {
    if (button.getAttribute("on") == "true") {
        button.setAttribute("on", "false");
        button.style.backgroundColor = "inherit";
    } else { 
        button.setAttribute("on", "true");
        button.style.backgroundColor = "black";
    }
}

function loadToggleButtons(el) {
    if (el.getAttribute("on") === "true") {
        el.style.backgroundColor = "black";
    }

    el.onclick = function () {
        toggle_toggle_button_color(this);
        this.dispatchEvent(button_toggle);
    }
}

function generalSetup() {
    const number_inputs = document.getElementsByClassName("number-input");

    for (let i = 0; i < number_inputs.length; i++) {
        const element = number_inputs.item(i);
        loadNumberInput(element)
    }

    const toggle_buttons = document.getElementsByClassName("toggle-button");

    for (let i = 0; i < toggle_buttons.length; i++) {
        const element = toggle_buttons.item(i);
        loadToggleButtons(element);
    }

    reloadPropertyElements();
}

function showSnackbar(title, text, time_ms) {
    const snackbar = document.getElementById("snackbar");
    snackbar.getElementsByTagName("header")[0].innerText = title;
    snackbar.getElementsByClassName("snackbar-text")[0].innerText = text;

    snackbar.classList.add("open");

    setTimeout(() => {
        snackbar.classList.remove("open");
    }, time_ms);
}

function reloadPropertyElements() {
    let property_wrapper = document.getElementsByClassName("property-wrapper");

    for (let i = 0; i < property_wrapper.length; i++) {
        const element = property_wrapper.item(i);
        element.setAttribute("mouse_over", "false");
        element.addEventListener("mouseover", () => {
            if (element.getAttribute("mouse_over") == "true") {
                return;
            }
            let img = document.createElement("img");
            img.style.position = "relative";
            img.src = "static/img/close.png"; 
            img.width = "12";
            img.height = "12";
            img.style.paddingRight = "3px";
            img.style.paddingLeft = "5px";
            img.addEventListener("click", () => {
                element.parentElement.removeChild(element);
                element.dispatchEvent(button_press);
            });
            
            img.addEventListener("mouseover", () => {
                img.src = "static/img/close_red.png"; 
            });

            img.addEventListener("mouseleave", () => {
                img.src = "static/img/close.png"; 
            });

            element.appendChild(img);
            element.setAttribute("mouse_over", "true");
        });

        element.addEventListener("mouseleave", (evt) => {
            if (element.getAttribute("mouse_over") == "false") {
                return;
            }

            element.style.backgroundColor = 'rgba(1,1,1,0)';
            element.style.color = "white";
            element.removeChild(element.getElementsByTagName("img")[0]);
            element.setAttribute("mouse_over", "false");
        });
    }
}

function reloadPropertyList(list) {
    let property_wrappers = list.getElementsByClassName("property-wrapper");

    for (let i = 0; i < property_wrappers.length; i++) {
        const element = property_wrappers.item(i);
        element.setAttribute("mouse_over", "false");
        element.addEventListener("mouseover", () => {
            if (element.getAttribute("mouse_over") == "true") {
                return;
            }
            let img = document.createElement("img");
            img.style.position = "relative";
            img.src = "static/img/close.png"; 
            img.width = "12";
            img.height = "12";
            img.style.paddingRight = "3px";
            img.style.paddingLeft = "5px";
            img.addEventListener("click", () => {
                element.parentElement.removeChild(element);
                element.dispatchEvent(button_press);
            });
            
            img.addEventListener("mouseover", () => {
                img.src = "static/img/close_red.png"; 
            });

            img.addEventListener("mouseleave", () => {
                img.src = "static/img/close.png"; 
            });

            element.appendChild(img);
            element.setAttribute("mouse_over", "true");
        });

        element.addEventListener("mouseleave", (evt) => {
            if (element.getAttribute("mouse_over") == "false") {
                return;
            }

            element.style.backgroundColor = 'rgba(1,1,1,0)';
            element.style.color = "white";
            element.removeChild(element.getElementsByTagName("img")[0]);
            element.setAttribute("mouse_over", "false");
        });
    }
}

function clearPropertyList(list) {
    const btn = document.createElement("div");
    const img = document.createElement("img");

    var properties = list.querySelectorAll(".property-wrapper");

    properties.forEach(property => {
        list.removeChild(property);
    });
}

function toggleCheck(target) {
    if (target.getAttribute("checked") == "false") {
        target.setAttribute("checked", "true");
        target.src = "static/img/check.png";
    } else {
        target.setAttribute("checked", "false");
        target.src = "";
    }
}

function setChecked(target, value) {
    if (value) {
        target.setAttribute("checked", "true");
        target.src = "static/img/check.png";
    } else {
        target.setAttribute("checked", "false");
        target.src = "";
    }
}

function add_property_to_list(list, text, remove_callback) {
    const property = document.createElement("div");
    property.classList.add("property-wrapper");
    property.classList.add("no-highlight");

    property.innerText = text;
    property.setAttribute("value", text);

    property.addEventListener("button-press", () => {
        remove_callback();
    });

    list.appendChild(property);

    return property;
}

function property_list_contains(property_list, value) {
    const properties = property_list.getElementsByClassName("property-wrapper");

    for (let i = 0; i < properties.length; i++) {
        const element = properties[i];
        if (element.getAttribute("value") == value) {
            return true;
        }
    }

    return false;
}

function cutTextFromInput(input) {
    const start_pos = input.selectionStart;
    const end_pos = input.selectionEnd;
    const text = input.value;

    const to_copy = text.substring(start_pos, end_pos);
    const new_text = text.substring(0, start_pos) + text.substring(end_pos, text.length);

    navigator.clipboard.writeText(to_copy);
    input.value = new_text;
}

function deleteTextFromInput(input) {
    const start_pos = input.selectionStart;
    const end_pos = input.selectionEnd;
    const text = input.value;

    const new_text = text.substring(0, start_pos) + text.substring(end_pos, text.length);

    input.value = new_text;
}

async function pasteTextFromClipboard(input) {
    const paste_text = await navigator.clipboard.readText();

    const cursor_pos = input.selectionStart;
    const text = input.value;
    
    const new_text =  text.substring(0,cursor_pos) + paste_text + text.substring(cursor_pos, text.length);

    input.value = new_text;
}

function inputToggleSpellcheck(input) {
    if (input.spellcheck == true) {
        input.setAttribute("spellcheck", "false");
    } else {
        input.setAttribute("spellcheck", "true");
    }
}

function unixepochToString(unixepoch_timestap) {
    let date = new Date(unixepoch_timestap * 1000);

    return date.toDateString();
}