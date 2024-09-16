const SUCCESS = 0;
const API_ERROR = 1;
const SERVER_ERROR = 2;

const APIEndpoints = {
    API: "api",
    SESSION: "session",
    ACCOUNT: "account",
    ADMIN: "admin"
}

class APIClient {

    #server_domain;
    #session_id;

    constructor(server_domain, session_id) {
        this.#server_domain = server_domain;
        this.#session_id = session_id;
    }

    async get(request, endpoint, args, success_event, failure_event, request_failure_event) {
        let request_failed = false;
        let fetch_data = {
            headers: {
                "SessionId": this.#session_id,
            }
        };

        if (args.length > 0) {
            fetch_data["headers"]["HomeCloud-API-Args"] = args.join(" ");
        }

        let response = await fetch(this.#server_domain + endpoint + "/" + request, fetch_data)
        .then(resp => resp.json())
        .catch(error => {
            request_failure_event(error);
            request_failed = true;
        });

        if (request_failed) { return; }

        if (Object.keys(response).includes("error")) {
            failure_event(response.status, response.error);
            return;
        }
        

        success_event(response.status, response.result);

    }

    async post(endpoint, args, payload, success_event, failure_event, request_failure_event) {
        let request_failed = false;
        let fetch_data = {
            method:"POST",
            headers: {
                "SessionId": this.#session_id,
                "Content-Type":"application/json",
            },
            body:payload
        };

        if (args.length > 0) {
            fetch_data["headers"]["HomeCloud-API-Args"] = args.toString().replace(",", " ");
        }

        let response = await fetch(this.#server_domain + "api/" + endpoint, fetch_data)
        .then(resp => resp.json())
        .catch(error => {
            request_failure_event(error);
            request_failed = true;
        });

        if (request_failed) { return; }

        if (Object.keys(response).includes("error")) {
            failure_event(response.status, response.error);
            return;
        }

        success_event(response.status, response.result);

    }
}

class UserAPI {

    #server_domain;
    #session_id;
    #apiClient;

    constructor(server_domain, session_id) {
        this.#server_domain = server_domain;
        this.#session_id = session_id;
        this.#apiClient = new APIClient(this.#server_domain, this.#session_id);
    }

    async get_username(user_id, error_out) {
        let result = null;

        await this.#apiClient.get("get_username", APIEndpoints.ACCOUNT, [user_id],

        // Request success
        (status, response) => {
            result = response;
        },

        // API Request failure
        (status, response) => {
            console.log("Get Username: " +  response);
        },

        // Server request failure
        (error) => {
            result = console.log("Get Username: " +  error);
        });
    
        return result;
    }

    async get_account_properties(user_id, properties) {
        let result = null;

        await this.#apiClient.get("get_account_properties", APIEndpoints.ACCOUNT, [user_id, "[" + properties.toString() + "]"],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });
    
        return result;
    }

    async get_group_properties(group_id, properties) {
        let result = null;

        await this.#apiClient.get("get_group_properties", APIEndpoints.ACCOUNT, [group_id, "[" + properties.toString() + "]"],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });
    
        return result;
    }
}

class FileAPI {
    
    #server_domain;
    #session_id;
    #apiClient;

    constructor(server_domain, session_id) {
        this.#server_domain = server_domain;
        this.#session_id = session_id;
        this.#apiClient = new APIClient(this.#server_domain, this.#session_id);
    }

