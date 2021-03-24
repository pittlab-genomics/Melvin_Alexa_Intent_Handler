const { isEqual } = require("lodash");
const _ = require("lodash");
const nock = require("nock");
const url = require("url");

const MelvinExplorerInterceptor = {
    mutation_tcga_stats() {
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/mutations/tcga/MUT_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                const style = parsed.searchParams.get("style");
                var jsonResult = { data: { records: []}};
                if(gene && study && style) {
                    switch(gene+"-"+study+"-"+style) {
                    case "TP53-BRCA-domain": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            domain:     "P53 DNA-binding domain",
                            percentage: 88.0
                        },
                        {
                            domain:     "P53 tetramerisation motif",
                            percentage: 5.33
                        },
                        {
                            domain:     "P53 transactivation motif",
                            percentage: 0.67
                        },
                        {
                            domain:     "Transactivation domain 2",
                            percentage: 0.67
                        }
                    ]}});
                    }
                }
                else if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "TP53-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  30.0306,
                        recurrent_positions: 53
                    }}); break;
                    case "TP53-LIHC": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  25.9669,
                        recurrent_positions: 19
                    }}); break;
                    case "TP53-OV": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  69.9541,
                        recurrent_positions: 65
                    }}); break;
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  1.9408,
                        recurrent_positions: 0
                    }}); break;
                    case "BRCA1-OV": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  3.211,
                        recurrent_positions: 1
                    }});
                    }
                } else if(gene) {
                    if(style) {
                        switch(gene) {
                        case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: [{
                            domain: "P53 DNA-binding domain", percentage: 85.76 
                        }, {
                            domain: "none", percentage: 6.72 
                        }, {
                            domain: "P53 tetramerisation motif", percentage: 5.5 
                        }, {
                            domain: "Transactivation domain 2", percentage: 1.45 
                        }, {
                            domain: "P53 transactivation motif", percentage: 0.57
                        }]}});
                        }
                    } else {
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
                        }}); break;
                        case "BRCA1": jsonResult = Object.assign(jsonResult, { data: {
                            records: [
                                {
                                    study_abbreviation:      "UCEC",
                                    gene_study_case_percent: 7.94
                                },
                                {
                                    study_abbreviation:      "DLBC",
                                    gene_study_case_percent: 5.41
                                }
                            ],
                            cancer_count: 21
                        }});
                        }
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
                    ]}}); break;
                    case "BRCA": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            name:         "PIK3CA",
                            case_percent: 33.09
                        },
                        {
                            name:         "TP53",
                            case_percent: 30.03
                        }
                    ]}});
                    }
                }

                return [ 200, jsonResult];
            }).persist();
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
                    }}); break;
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        name:                "BRCA1",
                        study_abbreviation:  "BRCA",
                        amp_cases_count:     41,
                        del_cases_count:     90,
                        all_cases_count:     131,
                        case_count_in_study: 1098,
                        zero_count:          967,
                        all_cases_percent:   11.930783242258652,
                        amp_cases_percent:   3.734061930783242,
                        del_cases_percent:   8.19672131147541
                    }}); break;
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
                            cna_percentage:     37.55
                        },
                        {
                            study_abbreviation: "PRAD",
                            cna_percentage:     18.0
                        }
                    ]}}); break;
                    case "BRCA1": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            study_abbreviation: "UCS",
                            cna_percentage:     21.05
                        },
                        {
                            study_abbreviation: "ESCA",
                            cna_percentage:     14.05
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
                    ]}}); break;
                    case "BRCA": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            gene:           "CCND1",
                            cna_percentage: 28.6
                        },
                        {
                            gene:           "LTO1",
                            cna_percentage: 28.6
                        }
                    ]}}); 
                    }
                }

                return [ 200, jsonResult];
            }).persist();
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
                    }}); break;
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        name:                "BRCA1",
                        study_abbreviation:  "BRCA",
                        amp_cases_count:     41,
                        del_cases_count:     90,
                        all_cases_count:     131,
                        case_count_in_study: 1098,
                        zero_count:          967,
                        all_cases_percent:   11.930783242258652,
                        amp_cases_percent:   3.734061930783242,
                        del_cases_percent:   8.19672131147541
                    }}); break;
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
                            study_abbreviation: "OV",
                            gain_percentage:    9.36
                        },
                        {
                            study_abbreviation: "UCS",
                            gain_percentage:    5.26
                        }
                    ]}}); break;
                    case "BRCA1": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            study_abbreviation: "ESCA",
                            gain_percentage:    10.81
                        },
                        {
                            study_abbreviation: "STAD",
                            gain_percentage:    7.22
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
                    ]}}); break;
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            gene:            "MECOM",
                            gain_percentage: 55.85
                        },
                        {
                            gene:            "MYC",
                            gain_percentage: 55.18
                        }
                    ]}});
                    }
                }

                return [ 200, jsonResult];
            }).persist();
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
                    }}); break;
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        name:                "BRCA1",
                        study_abbreviation:  "BRCA",
                        amp_cases_count:     41,
                        del_cases_count:     90,
                        all_cases_count:     131,
                        case_count_in_study: 1098,
                        zero_count:          967,
                        all_cases_percent:   11.930783242258652,
                        amp_cases_percent:   3.734061930783242,
                        del_cases_percent:   8.19672131147541
                    }}); break;
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
                            loss_percentage:    34.1
                        },
                        {
                            study_abbreviation: "PRAD",
                            loss_percentage:    18.0
                        }
                    ]}}); break;
                    case "BRCA1": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            study_abbreviation: "UCS",
                            loss_percentage:    15.79
                        },
                        {
                            study_abbreviation: "BRCA",
                            loss_percentage:    8.2
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
                    ]}}); break;
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            gene:            "TCF3",
                            loss_percentage: 57.69
                        },
                        {
                            gene:            "ATP5F1D",
                            loss_percentage: 57.53
                        }
                    ]}});
                    }
                }

                return [ 200, jsonResult];
            }).persist();
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
            }}).persist();
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/genes/RAD51B")
            .query(true)
            .reply(200, { data: {
                name:       "RAD51B",
                location:   "N/A",
                ccds:       1,
                pfamID:     "O15315",
                in_clinvar: "1",
                summary:    "N/A",
                idGENE:     76469,
                ncbi:       0,
                cgc:        1,
                pfamLENGTH: 384
            }}).persist();
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
                    }}); break;
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        mean:      9.131332830033003,
                        max:       11.9512,
                        n_cases:   1093,
                        n_records: 1212
                    }}); break;
                    case "BRCA1-OV": jsonResult = Object.assign(jsonResult, { data: {
                        mean:      8.250753231850117,
                        max:       11.1191,
                        n_cases:   422,
                        n_records: 427
                    }});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: {
                        study: "LAML",
                        mean:  11.93
                    }}); break;
                    case "BRCA1": jsonResult = Object.assign(jsonResult, { data: {
                        study: "LAML",
                        mean:  11.29
                    }});
                    }
                }
                else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: {
                        gene: "EEF1A1",
                        mean: 18.75
                    }}); break;
                    case "BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        gene: "EEF1A1",
                        mean: 18.61
                    }});
                    }
                }

                return [ 200, jsonResult];
            }).persist();
    }, indels_tcga_stats() {
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/mutations/tcga/IND_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                const style = parsed.searchParams.get("style");
                var jsonResult = { data: { records: []}};
                if(gene && study && style) {
                    switch(gene+"-"+study+"-"+style) {
                    case "TP53-BRCA-domain": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            domain:     "P53 DNA-binding domain",
                            percentage: 75.0
                        },
                        {
                            domain:     "none",
                            percentage: 17.86
                        },
                        {
                            domain:     "P53 tetramerisation motif",
                            percentage: 7.14
                        }
                    ]}});
                    }
                } else if(gene && study) {
                    switch(gene+ "-"+ study) {
                    case "TP53-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  5.7201,
                        recurrent_positions: 6
                    }}); break;
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  0.3064,
                        recurrent_positions: 0
                    }}); break;
                    case "BRCA1-OV": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  1.1468,
                        recurrent_positions: 0
                    }});
                    }
                } else if(gene) {
                    if(style) {
                        switch(gene) {
                        case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: [{
                            domain: "P53 DNA-binding domain", percentage: 65.81
                        }, {
                            domain: "none", percentage: 17.98 
                        }, {
                            domain: "P53 tetramerisation motif", percentage: 8.1
                        }, {
                            domain: "Transactivation domain 2", percentage: 5.93
                        }, {
                            domain: "P53 transactivation motif", percentage: 2.17
                        }]}});
                        }
                    } else {
                        switch(gene) {
                        case "TP53": jsonResult = Object.assign(jsonResult, { data: {
                            records: [
                                {
                                    study_abbreviation:      "ESCA",
                                    gene_study_case_percent: 12.09
                                },
                                {
                                    study_abbreviation:      "OV",
                                    gene_study_case_percent: 11.7
                                }
                            ],
                            cancer_count: 26
                        }}); break;
                        case "BRCA1": jsonResult = Object.assign(jsonResult, { data: {
                            records: [
                                {
                                    study_abbreviation:      "OV",
                                    gene_study_case_percent: 1.15
                                },
                                {
                                    study_abbreviation:      "UCEC",
                                    gene_study_case_percent: 0.57
                                }
                            ],
                            cancer_count: 7
                        }});
                        }
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            name:         "TP53",
                            case_percent: 11.7
                        },
                        {
                            name:         "NF1",
                            case_percent: 1.83
                        }
                    ]}}); break;
                    case "BRCA": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            name:         "GATA3",
                            case_percent: 8.27
                        },
                        {
                            name:         "CDH1",
                            case_percent: 6.64
                        }
                    ]}});
                    }
                }          
                return [ 200, jsonResult];
            }).persist();
    }, snv_tcga_stats() {
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/mutations/tcga/SNV_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                const style = parsed.searchParams.get("style");
                var jsonResult = { data: { records: []}};
                if(gene && study && style) {
                    switch(gene+"-"+study+"-"+style) {
                    case "TP53-BRCA-domain": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            domain:     "P53 DNA-binding domain",
                            percentage: 90.98
                        },
                        {
                            domain:     "P53 tetramerisation motif",
                            percentage: 4.92
                        },
                        {
                            domain:     "none",
                            percentage: 2.46
                        },
                        {
                            domain:     "P53 transactivation motif",
                            percentage: 0.82
                        },
                        {
                            domain:     "Transactivation domain 2",
                            percentage: 0.82
                        }
                    ]}});
                    }
                } else if(gene && study) {
                    switch(gene+ "-"+ study) {
                    case "TP53-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  24.4127,
                        recurrent_positions: 44
                    }}); break;
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  1.6343,
                        recurrent_positions: 0
                    }}); break;
                    case "BRCA1-OV": jsonResult = Object.assign(jsonResult, { data: {
                        patient_percentage:  2.0642,
                        recurrent_positions: 1
                    }});
                    }
                } else if(gene) {
                    if(style) {
                        switch(gene) {
                        case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: [
                            {
                                domain:     "P53 DNA-binding domain",
                                percentage: 89.12
                            },
                            {
                                domain:     "P53 tetramerisation motif",
                                percentage: 5.06
                            },
                            {
                                domain:     "none",
                                percentage: 4.82
                            },
                            {
                                domain:     "Transactivation domain 2",
                                percentage: 0.7
                            },
                            {
                                domain:     "P53 transactivation motif",
                                percentage: 0.3
                            }
                        ]}});
                        }
                    } else {
                        switch(gene) {
                        case "TP53": jsonResult = Object.assign(jsonResult, { data: {
                            records: [
                                {
                                    study_abbreviation:      "UCS",
                                    gene_study_case_percent: 61.4
                                },
                                {
                                    study_abbreviation:      "OV",
                                    gene_study_case_percent: 58.72
                                }
                            ],
                            "cancer_count": 31
                        }}); break;
                        case "BRCA1": jsonResult = Object.assign(jsonResult, { data: {
                            records: [
                                {
                                    study_abbreviation:      "UCEC",
                                    gene_study_case_percent: 7.37
                                },
                                {
                                    study_abbreviation:      "DLBC",
                                    gene_study_case_percent: 5.41
                                }
                            ],
                            cancer_count: 21
                        }});
                        }
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            name:         "TP53",
                            case_percent: 58.72
                        },
                        {
                            name:         "TTN",
                            case_percent: 21.33
                        }
                    ]}}); break;
                    case "BRCA": jsonResult = Object.assign(jsonResult, { data: { records: [
                        {
                            name:         "PIK3CA",
                            case_percent: 31.77
                        },
                        {
                            name:         "TP53",
                            case_percent: 24.41
                        }
                    ]}});
                    }
                }          
                return [ 200, jsonResult];
            }).persist();
    }, splitby_tcga_stats() {
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/LOSSsLOSS_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { data: {
                    oddsratio: 0.4859903381642512,
                    pvalue:    0.7172876350133848,
                    method:    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();
        
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/GAINsGAIN_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { data: {
                    oddsratio: 7.335664335664336,
                    pvalue:    0.013521281907155201,
                    method:    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/GAINsLOSS_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { data: {
                    oddsratio: 1.5362962962962963,
                    pvalue:    0.49821369817681715,
                    method:    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();
        
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/CNAsCNA_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 1.3282548476454294,
                    "pvalue":    0.46203809718888533,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();
        
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/CNAsGAIN_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 2.125,
                    "pvalue":    0.14650251972583425,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();
        
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/CNAsLOSS_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 0.7384500745156483,
                    "pvalue":    1.0,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();
        
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/INDsIND_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 0.0,
                    "pvalue":    0.07200739926096636,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();
        
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/INDsCNA_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 2.5418245409501603,
                    "pvalue":    0.030733106350417025,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/INDsGAIN_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 2.4278846153846154,
                    "pvalue":    0.10614569479243083,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/INDsLOSS_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 2.3935915829746532,
                    "pvalue":    0.0796261094784253,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();
        
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/SNVsSNV_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 0.4130162703379224,
                    "pvalue":    0.10845968480195148,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/SNVsIND_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 0.22267178235088944,
                    "pvalue":    0.0009204201491853142,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/SNVsCNA_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 1.750335345405768,
                    "pvalue":    0.03579178905116308,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/SNVsGAIN_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 1.8392070484581498,
                    "pvalue":    0.09983419310840444,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/splitby/tcga/SNVsLOSS_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                var jsonResult = { data: { records: []}};
                jsonResult = Object.assign(jsonResult, { "data": {
                    "oddsratio": 1.6080555555555556,
                    "pvalue":    0.14689719474072704,
                    "method":    "fishers"
                }});

                return [ 200, jsonResult];
            }).persist();

    }, compare_tcga_stats() {
        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/comparison/tcga/MUTvCNA_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: { records: {
                        mut_perc:  3.0,
                        cna_perc:  13.0,
                        both_perc: 1.0
                    }}});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: {
                        mut_cases_perc: 19.35941797533493,
                        CNA_cases_perc: 5.660544760890781
                    }}});
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: {
                        top_mut_gene:      "TP53",
                        top_mut_gene_perc: 34.28,
                        top_cna_gene:      "POLRMT",
                        top_cna_gene_perc: 59.53
                    }}});
                    }
                }
                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/comparison/tcga/INDvCNA_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: { records: {
                        ind_perc:  1.0,
                        cna_perc:  12.0,
                        both_perc: 0.0
                    }}});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: {
                        ind_cases_perc: 4.409546624079496,
                        cna_cases_perc: 5.660544760890781
                    }}});
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: {
                        top_ind_gene:      "TP53",
                        top_ind_gene_perc: 8.53,
                        top_cna_gene:      "POLRMT",
                        top_cna_gene_perc: 59.53
                    }}});
                    }
                }
                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/comparison/tcga/SNVvCNA_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: { records: {
                        snv_perc:  3.0,
                        cna_perc:  13.0,
                        both_perc: 1.0
                    }}});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: {
                        snv_cases_perc: 23.64475201845444,
                        CNA_cases_perc: 5.660544760890781
                    }}});
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: {
                        top_snv_gene:      "TP53",
                        top_snv_gene_perc: 42.81,
                        top_cna_gene:      "DAZAP1",
                        top_cna_gene_perc: 59.53
                    }}});
                    }
                }
                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/comparison/tcga/MUTvGAIN_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: { records: {
                        mut_perc:  3.0,
                        gain_perc: 5.0,
                        both_perc: 1.0
                    }}});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: {
                        mut_cases_perc:  27.655043918019697,
                        gain_cases_perc: 1.2776151184455682
                    }}});
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: {
                        top_mut_gene:       "TP53",
                        top_mut_gene_perc:  51.0,
                        top_gain_gene:      "MECOM",
                        top_gain_gene_perc: 57.36
                    }}});
                    }
                }
                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/comparison/tcga/MUTvLOSS_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: { records: {
                        mut_perc:  2.0,
                        loss_perc: 9.0,
                        both_perc: 0.0
                    }}});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: {
                        mut_cases_perc:  27.655043918019697,
                        LOSS_cases_perc: 4.391801969656641
                    }}});
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: {
                        top_mut_gene:       "TP53",
                        top_mut_gene_perc:  51.0,
                        top_loss_gene:      "PWWP3A",
                        top_loss_gene_perc: 59.53
                    }}});
                    }
                }
                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/comparison/tcga/INDvGAIN_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: { records: {
                        ind_perc:  1.0,
                        gain_perc: 4.0,
                        both_perc: 0.0
                    }}});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: {
                        ind_cases_perc:  4.409546624079496,
                        gain_cases_perc: 1.2776151184455682
                    }}});
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: {
                        top_ind_gene:       "TP53",
                        top_ind_gene_perc:  8.53,
                        top_gain_gene:      "MECOM",
                        top_gain_gene_perc: 57.36
                    }}});
                    }
                }
                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/comparison/tcga/INDvLOSS_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: { records: {
                        ind_perc:  1.0,
                        loss_perc: 9.0,
                        both_perc: 0.0
                    }}});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: {
                        ind_cases_perc:  4.409546624079496,
                        loss_cases_perc: 4.391801969656641
                    }}});
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: {
                        top_ind_gene:       "TP53",
                        top_ind_gene_perc:  8.53,
                        top_loss_gene:      "PWWP3A",
                        top_loss_gene_perc: 59.53
                    }}});
                    }
                }
                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/comparison/tcga/SNVvGAIN_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: { records: {
                        snv_perc:  3.0,
                        gain_perc: 5.0,
                        both_perc: 1.0
                    }}});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: {
                        snv_cases_perc:  23.64475201845444,
                        gain_cases_perc: 1.2776151184455682
                    }}});
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: {
                        top_snv_gene:       "TP53",
                        top_snv_gene_perc:  42.81,
                        top_gain_gene:      "MECOM",
                        top_gain_gene_perc: 57.36
                    }}});
                    }
                }
                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/comparison/tcga/SNVvLOSS_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: { records: {
                        snv_perc:  2.0,
                        loss_perc: 9.0,
                        both_perc: 0.0
                    }}});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: {
                        snv_cases_perc:  23.64475201845444,
                        loss_cases_perc: 4.391801969656641
                    }}});
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: {
                        top_snv_gene:       "TP53",
                        top_snv_gene_perc:  42.81,
                        top_loss_gene:      "DAZAP1",
                        top_loss_gene_perc: 59.53
                    }}});
                    }
                }
                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/comparison/tcga/GAINvLOSS_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: { records: {
                        gain_perc: 4.0,
                        loss_perc: 9.0,
                        both_perc: 0.0
                    }}});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: {
                        gain_cases_perc: 1.2776151184455682,
                        loss_cases_perc: 4.391801969656641
                    }}});
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: {
                        top_gain_gene:      "MECOM",
                        top_gain_gene_perc: 57.36,
                        top_loss_gene:      "PWWP3A",
                        top_loss_gene_perc: 59.53
                    }}});
                    }
                }
                return [ 200, jsonResult];
            }).persist();

        nock("https://api.test.melvin.pittlabgenomics.com")
            .get("/v0.1/analysis/comparison/tcga/SNVvIND_stats")
            .query(true)
            .reply(function(uri, requestBody) {
                const parsed = new url.URL(this.req.path, "http://example.com");
                const gene = parsed.searchParams.get("gene");
                const study = parsed.searchParams.get("study");
                var jsonResult = { data: { records: []}};
                if(gene && study) {
                    switch(gene + "-"+ study) {
                    case "BRCA1-BRCA": jsonResult = Object.assign(jsonResult, { data: { records: {
                        snv_perc:  2.0,
                        ind_perc:  1.0,
                        both_perc: 0.0
                    }}});
                    }
                } else if(gene) {
                    switch(gene) {
                    case "TP53": jsonResult = Object.assign(jsonResult, { data: { records: {
                        snv_cases_perc: 23.64475201845444,
                        ind_cases_perc: 4.409546624079496
                    }}});
                    }
                } else if(study) {
                    switch(study) {
                    case "OV": jsonResult = Object.assign(jsonResult, { data: { records: {
                        top_snv_gene:      "TP53",
                        top_snv_gene_perc: 42.47,
                        top_ind_gene:      "TP53",
                        top_ind_gene_perc: 8.19
                    }}});
                    }
                }
                return [ 200, jsonResult];
            }).persist();
    }
};

module.exports = { MelvinExplorerInterceptor };