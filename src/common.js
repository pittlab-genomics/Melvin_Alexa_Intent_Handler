const MelvinExplorerErrors = {
    UNIDENTIFIED_GENE: "UNIDENTIFIED_GENE",
    UNIDENTIFIED_STUDY: "UNIDENTIFIED_STUDY"
};

const MelvinIntentErrors = {
    OOV_ERROR: "OOV_ERROR",
    INVALID_ENTITY_TYPE: "INVALID_ENTITY_TYPE",
    INVALID_DATA_TYPE: "INVALID_DATA_TYPE",
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
    MUTATION_DOMAINS: "MUTATION_DOMAINS"
}

const CNVTypes = {
    APLIFICATIONS: "amplifications",
    CNV_DELETIONS: "deletions",
    ALTERATIONS: "alterations"
};

const RequiredAttributes = {};
RequiredAttributes[DataTypes.MUTATIONS] = { has_gene: true, has_study: false };
RequiredAttributes[DataTypes.MUTATION_DOMAINS] = { has_gene: true, has_study: false };
RequiredAttributes[DataTypes.CNV_ALTERATIONS] = { has_gene: true, has_study: true };
RequiredAttributes[DataTypes.CNV_AMPLIFICATIONS] = { has_gene: true, has_study: true };
RequiredAttributes[DataTypes.CNV_DELETIONS] = { has_gene: true, has_study: true };

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
    MELVIN_EXPLORER_ENDPOINT: process.env.MELVIN_EXPLORER_ENDPOINT,
    OOV_MAPPER_ENDPOINT: process.env.OOV_MAPPER_ENDPOINT,
    DEFAULT_ERROR_SPEECH_TEXT,
    OOVEntityTypes,
    DataTypes,
    CNVTypes,
    melvin_error,
    MelvinIntentErrors,
    MelvinExplorerErrors,
    RequiredAttributes
};