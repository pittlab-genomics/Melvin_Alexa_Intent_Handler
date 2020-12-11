const nock = require("nock");
const url = require("url");

const oovMapperInterceptor = function() {
    nock("https://api.test.oovm-fg.pittlabgenomics.com")
        .get("/v0.0.1/entity_mappings")
        .query(true)
        .reply(function(uri, requestBody) {
            const parsed = new url.URL(this.req.path, "http://example.com");
            const query = parsed.searchParams.get("query");
            switch(query) {
            case "ovarian cancer": return [200, { data: { 
                entity_type: "STUDY", 
                from:        "study_lookup", 
                entity_data: {
                    value:           "OV",
                    query_utterance: "ovarian cancer",
                    target:          "ovarian cancer"
                } 
            }}];
            case "breast cancer": return [200, { data: {
                entity_type: "STUDY",
                from:        "study_lookup",
                entity_data: {
                    value:           "BRCA",
                    query_utterance: "breast cancer",
                    target:          "breast cancer" 
                }
            }}];
            }
        });
};

module.exports = { oovMapperInterceptor };