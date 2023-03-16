const path = require("path");
const fs = require("fs")
const http = require("http");

const config = require("./config");

const port = config.port || process.env.PORT;

function onServerStart() {
    console.log("Connected")
}

function onServerListen() {
    console.log(`Server is running on port ${config.path}:${port}`);
}

const server = http.createServer( (request, response) => {
    console.log(`request ${request.method} ${request.url}`)

    let status = 400, headers = {}, responseContent = {"test": "test"};

    if (request.url === "/") {
        status = 200;
        headers = {
            "Content-Type": "text/plain"
        }
    }

    if (request.url === "/comments") {
        if (request.method === "POST") {
            let body = "";
             request.on("data", chunk => {
                body += chunk;
            })

            request.on("end", () => {
                console.log("body got \n", body);
                responseContent = body;
                console.log("response content", responseContent)

                response.end(responseContent);
            })
        }
        else {
            status = 405;
        }
    }
    else if (request.url === "/stats") {
        if (request.method === "GET") {
            console.log("get stats");
            status = 200
            headers = {
                "Content-Type": "text/html",
            }
        }
    }
    else {
        response.statusCode = 400;
    }

    // response.writeHead(status, headers);
    // response.end(responseContent);
} );
server.on("connection", onServerStart);
server.listen(port, config.path, onServerListen);
