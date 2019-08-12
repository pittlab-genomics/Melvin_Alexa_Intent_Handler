module.exports = {
    baseUrl: "https://api.dev.melvin.pittlabgenomics.com/v0.1",
    setBaseUrl: function (url) {
        this.baseUrl = url;
    },
    getBaseUrl: function () {
        return this.baseUrl;
    },
    quickQueryRepromptText: "Would you like to keep exploring?"
}