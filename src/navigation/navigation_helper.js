const Speech = require("ssml-builder");
const _ = require("lodash");

const {
    FOLLOW_UP_TEXT_THRESHOLD,
    MelvinAttributes,
    MelvinIntentErrors,
    DataTypes,
    melvin_error,
    get_gene_speech_text,
    get_study_name_text,
    get_dtype_name_text
} = require("../common.js");

const {
    get_melvin_state, match_compare_dtype
} = require("../utils/navigation_utils.js");

const {
    get_state_change_diff, build_text_speech_and_reprompt_response 
} = require("../utils/response_builder_utils.js");

const {
    build_cna_response, build_cna_compare_response
} = require("../cna/cna_response_builder.js");
const {
    build_gain_response, build_gain_compare_response
} = require("../cna/gain_response_builder.js");
const {
    build_loss_response, build_loss_compare_response
} = require("../cna/loss_response_builder.js");

const {
    build_gene_definition_response, build_gene_target_response 
} = require("../gene/gene_response_builder.js");
const { build_sv_response } = require("../structural_variants/sv_helper.js");
const {
    build_gene_expression_response, build_gene_expression_compare_response 
} = require("../gene_expression/response_builder.js");
const { build_mut_cna_compare_response } = require("../comparison/mut_cna_response_builder.js");
const { build_mut_gain_compare_response } = require("../comparison/mut_gain_response_builder.js");
const { build_mut_loss_compare_response } = require("../comparison/mut_loss_response_builder.js");
const { build_gain_loss_compare_response } = require("../comparison/gain_loss_response_builder.js");
const { build_snv_ind_compare_response } = require("../comparison/snv_ind_response_builder.js");
const { build_snv_cna_compare_response } = require("../comparison/snv_cna_response_builder.js");
const { build_ind_cna_compare_response } = require("../comparison/ind_cna_response_builder.js");
const { build_ind_gain_compare_response } = require("../comparison/ind_gain_response_builder.js");
const { build_ind_loss_compare_response } = require("../comparison/ind_loss_response_builder.js");
const { build_snv_gain_compare_response } = require("../comparison/snv_gain_response_builder.js");
const { build_snv_loss_compare_response } = require("../comparison/snv_loss_response_builder.js");
const {
    build_mutations_response,
    build_mutations_domain_response,
    build_mutations_compare_response
} = require("../mutations/mutations_response_builder.js");
const {
    build_indels_response,
    build_indels_domain_response,
    build_indels_compare_response
} = require("../mutations/indels_response_builder.js");
const {
    build_snvs_response, 
    build_snv_domains_response,
    build_snvs_compare_response
} = require("../mutations/snvs_response_builder.js");
const { add_to_APL_text_pager } = require("../utils/APL_utils.js");


const ack_attribute_change = function (handlerInput, state_change) {
    const speech = new Speech();
    const state_diff = get_state_change_diff(state_change);
    if (state_diff["entity_type"] === MelvinAttributes.GENE_NAME) {
        const gene_name = state_diff["entity_value"];
        const gene_speech_text = get_gene_speech_text(gene_name);
        speech.sayWithSSML(`Ok, ${gene_speech_text}.`);

    } else if (state_diff["entity_type"] === MelvinAttributes.STUDY_ABBRV) {
        const study_abbrv = state_diff["entity_value"];
        const study_name = get_study_name_text(study_abbrv);
        speech.say(`Ok, ${study_name}.`);

    } else if (state_diff["entity_type"] === MelvinAttributes.DTYPE) {
        const dtype = state_diff["entity_value"];
        const dtype_name = get_dtype_name_text(dtype);
        speech.say(`Ok, ${dtype_name}.`);
    } else if (state_diff["entity_type"] === MelvinAttributes.DSOURCE) {
        const dsource = state_diff["entity_value"];
        speech.say(`Ok, switching to ${dsource}.`);
    }
    return speech;
};