    async get_file_properties(file_id, properties) {
        let result;

        await this.#apiClient.get("get_file_properties", APIEndpoints.API, [file_id, "[" + properties.toString() + "]"],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async set_file_properties(file_id, properties, values) {
        let result;

        await this.#apiClient.get("set_file_properties", APIEndpoints.API, [file_id, "[" + properties.toString() + "]", "[" + values.toString() + "]"],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async get_folder_properties(folder_id, properties) {
        let result;

        await this.#apiClient.get("get_folder_properties", APIEndpoints.API, [folder_id, "[" + properties.toString() + "]"],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async set_folder_properties(file_id, properties, values) {
        let result;

        await this.#apiClient.get("set_folder_properties", APIEndpoints.API, [file_id, "[" + properties.toString() + "]", "[" + values.toString() + "]"],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async get_folder(folder_id) {
        let result;

        await this.#apiClient.get("get_folder", APIEndpoints.API, [folder_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async get_root_folder_id(user_id) {
        let result;

        await this.#apiClient.get("get_account_properties", APIEndpoints.ACCOUNT, [user_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async new_file(file_name, folder_id) {
        let result;

        file_name = btoa(file_name);

        await this.#apiClient.get("new_file", APIEndpoints.API, [file_name, folder_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async new_folder(folder_name, folder_id) {
        let result;

        folder_name = btoa(folder_name);

        await this.#apiClient.get("new_folder", APIEndpoints.API, [folder_name, folder_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async removeFolder(folder_id) {
        let result;

        await this.#apiClient.get("remove_folder", APIEndpoints.API, [folder_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async removeFile(file_id) {
        let result;

        await this.#apiClient.get("remove_file", APIEndpoints.API, [file_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async renameFile(file_id, new_name) {
        let result;

        await this.#apiClient.get("rename_file", APIEndpoints.API, [file_id, btoa(new_name)],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async renameFolder(folder_id, new_name) {
        let result;

        await this.#apiClient.get("rename_folder", APIEndpoints.API, [folder_id, btoa(new_name)],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async moveFile(file_id, new_folder_id, new_name) {
        let result;

        if (new_name != "!null") {
            new_name = btoa(new_name);
        }

        await this.#apiClient.get("move_file", APIEndpoints.API, [file_id, new_folder_id, new_name],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async moveFolder(folder_id, new_folder_id, new_name) {
        let result;

        if (new_name != "!null") {
            new_name = btoa(new_name);
        }

        await this.#apiClient.get("move_folder", APIEndpoints.API, [folder_id, new_folder_id, new_name],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async copyFile(file_id, new_folder_id) {
        let result;

        await this.#apiClient.get("copy_file", APIEndpoints.API, [file_id, new_folder_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async getFile(file_id) {
        let result;

        await this.#apiClient.get("get_file", APIEndpoints.API, [file_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

}

class DownloadAPI {
    #server_domain;
    #session_id;
    #apiClient;

    constructor(server_domain, session_id) {
        this.#server_domain = server_domain;
        this.#session_id = session_id;
        this.#apiClient = new APIClient(this.#server_domain, this.#session_id);
    }

    async init_chunked_download(file_id) {
        let result;

        await this.#apiClient.get("init_chunked_download", APIEndpoints.API, [file_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async download_chunk(download_id) {
        let result;

        await this.#apiClient.get("download_chunk", APIEndpoints.API, [download_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async complete_chunked_download(download_id) {
        let result;

        await this.#apiClient.get("complete_chunked_download", APIEndpoints.API, [download_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }
}

class UploadAPI {
    #server_domain;
    #session_id;
    #apiClient;

    constructor(server_domain, session_id) {
        this.#server_domain = server_domain;
        this.#session_id = session_id;
        this.#apiClient = new APIClient(this.#server_domain, this.#session_id);
    }

    async init_chunked_upload(file_id) {
        let result;

        await this.#apiClient.get("init_chunked_upload", APIEndpoints.API, [file_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async cancel_chunked_upload(upload_id) {
        let result;

        await this.#apiClient.get("cancel_chunked_upload", APIEndpoints.API, [upload_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async upload_chunk(upload_id, data) {
        let result;

        await this.#apiClient.post("upload_chunk", [upload_id], JSON.stringify({"data":data}),

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async complete_chunked_upload(upload_id) {
        let result;

        await this.#apiClient.get("complete_chunked_upload", APIEndpoints.API, [upload_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }
    
}

class SessionAPI {
    #server_domain;
    #session_id;
    #apiClient;

    constructor(server_domain, session_id) {
        this.#server_domain = server_domain;
        this.#session_id = session_id;
        this.#apiClient = new APIClient(this.#server_domain, this.#session_id);
    }

    async logout() {
        let result;

        await this.#apiClient.get("logout", APIEndpoints.SESSION, [],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

}

class AdminAPI {
    #server_domain;
    #session_id;
    #apiClient;

    constructor(server_domain, session_id) {
        this.#server_domain = server_domain;
        this.#session_id = session_id;
        this.#apiClient = new APIClient(this.#server_domain, this.#session_id);
    }

    async get_accounts() {
        let result;

        await this.#apiClient.get("get_accounts", APIEndpoints.ADMIN, [],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async get_groups() {
        let result;

        await this.#apiClient.get("get_groups", APIEndpoints.ADMIN, [],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async create_account(username, group_id) {
        let result;

        await this.#apiClient.get("create_account", APIEndpoints.ADMIN, [username, group_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async delete_account(user_id) {
        let result;

        await this.#apiClient.get("delete_account", APIEndpoints.ADMIN, [user_id],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

    async set_account_properties(user_id, properties, values) {
        let result;

        await this.#apiClient.get("set_user_properties", APIEndpoints.ADMIN, [user_id, "[" + properties.toString() + "]", "[" + values.toString() + "]"],

        // Request success
        (status, response) => {
            result = [SUCCESS, response];
        },

        // API Request failure
        (status, response) => {
            result = [API_ERROR, response, status];
        },

        // Server request failure
        (error) => {
            result = [SERVER_ERROR, error];
        });

        return result;
    }

}