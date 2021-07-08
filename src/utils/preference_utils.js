const https = require("https");

async function getUserInfo(accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            "method":   "GET",
            "hostname": "api.amazon.com",
            "path":     "/user/profile",
            "headers":  { "Authorization": `Bearer ${accessToken}` }
        };
        let req = https.request(options, (response) => {
            let returnData = "";

            response.on("data", (chunk) => {
                returnData += chunk;
            });

            response.on("end", () => {
                resolve(JSON.parse(returnData));
            });

            response.on("error", (error) => {
                reject(error);
            });
        });
        req.end();
    });
}

module.exports = { getUserInfo };