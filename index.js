const path = require("node:path");
const fs = require("node:fs")
const http = require("node:http");

const config = require("./config");

// CUSTOM FUNCS
function logRequests(userAgent) {
    let requestsJSON = {};

    const requestsDataBuffer = fs.readFileSync( path.join(__dirname, "data/requests.json") );

    if (requestsDataBuffer.length) {
        // throw new Error("Не удалось прочитать файл")
        let requestsData = Buffer.from(requestsDataBuffer).toString();

        if (requestsData) {
            requestsJSON = JSON.parse(requestsData);
        }
    }

    let userAgentFindRes = getRequestDataByUserAgent(requestsJSON, userAgent);

    // если userAgent найден
    if (userAgentFindRes !== -1) {
        if (requestsJSON[userAgent]) {
            requestsJSON[userAgent].requests += 1;
        }
        else {
            requestsJSON[userAgent] = {
                "user-agent": userAgent,
                requests: 1
            };
        }
    }
    // если suerAgent не найден
    else {
        if (typeof requestsJSON !== "object") {
            requestsJSON = {};
        }
        requestsJSON[userAgent] = {
            "user-agent": userAgent,
            requests: 1
        };
    }

    fs.writeFileSync(path.join(__dirname, "data/requests.json"), JSON.stringify(requestsJSON))

    // fs.readFileSync( path.join(__dirname, "data/requests.json"), (err, content) => {
    //     if (err) throw err;
    //
    //     let requestsData = Buffer.from(content).toString();
    //
    //     if (requestsData) {
    //         requestsJSON = JSON.parse(requestsData);
    //     }
    //
    //     let userAgentFindRes = getRequestDataByUserAgent(requestsJSON, userAgent);
    //
    //     // если userAgent найден
    //     if (userAgentFindRes !== -1) {
    //         if (requestsJSON[userAgent]) {
    //             requestsJSON[userAgent].requests += 1;
    //         }
    //         else {
    //             requestsJSON[userAgent] = {
    //                 "user-agent": userAgent,
    //                 requests: 1
    //             };
    //         }
    //     }
    //     // если suerAgent не найден
    //     else {
    //         if (typeof requestsJSON !== "object") {
    //             requestsJSON = {};
    //         }
    //         requestsJSON[userAgent] = {
    //             "user-agent": userAgent,
    //             requests: 1
    //         };
    //     }
    //
    //     fs.writeFile(path.join(__dirname, "data/requests.json"), JSON.stringify(requestsJSON), err => {
    //         if (err) throw err;
    //
    //         console.log("Количество запросов изменено");
    //     })
    // })
}

function getRequestDataByUserAgent(requestData, userAgentName) {
    const keys = Object.keys(requestData);

    return keys.indexOf(userAgentName);
}

// NODE FUNCS
function onServerStart() {
    console.log("Connected")
}

function onServerListen() {
    console.log(`Server is running on port ${config.path}:${port}`);
}

const port = process.env.PORT || config.port;

const server = http.createServer((request, response) => {
    // console.log(`request ${request.method} ${request.url}`)

    const userAgent = request.headers["user-agent"];
    logRequests(userAgent);

    let status = 400, headers = {}, responseContent = {"test": "test"};

    // на root
    if (request.url === "/") {
        status = 200;
        headers = {
            "Content-Type": "text/html"
        }
        responseContent = "<h1>MainPage</h1>";

        response.writeHead(status, headers);
        response.end(responseContent);
    }

    if (request.url === "/comments") {
        // Доавить новый комментарий
        if (request.method === "POST") {
            let body = "";
             request.on("data", chunk => {
                body += chunk;
            })

            request.on("end", () => {
                const newComment = JSON.parse(body);

                fs.readFile(path.join(__dirname, "data/comments.json"), (error, content) => {
                    if (error) {
                        throw error;
                    }

                    const data = Buffer.from(content).toString();
                    const comments = JSON.parse(data);

                    newComment.dateCreated = new Date();

                    comments.push(newComment)

                    const commentsToWrite = JSON.stringify(comments);

                    fs.writeFile( path.join(__dirname, "data/comments.json"), commentsToWrite, err => {
                        if (err) {
                            throw err;
                        }

                        console.log("Файл записан");
                    })
                })

                status = 201;
                headers = {
                    "Content-Type": "application/json",
                }

                response.writeHead(status, headers)
                response.end(JSON.stringify(newComment));
            })
        }

        // получить все комментарии
        else if (request.method === "GET") {
            fs.readFile(path.join(__dirname, "data/comments.json"), (error, content) => {
                if (error) {
                    throw error;
                }

                const data = Buffer.from(content).toString();
                const comments = JSON.parse(data);
                const commentsToSend = JSON.stringify(comments);

                headers = {
                    "Content-Type": "application/json",
                }
                response.writeHead(200, headers);
                response.end(commentsToSend);
            })
        }

        // метод не поддерживается
        else {
            status = 405;
        }
    }

    else if (request.url === "/stats") {
        if (request.method === "GET") {
            fs.readFile( path.join(__dirname, "data/requests.json"), (err, requestsData) => {
                if (err) {
                    throw err;
                }

                requestsData = Buffer.from(requestsData).toString();

                // console.log("readed from file", requestsData)

                if (requestsData) {
                    requestsData = JSON.parse(requestsData);
                }
                else {
                    throw new Error("Ошибка при чтении из файла");
                }

                let HTMLTable = `
                        <meta charset="utf-8">
                        <style>
                            table tr td:first-child {
                                max-width: 400px;
                            }
                        </style>
                        <table>
                            <thead>
                                <tr>
                                    <th>User-agent</th>
                                    <th>Количество запросов</th>
                                </tr>
                            </thead>
                        
                            <tbody>`;

                for (const userAgent in requestsData) {
                    const requestObject = requestsData[userAgent];

                    HTMLTable += `
                    <tr>
                        <td>${requestObject["user-agent"]}</td>
                        <td>${requestObject.requests}</td>
                    </tr>
                    `
                }

                HTMLTable+= `
                        </tbody>
                    </table>
                    `;

                headers = {
                    "Content-Type": "text/html",
                }
                response.writeHead(200, headers);
                response.end(HTMLTable);
            })
        }
    }
    else {
        response.statusCode = 400;
        response.end();
    }
} );
server.on("connection", onServerStart);
server.listen(port, config.path, onServerListen);
