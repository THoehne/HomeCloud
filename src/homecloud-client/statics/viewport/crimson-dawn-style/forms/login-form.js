const form_sheet = new CSSStyleSheet();
const theme = new CSSStyleSheet();

let sheet_s = await stylesheets.loadCrimsonDawnStyle("form:login-form");
form_sheet.replaceSync(sheet_s);

sheet_s = await stylesheets.loadCrimsonDawnStyle("themes:current");
theme.replaceSync(sheet_s);

class LoginForm extends HTMLElement {
    static observedAttributes = ["allow-login", "greeting"];

    constructor () {
        super();
        this._internals = this.attachInternals();

        this.shadow = this.attachShadow({mode:"closed"});
        
        const wrapper = document.createElement("div");
        wrapper.id = "master-wrapper";

        this.shadow.appendChild(wrapper);

        this.header = document.createElement("h1");
        this.input_wrapper = document.createElement("div");
        this.login_btn = this._createLoginBtn();

        for (let i = 0; i < 3; i++) {
            this.input_wrapper.appendChild(this.children[0]);
        }
        

        wrapper.appendChild(this.header);
        wrapper.appendChild(this.input_wrapper);
        wrapper.appendChild(this.login_btn);
        this.shadow.adoptedStyleSheets = [theme, form_sheet];
    }

    connectedCallback() {
        this._allow_login = false;
        this._highlighted_inputs = {}; // {input_form_id:color}
    }

    _createLoginBtn() {
        const btn = document.createElement("button");
        
        btn.innerText = "Login"
        btn.id = "login-button"

        return btn;
    }

    setGreeting(msg) {
        this.header.innerText = msg;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "greeting":
                this.setGreeting(newValue);
                break;
            default:
                break;
        }
    }
}

customElements.define("login-form", LoginForm);