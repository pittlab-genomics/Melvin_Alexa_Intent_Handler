const nock = require("nock");

const alexaProfileInterceptor = function() {
    nock("https://api.amazonalexa.com", { reqheaders: {
        "user-agent":    () => true,
        "authorization": () => true
    }})
        .get("/Profile.email/")
        .query(true)
        .reply(function(uri, requestBody) {
            return [200, "shwethasundar90@gmail.com"];
        }).persist();
};

module.exports = { alexaProfileInterceptor };