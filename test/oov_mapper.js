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
            case "liver cancer": return[200, { data: {
                entity_type: "STUDY",
                from:        "study_lookup",
                entity_data: {
                    value:           "LIHC",
                    query_utterance: "liver cancer",
                    target:          "liver cancer"
                }
            }}];
            case "Hif one alpha": return[200, { data: {
                entity_type: "GENE",
                from:        "ml_mapper_gene",
                entity_data: {
                    query_utterance: "Hif one alpha",
                    value:           "HIF1A",
                    target:          "HIF1A",
                    score:           null
                }
            }}];
            case "braca one": return[200, { data: {
                entity_type: "GENE",
                from:        "ml_mapper_gene",
                entity_data: {
                    query_utterance: "braca one",
                    value:           "BRCA1",
                    target:          "BRCA1",
                    score:           null
                }
            }}];
            case "TP53": return[200, { data: {
                entity_type: "GENE",
                from:        "ml_mapper_gene",
                entity_data: {
                    query_utterance: "TP53",
                    value:           "TP53",
                    target:          "TP53",
                    score:           null
                }
            }}];
            case "mutations": return[200, { data: {
                entity_type: "DTYPE",
                from:        "dtype_lookup",
                entity_data: {
                    value:           "MUTATIONS",
                    query_utterance: "mutations",
                    target:          "mutations"
                }
            }}];
            case "most affected domains": return[200, { data: {
                entity_type: "DTYPE",
                from:        "dtype_lookup",
                entity_data: {
                    value:           "PROTEIN_DOMAINS",
                    query_utterance: "most affected domains",
                    target:          "most affected domains"
                }
            }}];
            case "CDH1": return[200, { data: {
                entity_type: "GENE",
                from:        "gene_lookup",
                entity_data: {
                    value:           "CDH1",
                    query_utterance: "CDH1",
                    target:          "CDH1"
                }
            }}];
            }
        }).persist();
};

module.exports = { oovMapperInterceptor };