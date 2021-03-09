const nock = require("nock");
const url = require("url");

const oovMapperInterceptor = function() {
    nock("https://api.test.oovm.pittlabgenomics.com")
        .get("/v0.1/oov-ml-mapper-test")
        .query(true)
        .reply(function(uri, requestBody) {
            const parsed = new url.URL(this.req.path, "http://example.com");
            const query = parsed.searchParams.get("query");
            switch(query) {
            case "ovarian cancer": return [200, { data: { 
                type:  "STUDY", 
                val:   "OV",
                query: "ovarian cancer" 
            }}];
            case "breast cancer": return [200, { data: {
                type:  "STUDY",
                val:   "BRCA",
                query: "breast cancer"
            }}];
            case "liver cancer": return[200, { data: {
                type:  "STUDY",
                val:   "LIHC",
                query: "liver cancer"
            }}];
            case "Hif one alpha": return[200, { data: {
                type:  "GENE",
                query: "Hif one alpha",
                val:   "HIF1A"
            }}];
            case "braca one": return[200, { data: {
                type:  "GENE",
                query: "braca one",
                val:   "BRCA1"
            }}];
            case "TP53": return[200, { data: {
                type:  "GENE",
                query: "TP53",
                val:   "TP53"
            }}];
            case "mutations": return[200, { data: {
                type:  "DTYPE",
                val:   "MUTATIONS",
                query: "mutations"
            }}];
            case "most affected domains": return[200, { data: {
                type:  "DTYPE",
                val:   "PROTEIN_DOMAINS",
                query: "most affected domains"
            }}];
            case "domains": return[200, { data: {
                type:  "DTYPE",
                val:   "PROTEIN_DOMAINS",
                query: "domains"
            }}];
            case "CDH1": return[200, { data: {
                type:  "GENE",
                val:   "CDH1",
                query: "CDH1"
            }}];
            case "Rad fifty one b": return[200, { data: {
                type:  "GENE",
                query: "Rad fifty one b",
                val:   "RAD51B"
            }}];
            case "indels": return[200, { data: {
                query: "indels",
                type:  "DTYPE",
                val:   "INDELS"
            }}];
            case "SNVs": return[200, { data: {
                query: "SNVs",
                type:  "DTYPE",
                val:   "SNV"
            }}];
            case "amplifications": return[200, { data: {
                query: "amplifications",
                type:  "DTYPE",
                val:   "GAIN"
            }}];
            }
        }).persist();
};

module.exports = { oovMapperInterceptor };