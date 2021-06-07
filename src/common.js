const _ = require("lodash");
const nunjucks = require("nunjucks");

const { GeneSSMLMappings } = require("./utils/gene_pronunciation_mappings.js");
const { CANCER_TYPES } = require("./utils/cancer_types.js");
const { DATA_TYPES } = require("./utils/data_types.js");
const { OOVMappings } = require("./utils/oov_mappings.js");

// common types

const MELVIN_MAX_HISTORY_ITEMS = 30;
const FOLLOW_UP_TEXT_THRESHOLD = 2;
const MAX_EMAIL_RESULT_COUNT = 1000;
const MAX_EMAIL_DURATION = 604800; //1 week

const MelvinEventTypes = {
    ANALYSIS_EVENT:          "analysis_event",
    NAVIGATION_REVERT_EVENT: "navigation_revert_event",
    NAVIGATION_START_EVENT:  "navigation_start_event",
    NAVIGATION_RESET_EVENT:  "navigation_reset_event",
    NAVIGATION_EVENT:        "navigation_event",
    LAUNCH_EVENT:            "launch_event",
    SESSION_ENDED_EVENT:     "session_ended",
    IRS_EVENT:               "irs_event",
    UNMAPPED_EVENT:          "unmapped_event",
    UNKNOWN_EVENT:           "unknown_event"
};

const MelvinAttributes = {
    GENE_NAME:   "gene_name",
    STUDY_ABBRV: "study_abbreviation",
    DTYPE:       "data_type",
    DSOURCE:     "data_source"
};

const MelvinExplorerErrors = {
    UNIDENTIFIED_GENE:     "UNIDENTIFIED_GENE",
    UNIDENTIFIED_STUDY:    "UNIDENTIFIED_STUDY",
    UNIDENTIFIED_LOCATION: "UNIDENTIFIED LOCATION",
    NO_TRIAL_IN_VICINITY:  "NO_TRIAL_IN_VICINITY",
    DATA_IS_ZERO:          "DATA_IS_ZERO"
};

const MelvinIntentErrors = {
    OOV_ERROR:            "OOV_ERROR",
    INVALID_STATE:        "INVALID_STATE",
    INVALID_ENTITY_TYPE:  "INVALID_ENTITY_TYPE",
    INVALID_DATA_TYPE:    "INVALID_DATA_TYPE",
    INVALID_API_RESPONSE: "INVALID_API_RESPONSE",
    MISSING_GENE:         "MISSING_GENE",
    MISSING_DTYPE:        "MISSING_DTYPE",
    MISSING_STUDY:        "MISSING_STUDY",
    NOT_IMPLEMENTED:      "NOT_IMPLEMENTED"
};

const OOVEntityTypes = {
    GENE:    "GENE",
    STUDY:   "STUDY",
    DTYPE:   "DTYPE",
    DSOURCE: "DSOURCE"
};

const DataTypes = {
    GENE_DEFINITION:     "GENE_DEFINITION",
    MUTATIONS:           "MUTATIONS",
    PROTEIN_DOMAINS:     "PROTEIN_DOMAINS",
    MUT_DOMAINS:         "MUT_DOMAINS",
    IND_DOMAINS:         "IND_DOMAINS",
    SNV_DOMAINS:         "SNV_DOMAINS",
    GENE_EXPRESSION:     "GENE_EXPRESSION",
    CNA:                 "CNA",
    GAIN:                "GAIN",
    LOSS:                "LOSS",
    STRUCTURAL_VARIANTS: "STRUCTURAL_VARIANTS",
    INDELS:              "INDELS",
    SNV:                 "SNV"
};

const DataSources = {
    TCGA:    "TCGA",
    CLINVAR: "CLINVAR"
};

const CNATypes = {
    AMPLIFICATIONS: "amplifications",
    DELETIONS:      "deletions",
    ALTERATIONS:    "alterations"
};

