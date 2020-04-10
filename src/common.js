const _ = require('lodash');
const { GeneSSMLMappings } = require('./utils/gene_pronunciation_mappings.js');

// common types

const MelvinEventTypes = {
    ANALYSIS_EVENT: "analysis_event",
    NAVIGATION_EVENT: "navigation_event",
    IRS_EVENT: "irs_event",
    UNKNOWN: "unknown"
}

const MelvinAttributes = {
    GENE_NAME: "gene_name",
    STUDY_NAME: "study_name",
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
    MISSING_STUDY: "MISSING_STUDY"
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
    EXPRESSION: "EXPRESSION",
    CNV_ALTERATIONS: "CNV_ALTERATIONS",
    CNV_AMPLIFICATIONS: "CNV_AMPLIFICATIONS",
    CNV_DELETIONS: "CNV_DELETIONS",
    STRUCTURAL_VARIANTS: "STRUCTURAL_VARIANTS"
};

const DataSources = {
    TCGA: "TCGA",
    CLINVAR: "CLINVAR"
};

const CNVTypes = {
    AMPLIFICATIONS: "amplifications",
    DELETIONS: "deletions",
    ALTERATIONS: "alterations"
};

const get_gene_speech_text = function (gene_name) {
    return (_.has(GeneSSMLMappings, gene_name) ? GeneSSMLMappings[gene_name] : gene_name);
}

/*
 * G (Gene) | C (CancerType)
 * [] = 0, [G] = 2, [C] = 1, [GC] = 3
*/
const RequiredAttributesTCGA = {};
RequiredAttributesTCGA[DataTypes.OVERVIEW] = [];
RequiredAttributesTCGA[DataTypes.GENE_DEFINITION] = [2]; // ['G'];
RequiredAttributesTCGA[DataTypes.MUTATIONS] = [3, 2, 1]; // ['GC', 'G', 'C'];
RequiredAttributesTCGA[DataTypes.MUTATION_DOMAINS] = [3, 2, 1]; // ['GC', 'G', 'C'];
RequiredAttributesTCGA[DataTypes.CNV_ALTERATIONS] = [3, 1]; // ['GC', 'C'];
RequiredAttributesTCGA[DataTypes.CNV_AMPLIFICATIONS] = [3, 1]; // ['GC', 'C'];
RequiredAttributesTCGA[DataTypes.CNV_DELETIONS] = [3, 1]; // ['GC', 'C'];

const RequiredAttributesClinvar = {};
RequiredAttributesClinvar[DataTypes.OVERVIEW] = [1, 2]; // ['C', 'G'];
RequiredAttributesClinvar[DataTypes.MUTATIONS] = [3]; // ['GC'];
RequiredAttributesClinvar[DataTypes.STRUCTURAL_VARIANTS] = [3]; // ['GC'];

const DEFAULT_GENERIC_ERROR_SPEECH_TEXT = "Sorry, something went wrong while processing the request." +
    " Please try again later."

const DEFAULT_MELVIN_ERROR_SPEECH_TEXT = "Sorry, I got lost during the conversation. Please start over.";

const DEFAULT_MELVIN_NOT_IMPLEMENTED_RESPONSE = "I'm still working on this analysis. Please try again later.";

const melvin_error = function (message, type, speech = null) {
    let error = new Error(message);
    error.type = type;
    if (speech != null) {
        error.speech = speech;
    }
    return error;
}

module.exports = {
    // Welcome greeting specific to the deployment environment helps to identify which skill is being used
    MELVIN_WELCOME_GREETING: process.env.MELVIN_WELCOME_GREETING,
    MELVIN_EXPLORER_ENDPOINT: process.env.MELVIN_EXPLORER_ENDPOINT,
    OOV_MAPPER_ENDPOINT: process.env.OOV_MAPPER_ENDPOINT,
    MELVIN_APP_NAME: process.env.MELVIN_APP_NAME,
    MelvinAttributes,
    MelvinEventTypes,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT,
    DEFAULT_MELVIN_NOT_IMPLEMENTED_RESPONSE,
    get_gene_speech_text,
    OOVEntityTypes,
    DataTypes,
    DataSources,
    CNVTypes,
    melvin_error,
    MelvinIntentErrors,
    MelvinExplorerErrors,
    RequiredAttributesTCGA,
    RequiredAttributesClinvar
};