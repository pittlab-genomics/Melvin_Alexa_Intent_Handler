const nock = require("nock");
const url = require("url");

const MelvinExplorerInterceptor = {
    mutation_tcga_stats() {
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/mutations/tcga/stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "TP53-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  30.0306,
                        recurrent_positions: 53
                    }});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { 
                        records: [
                            {
                                study_abbreviation:      "OV",
                                gene_study_case_percent: 69.95
                            },
                            {
                                study_abbreviation:      "LUSC",
                                gene_study_case_percent: 67.96
                            }
                        ],
                        cancer_count: 31 
                    }});
                    }
                }
                else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            name:         "TP53",
                            case_percent: 69.95
                        },
                        {
                            name:         "TTN",
                            case_percent: 22.02
                        }
                    ]}});
                    }
                }

                return [ 200, jsonResult];
            });
    }, cna_tcga_stats() {
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/cna/tcga/cna_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-OV": jsonResult = Object.assign(jsonResult, { data: {
                        name:                "BRCA1",
                        study_abbreviation:  "OV",
                        amp_cases_count:     27,
                        del_cases_count:     48,
                        all_cases_count:     75,
                        case_count_in_study: 598,
                        zero_count:          523,
                        all_cases_percent:   12.54180602006689,
                        amp_cases_percent:   4.51505016722408,
                        del_cases_percent:   8.02675585284281
                    }});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            study_abbreviation: "SARC",
                            cna_percentage:     37.55
                        },
                        {
                            study_abbreviation: "PRAD",
                            cna_percentage:     18.0
                        }
                    ]}});
                    }
                }
                else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            gene:           "HCN2",
                            cna_percentage: 59.53
                        },
                        {
                            gene:           "FSTL3",
                            cna_percentage: 59.53
                        }
                    ]}});
                    }
                }

                return [ 200, jsonResult];
            });
    }, gain_tcga_stats() {
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/cna/tcga/gain_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "TP53-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        name:                "TP53",
                        study_abbreviation:  "BRCA",
                        amp_cases_count:     16,
                        del_cases_count:     47,
                        all_cases_count:     63,
                        case_count_in_study: 1098,
                        zero_count:          1035,
                        all_cases_percent:   5.737704918032787,
                        amp_cases_percent:   1.4571948998178506,
                        del_cases_percent:   4.280510018214936
                    }});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            study_abbreviation: "OV",
                            gain_percentage:    9.36
                        },
                        {
                            study_abbreviation: "UCS",
                            gain_percentage:    5.26
                        }
                    ]}});
                    }
                }
                else if(study) {
                    switch(study) {
                    case "BRCA": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            gene:            "CCND1",
                            gain_percentage: 27.41
                        },
                        {
                            gene:            "LTO1",
                            gain_percentage: 27.41
                        }
                    ]}});
                    }
                }

                return [ 200, jsonResult];
            });
    }, loss_tcga_stats() {
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/cna/tcga/loss_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "TP53-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        name:                "TP53",
                        study_abbreviation:  "BRCA",
                        amp_cases_count:     16,
                        del_cases_count:     47,
                        all_cases_count:     63,
                        case_count_in_study: 1098,
                        zero_count:          1035,
                        all_cases_percent:   5.737704918032787,
                        amp_cases_percent:   1.4571948998178506,
                        del_cases_percent:   4.280510018214936
                    }});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            study_abbreviation: "SARC",
                            loss_percentage:    34.1
                        },
                        {
                            study_abbreviation: "PRAD",
                            loss_percentage:    18.0
                        }
                    ]}});
                    }
                }
                else if(study) {
                    switch(study) {
                    case "BRCA": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            gene:            "KAZN",
                            loss_percentage: 16.85
                        },
                        {
                            gene:            "RCC2",
                            loss_percentage: 16.85
                        }
                    ]}});
                    }
                }

                return [ 200, jsonResult];
            });
    } 
};
module.exports = { MelvinExplorerInterceptor };