const SUPPORTED_SPLITBY_DTYPES = [
    [DataTypes.GAIN, DataTypes.GAIN],
    [DataTypes.GAIN, DataTypes.LOSS],
    [DataTypes.LOSS, DataTypes.LOSS],
    [DataTypes.CNA, DataTypes.CNA],
    [DataTypes.CNA, DataTypes.GAIN],
    [DataTypes.CNA, DataTypes.LOSS],
    [DataTypes.INDELS, DataTypes.INDELS],
    [DataTypes.INDELS, DataTypes.CNA],
    [DataTypes.INDELS, DataTypes.GAIN],
    [DataTypes.INDELS, DataTypes.LOSS],
    [DataTypes.SNV, DataTypes.SNV],
    [DataTypes.SNV, DataTypes.INDELS],
    [DataTypes.SNV, DataTypes.CNA],
    [DataTypes.SNV, DataTypes.GAIN],
    [DataTypes.SNV, DataTypes.LOSS],
    [DataTypes.MUTATIONS, DataTypes.MUTATIONS],
    [DataTypes.MUTATIONS, DataTypes.SNV],
    [DataTypes.MUTATIONS, DataTypes.INDELS],
    [DataTypes.MUTATIONS, DataTypes.CNA],
    [DataTypes.MUTATIONS, DataTypes.GAIN],
    [DataTypes.MUTATIONS, DataTypes.LOSS],
    [DataTypes.GENE_EXPRESSION, DataTypes.MUTATIONS],
    [DataTypes.GENE_EXPRESSION, DataTypes.SNV],
    [DataTypes.GENE_EXPRESSION, DataTypes.INDELS],
    [DataTypes.GENE_EXPRESSION, DataTypes.CNA],
    [DataTypes.GENE_EXPRESSION, DataTypes.GAIN],
    [DataTypes.GENE_EXPRESSION, DataTypes.LOSS],
];

const get_gene_speech_text = function (gene_name) {
    let gene_speech_text = gene_name;
    if (_.has(GeneSSMLMappings, gene_name)) {
        gene_speech_text = GeneSSMLMappings[gene_name];
        console.debug(`[get_gene_speech_text] gene_name: ${gene_name}, gene_speech_text: ${gene_speech_text}`);
    }
    
    return gene_speech_text;
};

const get_oov_mappings_response = function (query) {
    let response = null;
    if (_.has(OOVMappings, query)) {
        response = OOVMappings[query];
        console.log(`[get_oov_mappings_response] query: ${query}, response: ${response}`);
    }
    
    return response;
};

const get_study_name_text = function (study_abbrv) {
    return (_.has(CANCER_TYPES, study_abbrv) ? CANCER_TYPES[study_abbrv] : study_abbrv);
};

const get_dtype_name_text = function (dtype) {
    return (_.has(DATA_TYPES, dtype) ? DATA_TYPES[dtype] : dtype);
};

const melvin_round = function (value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
};

const filter_domains = function(records) {
    return records.filter(item => item.domain !== "none");
};

const total_cancer_types = 33;

/*
 * G (Gene) | C (CancerType)
 * [] = 0, [G] = 2, [C] = 1, [GC] = 3
*/
const RequiredAttributesTCGA = {};
RequiredAttributesTCGA[DataTypes.GENE_DEFINITION] = [2]; // ['G'];
RequiredAttributesTCGA[DataTypes.MUTATIONS] = [3, 2, 1]; // ['GC', 'G', 'C'];
RequiredAttributesTCGA[DataTypes.PROTEIN_DOMAINS] = [3, 2, 1]; // ['GC', 'G', 'C'];
RequiredAttributesTCGA[DataTypes.MUT_DOMAINS] = [3, 2, 1]; // ['GC', 'G', 'C'];
RequiredAttributesTCGA[DataTypes.IND_DOMAINS] = [3, 2, 1]; // ['GC', 'G', 'C'];
RequiredAttributesTCGA[DataTypes.SNV_DOMAINS] = [3, 2, 1]; // ['GC', 'G', 'C'];
RequiredAttributesTCGA[DataTypes.INDELS] = [3, 2, 1]; // ['GC', 'G', 'C'];
RequiredAttributesTCGA[DataTypes.SNV] = [3, 2, 1]; // ['GC', 'G', 'C'];
RequiredAttributesTCGA[DataTypes.CNA] = [3, 1, 2]; // ['GC', 'C', 'G'];
RequiredAttributesTCGA[DataTypes.GAIN] = [3, 1, 2]; // ['GC', 'C', 'G'];
RequiredAttributesTCGA[DataTypes.LOSS] = [3, 1, 2]; // ['GC', 'C', 'G'];
RequiredAttributesTCGA[DataTypes.GENE_EXPRESSION] = [2, 3, 1]; // ['G', 'GC', 'C'];

const RequiredAttributesClinvar = {};
RequiredAttributesClinvar[DataTypes.MUTATIONS] = [3]; // ['GC'];
RequiredAttributesClinvar[DataTypes.STRUCTURAL_VARIANTS] = [3]; // ['GC'];

