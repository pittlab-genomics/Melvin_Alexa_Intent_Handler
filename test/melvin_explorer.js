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
                    }}); break;
                    case "TP53-LIHC": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  25.9669,
                        recurrent_positions: 19
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
    }, gene_by_name() {
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/genes/HIF1A")
            .query(true)
            .reply(200, { data: {
                location:   "14q23.2",
                name:       "HIF1A",
                ccds:       1,
                pfamID:     "Q16665",
                in_clinvar: "1",
                ncbi:       1,
                // eslint-disable-next-line max-len
                summary:    "This gene encodes the alpha subunit of transcription factor hypoxia-inducible factor-1 (HIF-1), which is a heterodimer composed of an alpha and a beta subunit. HIF-1 functions as a master regulator of cellular and systemic homeostatic response to hypoxia by activating transcription of many genes, including those involved in energy metabolism, angiogenesis, apoptosis, and other genes whose protein products increase oxygen delivery or facilitate metabolic adaptation to hypoxia. HIF-1 thus plays an essential role in embryonic vascularization, tumor angiogenesis and pathophysiology of ischemic disease. Alternatively spliced transcript variants encoding different isoforms have been identified for this gene.",
                idGENE:     2411,
                cgc:        1,
                pfamLENGTH: 826
            }});
    }, gene_expression_tcga_stats() {
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/gene_expression/tcga/stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "TP53-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        mean:      11.2856699669967,
                        max:       13.44,
                        n_cases:   1093,
                        n_records: 1212
                    }});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: {
                        study: "LAML",
                        mean:  11.93
                    }});
                    }
                }
                else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: {
                        gene: "EEF1A1",
                        mean: 18.75
                    }});
                    }
                }

                return [ 200, jsonResult];
            });
    }
};
module.exports = { MelvinExplorerInterceptor };