const build_compare_response = async function (handlerInput, melvin_state, compare_state, state_diff) {
    const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
    const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
    const opts = {
        "BRIEF_MODE":         brief_mode_preference,
        "ENABLE_VOICE_STYLE": true 
    };
    let response = {};
    console.log(`[build_compare_response] melvin_state: ${JSON.stringify(melvin_state)}, `
        + `compare_state: ${JSON.stringify(compare_state)}, state_diff: ${JSON.stringify(state_diff)},`
        + `opts: ${JSON.stringify(opts)}`);

    if (state_diff["entity_type"] === MelvinAttributes.DTYPE) {
        const query_dtypes = [melvin_state[MelvinAttributes.DTYPE], state_diff["entity_value"]];
        if (match_compare_dtype(query_dtypes, [DataTypes.MUTATIONS, DataTypes.CNA])) {
            response = await build_mut_cna_compare_response(
                handlerInput, melvin_state, compare_state, state_diff, opts);

        } else if (match_compare_dtype(query_dtypes, [DataTypes.MUTATIONS, DataTypes.GAIN])) {
            response = await build_mut_gain_compare_response(
                handlerInput, melvin_state, compare_state, state_diff, opts);

        } else if (match_compare_dtype(query_dtypes, [DataTypes.MUTATIONS, DataTypes.LOSS])) {
            response = await build_mut_loss_compare_response(
                handlerInput, melvin_state, compare_state, state_diff, opts);

        } else if (match_compare_dtype(query_dtypes, [DataTypes.GAIN, DataTypes.LOSS])) {
            response = await build_gain_loss_compare_response(
                handlerInput, melvin_state, compare_state, state_diff, opts);

        } else if (match_compare_dtype(query_dtypes, [DataTypes.SNV, DataTypes.CNA])) {
            response = await build_snv_cna_compare_response(
                handlerInput, melvin_state, compare_state, state_diff, opts);

        } else if (match_compare_dtype(query_dtypes, [DataTypes.SNV, DataTypes.INDELS])) {
            response = await build_snv_ind_compare_response(
                handlerInput, melvin_state, compare_state, state_diff, opts);

        } else if (match_compare_dtype(query_dtypes, [DataTypes.INDELS, DataTypes.CNA])) {
            response = await build_ind_cna_compare_response(
                handlerInput, melvin_state, compare_state, state_diff, opts);

        } else if (match_compare_dtype(query_dtypes, [DataTypes.INDELS, DataTypes.GAIN])) {
            response = await build_ind_gain_compare_response(
                handlerInput, melvin_state, compare_state, state_diff, opts);

        } else if (match_compare_dtype(query_dtypes, [DataTypes.INDELS, DataTypes.LOSS])) {
            response = await build_ind_loss_compare_response(
                handlerInput, melvin_state, compare_state, state_diff, opts);

        } else if (match_compare_dtype(query_dtypes, [DataTypes.SNV, DataTypes.GAIN])) {
            response = await build_snv_gain_compare_response(
                handlerInput, melvin_state, compare_state, state_diff, opts);

        } else if (match_compare_dtype(query_dtypes, [DataTypes.SNV, DataTypes.LOSS])) {
            response = await build_snv_loss_compare_response(
                handlerInput, melvin_state, compare_state, state_diff, opts);

        } else {
            throw melvin_error(
                `[build_compare_response] not implemented | melvin_state: ${JSON.stringify(melvin_state)}`,
                MelvinIntentErrors.NOT_IMPLEMENTED,
                "This data type comparison analysis is not yet supported."
            );
        }


    } else if (state_diff["entity_type"] === MelvinAttributes.DSOURCE) {
        throw melvin_error(
            `[build_compare_response] not implemented | melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            "comparisons across data sources are not yet supported."
        );

    } else {
        if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.MUTATIONS) {
            response = await build_mutations_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GAIN) {
            response = await build_gain_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.LOSS) {
            response = await build_loss_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.CNA) {
            response = await build_cna_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.INDELS) {
            response = await build_indels_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.SNV) {
            response = await build_snvs_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GENE_EXPRESSION) {
            response = 
                await build_gene_expression_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        }else {
            throw melvin_error(
                `Error while building compare reponse: melvin_state: ${melvin_state}, ` + 
                    `compare_state: ${compare_state}`,
                MelvinIntentErrors.INVALID_STATE,
                "The data type is missing for comparison."
            );
        }
    }

    return build_text_speech_and_reprompt_response(response, opts);
};

const build_navigation_response = async function (handlerInput, state_change) {
    const melvin_state = get_melvin_state(handlerInput);
    const attr_count = Object.keys(melvin_state).length;
    const preferences = await handlerInput.attributesManager.getPersistentAttributes(true, {});
    const brief_mode_preference = _.has(preferences, "BRIEF_MODE") ? preferences["BRIEF_MODE"] : false;
    const opts = {
        "BRIEF_MODE":         brief_mode_preference,
        "ENABLE_VOICE_STYLE": true 
    };
    console.info(`[build_navigation_response] state_change: ${JSON.stringify(state_change)}, ` +
    `attr_count: ${attr_count}, opts: ${JSON.stringify(opts)}`);

    let response = "";
    if (attr_count <= FOLLOW_UP_TEXT_THRESHOLD || _.isEmpty(melvin_state[MelvinAttributes.DTYPE])) {
        response = ack_attribute_change(handlerInput, state_change);
        let card_text_list = [];
        for (let key in melvin_state) {
            card_text_list.push(`${key}: ${melvin_state[key]}`);
        }
        add_to_APL_text_pager(handlerInput, card_text_list.join("\n"));

    } else {
        if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GENE_DEFINITION) {
            response = await build_gene_definition_response(handlerInput, melvin_state, opts);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GENE_TARGETS) {
            response = await build_gene_target_response(handlerInput, melvin_state, opts);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.MUTATIONS) {
            response = await build_mutations_response(handlerInput, melvin_state, opts);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.IND_DOMAINS) {
            response = await build_indels_domain_response(handlerInput, melvin_state, opts);

        } else if(melvin_state[MelvinAttributes.DTYPE] === DataTypes.SNV_DOMAINS) {
            response = await build_snv_domains_response(handlerInput, melvin_state, opts);

        } else if(melvin_state[MelvinAttributes.DTYPE] === DataTypes.MUT_DOMAINS){
            response = await build_mutations_domain_response(handlerInput, melvin_state, opts);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.INDELS) {
            response = await build_indels_response(handlerInput, melvin_state, opts);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.SNV) {
            response = await build_snvs_response(handlerInput, melvin_state, opts);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GAIN) {
            response = await build_gain_response(handlerInput, melvin_state, opts);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.LOSS) {
            response = await build_loss_response(handlerInput, melvin_state, opts);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.CNA) {
            response = await build_cna_response(handlerInput, melvin_state, opts);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.STRUCTURAL_VARIANTS) {
            response = await build_sv_response(handlerInput, melvin_state, opts);
 
        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GENE_EXPRESSION) {
            response = await build_gene_expression_response(handlerInput, melvin_state, opts);

        } else {
            throw melvin_error(`Unknown data_type found in melvin_state: ${JSON.stringify(melvin_state)}`,
                MelvinIntentErrors.INVALID_DATA_TYPE);
        }
    }

    return build_text_speech_and_reprompt_response(response, opts);
};

module.exports = {
    build_navigation_response,
    build_compare_response,
    ack_attribute_change
};