const DEFAULT_GENERIC_ERROR_SPEECH_TEXT = "Sorry, something went wrong while processing the request." +
    " Please try again later.";
const DEFAULT_INVALID_STATE_RESPONSE = "Sorry, I got lost during the conversation. Please start over.";
const DEFAULT_NOT_IMPLEMENTED_RESPONSE = "I'm still working on implementing this analysis. Please try again later.";
const DEFAULT_OOV_MAPPING_ERROR_RESPONSE = "Sorry, something went wrong while resolving the query utterance. " + 
    "Please try again later.";
const DEFAULT_OOV_CONNECT_ERROR_RESPONSE = "Sorry, I'm having trouble connecting to the mapper service. " + 
    "Please try again later.";
const DEFAULT_AE_ACCESS_ERROR_RESPONSE = "Sorry, I'm having trouble accessing the dataset. Please try again later.";
const DEFAULT_AE_CONNECT_ERROR_RESPONSE = "Sorry, I'm having trouble connecting to the Melvin service. " + 
    "Please try again later.";

const melvin_error = function (message, type, speech = null) {
    let error = new Error(message);
    error.type = type;
    if (speech != null) {
        error.speech = speech;
    }
    return error;
};

// configure Nunjucks
const RESPONSE_TEMPLATES_PATH = __dirname + "/../resources/response_templates";
const nunjucks_env = nunjucks.configure(RESPONSE_TEMPLATES_PATH, {
    autoescape: false, // do not escape HTML tags (including SSML tags)
    cache:      false
});

nunjucks_env.addGlobal("Object", Object);
nunjucks_env.addGlobal("JSON", JSON);
nunjucks_env.addGlobal("MelvinAttributes", MelvinAttributes);
nunjucks_env.addGlobal("MelvinIntentErrors", MelvinIntentErrors);
nunjucks_env.addGlobal("get_gene_speech_text", get_gene_speech_text);
nunjucks_env.addGlobal("get_study_name_text", get_study_name_text);
nunjucks_env.addGlobal("get_dtype_name_text", get_dtype_name_text);
nunjucks_env.addGlobal("melvin_round", melvin_round);
nunjucks_env.addGlobal("total_cancer_types", total_cancer_types);
nunjucks_env.addGlobal("filter_domains", filter_domains);

module.exports = {
    // Welcome greeting specific to the deployment environment helps to identify which skill is being used
    MELVIN_WELCOME_GREETING:  process.env.MELVIN_WELCOME_GREETING,
    MELVIN_EXPLORER_ENDPOINT: process.env.MELVIN_EXPLORER_ENDPOINT,
    MELVIN_EXPLORER_REGION:   process.env.MELVIN_EXPLORER_REGION,
    MELVIN_EXPLORER_ROLE:     process.env.MELVIN_EXPLORER_INVOKE_ROLE,
    OOV_MAPPER_ENDPOINT:      process.env.OOV_MAPPER_ENDPOINT,
    OOV_MAPPER_REGION:        process.env.OOV_MAPPER_REGION,
    OOV_MAPPER_ROLE:          process.env.OOV_MAPPER_INVOKE_ROLE,
    MELVIN_APP_NAME:          process.env.MELVIN_APP_NAME,
    STAGE:                    process.env.STAGE,
    MelvinAttributes,
    MelvinEventTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    DEFAULT_INVALID_STATE_RESPONSE,
    DEFAULT_NOT_IMPLEMENTED_RESPONSE,
    DEFAULT_OOV_MAPPING_ERROR_RESPONSE,
    DEFAULT_OOV_CONNECT_ERROR_RESPONSE,
    DEFAULT_AE_ACCESS_ERROR_RESPONSE,
    DEFAULT_AE_CONNECT_ERROR_RESPONSE,
    SUPPORTED_SPLITBY_DTYPES,
    get_gene_speech_text,
    get_oov_mappings_response,
    get_study_name_text,
    get_dtype_name_text,
    melvin_round,
    total_cancer_types,
    filter_domains,
    OOVEntityTypes,
    DataTypes,
    DataSources,
    CNATypes,
    melvin_error,
    MelvinIntentErrors,
    MelvinExplorerErrors,
    RequiredAttributesTCGA,
    RequiredAttributesClinvar,
    MELVIN_MAX_HISTORY_ITEMS,
    FOLLOW_UP_TEXT_THRESHOLD,
    MAX_EMAIL_RESULT_COUNT,
    MAX_EMAIL_DURATION,
    nunjucks_env
};