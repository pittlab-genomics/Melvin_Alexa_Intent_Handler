const _ = require("lodash");
const nunjucks = require("nunjucks");
require("console-stamp")(console, { format: ":date(yyyy/mm/dd HH:MM:ss.l) :label" });

const { GeneSSMLMappings } = require("./utils/gene_pronunciation_mappings.js");
const { CANCER_TYPES } = require("./utils/cancer_types.js");
const { DATA_TYPES } = require("./utils/data_types.js");
const { OOVMappings } = require("./utils/oov_mappings.js");


const MELVIN_MAX_HISTORY_ITEMS = 30;
const FOLLOW_UP_TEXT_THRESHOLD = 2;
const MAX_EMAIL_RESULT_COUNT = 100;
const MIN_EMAIL_RESULT_COUNT = 1;
const MAX_EMAIL_DURATION = 604800; // 1 week

const UserPreferences = {
    "custom mappings": "CUSTOM_MAPPINGS",
    "brief mode":      "BRIEF_MODE"
};

const MelvinEventTypes = {
    ANALYSIS_EVENT:           "analysis_event",
    NAVIGATION_REVERT_EVENT:  "navigation_revert_event",
    NAVIGATION_START_EVENT:   "navigation_start_event",
    NAVIGATION_RESET_EVENT:   "navigation_reset_event",
    NAVIGATION_EVENT:         "navigation_event",
    LAUNCH_EVENT:             "launch_event",
    SESSION_ENDED_EVENT:      "session_ended",
    IRS_EVENT:                "irs_event",
    ENABLE_PREFERENCE_EVENT:  "enable_preference_event",
    DISABLE_PREFERENCE_EVENT: "disable_preference_event",
    UNMAPPED_EVENT:           "unmapped_event",
    UNKNOWN_EVENT:            "unknown_event"
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
    INVALID_ARGUMENTS:    "INVALID_ARGUMENTS",
    MISSING_GENE:         "MISSING_GENE",
    MISSING_DTYPE:        "MISSING_DTYPE",
    MISSING_STUDY:        "MISSING_STUDY",
    NOT_IMPLEMENTED:      "NOT_IMPLEMENTED",
    AUTH_ERROR:           "AUTH_ERROR"
};

const OOVEntityTypes = {
    GENE:    "GENE",
    STUDY:   "STUDY",
    DTYPE:   "DTYPE",
    DSOURCE: "DSOURCE"
};

