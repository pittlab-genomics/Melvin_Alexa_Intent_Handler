// common types

const MelvinAttributes = {
    GENE_NAME: "gene_name",
    STUDY_NAME: "study_name",
    STUDY_ABBRV: "study_abbreviation",
    DTYPE: "data_type"
};

const MelvinExplorerErrors = {
    UNIDENTIFIED_GENE: "UNIDENTIFIED_GENE",
    UNIDENTIFIED_STUDY: "UNIDENTIFIED_STUDY"
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
    DTYPE: "DTYPE"
};

const DataTypes = {
    MUTATIONS: "MUTATIONS",
    EXPRESSION: "EXPRESSION",
    CNV_ALTERATIONS: "CNV_ALTERATIONS",
    CNV_AMPLIFICATIONS: "CNV_AMPLIFICATIONS",
    CNV_DELETIONS: "CNV_DELETIONS",
    MUTATION_DOMAINS: "MUTATION_DOMAINS",
    GENE_DEFINITION: "GENE_DEFINITION"
};

const CNVTypes = {
    APLIFICATIONS: "amplifications",
    DELETIONS: "deletions",
    ALTERATIONS: "alterations"
};

const GeneSpeechResponses = {
    "PIK3CA": "Pik 3 CA",
    "BRAF": "B raff",
    "CTNNB1": "Catenin Beta 1"
};

const get_gene_speech_text = function (gene_name) {
    return (GeneSpeechResponses[gene_name] ? GeneSpeechResponses[gene_name] : gene_name);
}

/*
 * G (Gene) | C (CancerType)
 * [] = 0, [G] = 2, [C] = 1, [GC] = 3
*/
const RequiredAttributes = {};
RequiredAttributes[DataTypes.GENE_DEFINITION] = [2]; // ['G'];
RequiredAttributes[DataTypes.MUTATIONS] = [3, 2]; // ['GC', 'G'];
RequiredAttributes[DataTypes.MUTATION_DOMAINS] = [3, 2]; // ['GC', 'G'];
RequiredAttributes[DataTypes.CNV_ALTERATIONS] = [3, 1]; // ['GC', 'C'];
RequiredAttributes[DataTypes.CNV_AMPLIFICATIONS] = [3, 1]; // ['GC', 'C'];
RequiredAttributes[DataTypes.CNV_DELETIONS] = [3, 1]; // ['GC', 'C'];

const DEFAULT_ERROR_SPEECH_TEXT = "Sorry, something went wrong while processing the request. Please try again later."

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
    MelvinAttributes,
    DEFAULT_ERROR_SPEECH_TEXT,
    get_gene_speech_text,
    OOVEntityTypes,
    DataTypes,
    CNVTypes,
    melvin_error,
    MelvinIntentErrors,
    MelvinExplorerErrors,
    RequiredAttributes
};