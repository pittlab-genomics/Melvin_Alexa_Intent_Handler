const _ = require('lodash');
const nunjucks = require('nunjucks');

const { GeneSSMLMappings } = require('./utils/gene_pronunciation_mappings.js');
const { CANCER_TYPES } = require('./utils/cancer_types.js')

// common types

const MELVIN_MAX_HISTORY_ITEMS = 30;
const FOLLOW_UP_TEXT_THRESHOLD = 2;

const MelvinEventTypes = {
    ANALYSIS_EVENT: "analysis_event",
    NAVIGATION_REVERT_EVENT: "navigation_revert_event",
    NAVIGATION_START_EVENT: "navigation_start_event",
    NAVIGATION_RESET_EVENT: "navigation_reset_event",
    NAVIGATION_EVENT: "navigation_event",
    LAUNCH_EVENT: "launch_event",
    SESSION_ENDED_EVENT: "session_ended",
    IRS_EVENT: "irs_event",
    UNMAPPED_EVENT: "unmapped_event",
    UNKNOWN_EVENT: "unknown_event"
}

const MelvinAttributes = {
    GENE_NAME: "gene_name",
    STUDY_ABBRV: "study_abbreviation",
    DTYPE: "data_type",
    DSOURCE: "data_source"
};

const MelvinExplorerErrors = {
    UNIDENTIFIED_GENE: "UNIDENTIFIED_GENE",
    UNIDENTIFIED_STUDY: "UNIDENTIFIED_STUDY",
    UNIDENTIFIED_LOCATION: "UNIDENTIFIED LOCATION",
    NO_TRIAL_IN_VICINITY: "NO_TRIAL_IN_VICINITY"
};

const MelvinIntentErrors = {
    OOV_ERROR: "OOV_ERROR",
    INVALID_STATE: "INVALID_STATE",
    INVALID_ENTITY_TYPE: "INVALID_ENTITY_TYPE",
    INVALID_DATA_TYPE: "INVALID_DATA_TYPE",
    INVALID_API_RESPOSE: "INVALID_API_RESPOSE",
    MISSING_GENE: "MISSING_GENE",
    MISSING_STUDY: "MISSING_STUDY",
    NOT_IMPLEMENTED: "NOT_IMPLEMENTED"
};

const OOVEntityTypes = {
    GENE: "GENE",
    STUDY: "STUDY",
    DTYPE: "DTYPE",
    DSOURCE: "DSOURCE"
};

const DataTypes = {
    OVERVIEW: "OVERVIEW",
    GENE_DEFINITION: "GENE_DEFINITION",
    MUTATIONS: "MUTATIONS",
    MUTATION_DOMAINS: "MUTATION_DOMAINS",
    GENE_EXPRESSION: "GENE_EXPRESSION",
    CNA_ALTERATIONS: "CNA_ALTERATIONS",
    CNA_AMPLIFICATIONS: "CNA_AMPLIFICATIONS",
    CNA_DELETIONS: "CNA_DELETIONS",
    STRUCTURAL_VARIANTS: "STRUCTURAL_VARIANTS"
};

const DataSources = {
    TCGA: "TCGA",
    CLINVAR: "CLINVAR"
};

const CNATypes = {
    AMPLIFICATIONS: "amplifications",
    DELETIONS: "deletions",
    ALTERATIONS: "alterations"
};

const get_gene_speech_text = function (gene_name) {
    return (_.has(GeneSSMLMappings, gene_name) ? GeneSSMLMappings[gene_name] : gene_name);
}

const get_study_name_text = function (study_abbrv) {
    return (_.has(CANCER_TYPES, study_abbrv) ? CANCER_TYPES[study_abbrv] : study_abbrv);
}

const melvin_round = function (value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

/*
 * G (Gene) | C (CancerType)
 * [] = 0, [G] = 2, [C] = 1, [GC] = 3
*/
const RequiredAttributesTCGA = {};
RequiredAttributesTCGA[DataTypes.OVERVIEW] = [3, 2, 1];
RequiredAttributesTCGA[DataTypes.GENE_DEFINITION] = [2]; // ['G'];
RequiredAttributesTCGA[DataTypes.MUTATIONS] = [3, 2, 1]; // ['GC', 'G', 'C'];
RequiredAttributesTCGA[DataTypes.MUTATION_DOMAINS] = [3, 2, 1]; // ['GC', 'G', 'C'];
RequiredAttributesTCGA[DataTypes.CNA_ALTERATIONS] = [3, 1, 2]; // ['GC', 'C', 'G'];
RequiredAttributesTCGA[DataTypes.CNA_AMPLIFICATIONS] = [3, 1, 2]; // ['GC', 'C', 'G'];
RequiredAttributesTCGA[DataTypes.CNA_DELETIONS] = [3, 1, 2]; // ['GC', 'C', 'G'];
RequiredAttributesTCGA[DataTypes.GENE_EXPRESSION] = [2, 3, 1]; // ['G', 'GC', 'C'];

const RequiredAttributesClinvar = {};
RequiredAttributesClinvar[DataTypes.OVERVIEW] = [1, 2]; // ['C', 'G'];
RequiredAttributesClinvar[DataTypes.MUTATIONS] = [3]; // ['GC'];
RequiredAttributesClinvar[DataTypes.STRUCTURAL_VARIANTS] = [3]; // ['GC'];

const DEFAULT_GENERIC_ERROR_SPEECH_TEXT = "Sorry, something went wrong while processing the request." +
    " Please try again later."
const DEFAULT_INVALID_STATE_RESPONSE = "Sorry, I got lost during the conversation. Please start over.";
const DEFAULT_NOT_IMPLEMENTED_RESPONSE = "I'm still working on implementing this analysis. Please try again later.";

const melvin_error = function (message, type, speech = null) {
    let error = new Error(message);
    error.type = type;
    if (speech != null) {
        error.speech = speech;
    }
    return error;
}

// configure Nunjucks
const RESPONSE_TEMPLATES_PATH = __dirname + '/../resources/response_templates'
const nunjucks_env = nunjucks.configure(RESPONSE_TEMPLATES_PATH, {
    autoescape: true,
    cache: false
});

nunjucks_env.addGlobal('Object', Object);
nunjucks_env.addGlobal('JSON', JSON);
nunjucks_env.addGlobal('MelvinAttributes', MelvinAttributes);
nunjucks_env.addGlobal('MelvinIntentErrors', MelvinIntentErrors);
nunjucks_env.addGlobal('get_gene_speech_text', get_gene_speech_text);
nunjucks_env.addGlobal('get_study_name_text', get_study_name_text);
nunjucks_env.addGlobal('melvin_round', melvin_round);

module.exports = {
    // Welcome greeting specific to the deployment environment helps to identify which skill is being used
    MELVIN_WELCOME_GREETING: process.env.MELVIN_WELCOME_GREETING,
    MELVIN_EXPLORER_ENDPOINT: process.env.MELVIN_EXPLORER_ENDPOINT,
    OOV_MAPPER_ENDPOINT: process.env.OOV_MAPPER_ENDPOINT,
    MELVIN_APP_NAME: process.env.MELVIN_APP_NAME,
    MelvinAttributes,
    MelvinEventTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    DEFAULT_INVALID_STATE_RESPONSE,
    DEFAULT_NOT_IMPLEMENTED_RESPONSE,
    get_gene_speech_text,
    get_study_name_text,
    melvin_round,
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
    nunjucks_env
};