const DataTypes = {
    GENE_DEFINITION:     "GENE_DEFINITION",
    GENE_TARGETS:        "GENE_TARGETS",
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

const get_whitelisted_oov_mapping = function (query) {
    let response = null;
    if (_.has(OOVMappings, query)) {
        response = OOVMappings[query];
        console.info(`[whitelisted_oov_mapping] Whitelisted mapping found | query: ${query}, response: ${response}`);
    }

    return response;
};

const get_user_preference_name = function (pref) {
    return (_.has(UserPreferences, pref) ? UserPreferences[pref] : "");
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

const filter_domains = function (records) {
    return records.filter(item => item.domain !== "none");
};

const total_cancer_types = 33;

/*
 * G (Gene) | C (CancerType)
 * [] = 0, [G] = 2, [C] = 1, [GC] = 3
*/
const RequiredAttributesTCGA = {};
RequiredAttributesTCGA[DataTypes.GENE_DEFINITION] = [2]; // ['G'];
RequiredAttributesTCGA[DataTypes.GENE_TARGETS] = [2]; // ['G'];
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

const OOV_PR_SPEECH = "I'm still trying to resolve the query, please wait.<break time=\"2s\"/>";
const AE_PR_SPEECH = "I'm still working on that, please wait.<break time=\"2s\"/>";
const AE_PR_SPEECH_RETRY = "This is taking longer than usual, please wait.<break time=\"2s\"/>";

const GOODBYE_SPEECH = "Thank you for using Melvin. Goodbye!";
const DEFAULT_ERROR_REPROMPT = "Please try again.";
const DEFAULT_GENERIC_ERROR_SPEECH_TEXT = "Sorry, something went wrong while processing the request." +
    " Please try again later.";
const DEFAULT_INVALID_STATE_RESPONSE = "Sorry, I got lost during the conversation. Please start over.";
const DEFAULT_NOT_IMPLEMENTED_RESPONSE = "I'm still working on implementing this analysis. Please try again later.";
const DEFAULT_OOV_MAPPING_ERROR_RESPONSE = "Sorry, something went wrong while resolving the query utterance. " +
    "Please try again later.";

const PREFERENCES_UPDATE_SUCCESS = "Your preference was updated. <break time=\"300ms\"/>What else?";
const PREFERENCES_PROF_INFO_ERROR_RESPONSE = "Something went wrong while updating your preference." +
    "Please try again later.";
const PREFERENCES_PROF_INFO_API_ERROR_RESPONSE = "Something went wrong while retrieving your profile information." +
    "Please try again later.";
const PREFERENCES_PERMISSION_ERROR = "You must authenticate with your Amazon Account to use this feature." 
    + "Please go to the home screen in your Alexa app and follow the instructions. <break time=\"300ms\"/>What else?";
    
const DEFAULT_AE_ACCESS_ERROR_RESPONSE = "Sorry, I'm having trouble accessing the dataset. Please try again later.";
const DEFAULT_AE_CONNECT_ERROR_RESPONSE = "Sorry, I'm having trouble connecting to the Melvin service. " +
    "Please try again later.";
const EMAIL_ERROR = "Something went wrong while sending the results. Please try again later.";
const EMAIL_SUCCESS_RANGE = "Ok, I'm emailing results during that period. " 
    + "Please check your inbox in a while. <break time=\"300ms\"/> What else?";
const EMAIL_SUCCESS_COUNT = "Ok, I'm emailing that to you now. Please check your inbox in a while." 
    + "<break time=\"300ms\"/>What else?";
const EMAIL_SUCCESS_REPROMPT = "Please check your inbox in a while. <break time=\"300ms\"/>What else?";
const EMAIL_PERMISSION_ERROR = "In order to email, Melvin will need access to your email address. " 
    + "Go to the home screen in your Alexa app and grant me permissions.";
const RESTORE_SESSION_NO_PREV = "I could not find any previous sessions. " 
    + "Please continue with current analysis.";
const RESTORE_SESSION_NO_ANALYSIS = "I could not find any analysis performed in your previous session. " 
    + "Please continue with current analysis.";
const RESTORE_SESSION_ERROR = "Something went wrong while restoring the session. Please try again later.";
const RESTORE_SESSION_SUCCESS = "Ok. Your last session was restored. You may continue from your last analysis now.";
const RESTORE_SESSION_SUCCESS_REPROMPT = "Your last session was restored. <break time=\"300ms\"/>What else?";
const STEP_BACK_END = "I'm unable to step back as you have reached the end. Please provide a new query.";
const STEP_BACK_END_REPROMPT = "Please provide a new query.";
const SPLITBY_ERROR_INCOMPLETE_STATE = "Sorry, this split-by operation is not supported. "
    + "You need to perform a preliminary analysis with a gene and a cancer type in a particular datatype. "
    + "Only then you can splitby another gene or datatype within the same cancer type. "
    + "Now, what would you like to know?";
const SPLITBY_INVALID_GENE = "Please tell me a different gene from the preliminary analysis. "
    + "Which gene would you like to split by?";
const SPLITBY_DTYPE_NOT_SUPPORTED = "Sorry, this split-by operation is not supported. "
    + "Please provide a different datatype. Which data type would you like to split by?";
const SPLITBY_ELICIT_DTYPE = "Which data type would you like to split by?";
const SPLITBY_ELICIT_GENE = "Which gene would you like to split by?";


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

const delay_ms = (ms, controller) => {
    return new Promise(resolve => {
        controller.signal.addEventListener("abort", () => {
            resolve();
        });
        setTimeout(resolve, ms);
    });
};

module.exports = {
    // Welcome greeting specific to the deployment environment helps to identify which skill is being used
    MELVIN_WELCOME_GREETING:  process.env.MELVIN_WELCOME_GREETING,
    MELVIN_EXPLORER_ENDPOINT: process.env.MELVIN_EXPLORER_ENDPOINT,
    MELVIN_EXPLORER_REGION:   process.env.MELVIN_EXPLORER_REGION,
    MELVIN_API_INVOKE_ROLE:   process.env.MELVIN_API_INVOKE_ROLE,
    OOV_MAPPER_ENDPOINT:      process.env.OOV_MAPPER_ENDPOINT,
    OOV_MAPPER_REGION:        process.env.OOV_MAPPER_REGION,
    PROFILE_INFO_ENDPOINT:    process.env.PROFILE_INFO_ENDPOINT,
    MELVIN_APP_NAME:          process.env.MELVIN_APP_NAME,
    STAGE:                    process.env.STAGE,
    WARMUP_SERVICE_ENABLED:   process.env.WARMUP_SERVICE_ENABLED,
    delay_ms,
    MelvinAttributes,
    MelvinEventTypes,
    get_user_preference_name,
    OOV_PR_SPEECH,
    AE_PR_SPEECH,
    AE_PR_SPEECH_RETRY,
    GOODBYE_SPEECH,
    DEFAULT_GENERIC_ERROR_SPEECH_TEXT,
    DEFAULT_INVALID_STATE_RESPONSE,
    DEFAULT_NOT_IMPLEMENTED_RESPONSE,
    DEFAULT_OOV_MAPPING_ERROR_RESPONSE,
    DEFAULT_AE_ACCESS_ERROR_RESPONSE,
    DEFAULT_AE_CONNECT_ERROR_RESPONSE,
    PREFERENCES_PROF_INFO_ERROR_RESPONSE,
    PREFERENCES_PROF_INFO_API_ERROR_RESPONSE,
    PREFERENCES_PERMISSION_ERROR,
    PREFERENCES_UPDATE_SUCCESS,
    DEFAULT_ERROR_REPROMPT,
    EMAIL_ERROR,
    EMAIL_SUCCESS_RANGE,
    EMAIL_SUCCESS_COUNT,
    EMAIL_SUCCESS_REPROMPT,
    EMAIL_PERMISSION_ERROR,
    RESTORE_SESSION_NO_PREV,
    RESTORE_SESSION_NO_ANALYSIS,
    RESTORE_SESSION_ERROR,
    RESTORE_SESSION_SUCCESS,
    RESTORE_SESSION_SUCCESS_REPROMPT,
    STEP_BACK_END,
    STEP_BACK_END_REPROMPT,
    SPLITBY_ERROR_INCOMPLETE_STATE,
    SPLITBY_INVALID_GENE,
    SPLITBY_DTYPE_NOT_SUPPORTED,
    SPLITBY_ELICIT_DTYPE,
    SPLITBY_ELICIT_GENE,
    SUPPORTED_SPLITBY_DTYPES,
    get_gene_speech_text,
    get_whitelisted_oov_mapping,
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
    MIN_EMAIL_RESULT_COUNT,
    MAX_EMAIL_DURATION,
    RESPONSE_TEMPLATES_PATH,
    nunjucks_env
};