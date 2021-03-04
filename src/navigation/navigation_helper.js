const Speech = require("ssml-builder");
const _ = require("lodash");

const { get_state_change_diff, } = require("../utils/response_builder_utils.js");
const {
    FOLLOW_UP_TEXT_THRESHOLD,
    MelvinAttributes,
    MelvinIntentErrors,
    DataTypes,
    melvin_error,
    get_gene_speech_text,
    get_study_name_text,
    get_dtype_name_text,
    MELVIN_APP_NAME,
} = require("../common.js");

const {
    get_melvin_state, match_compare_dtype 
} = require("../utils/navigation_utils.js");

const {
    build_cna_response, build_cna_compare_response
} = require("../cna/cna_response_builder.js");
const {
    build_gain_response, build_gain_compare_response
} = require("../cna/gain_response_builder.js");
const {
    build_loss_response, build_loss_compare_response
} = require("../cna/loss_response_builder.js");

const { build_gene_definition_response } = require("../gene/gene_response_builder.js");
const { build_sv_response } = require("../structural_variants/sv_helper.js");
const { build_gene_expression_response } = require("../gene_expression/response_builder.js");
const { build_mut_cna_compare_response } = require("../comparison/mut_cna_response_builder.js");
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


function add_followup_text(handlerInput, speech) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    if (Object.keys(sessionAttributes["MELVIN.STATE"]).length <= FOLLOW_UP_TEXT_THRESHOLD) {
        speech.prosody({ rate: "110%" }, "What would you like to know?");
    }
}

const ack_attribute_change = function (handlerInput, state_change) {
    const speech = new Speech();
    const state_diff = get_state_change_diff(state_change);

    if (state_diff["entity_type"] === MelvinAttributes.GENE_NAME) {
        const gene_name = state_diff["entity_value"];
        const gene_speech_text = get_gene_speech_text(gene_name);
        speech.sayWithSSML(`Ok, ${gene_speech_text}.`);
        add_followup_text(handlerInput, speech);

    } else if (state_diff["entity_type"] === MelvinAttributes.STUDY_ABBRV) {
        const study_abbrv = state_diff["entity_value"];
        const study_name = get_study_name_text(study_abbrv);
        speech.say(`Ok, ${study_name}.`);
        add_followup_text(handlerInput, speech);

    } else if (state_diff["entity_type"] === MelvinAttributes.DSOURCE) {
        const dsource = state_diff["entity_value"];
        speech.say(`Ok, switching to ${dsource}.`);

    } else if (state_diff["entity_type"] === MelvinAttributes.DTYPE) {
        const dtype = state_diff["entity_value"];
        const dtype_name = get_dtype_name_text(dtype);
        speech.say(`Ok, ${dtype_name}.`);
        add_followup_text(handlerInput, speech);
    }

    return { "speech_text": speech.ssml() };
};

const build_compare_response = async function (handlerInput, melvin_state, compare_state, state_diff) {
    let response = {};
    console.log(`[build_compare_response] melvin_state: ${JSON.stringify(melvin_state)}, `
        + `compare_state: ${JSON.stringify(compare_state)}, state_diff: ${JSON.stringify(state_diff)}`);

    if (state_diff["entity_type"] === MelvinAttributes.DTYPE) {
        const query_dtypes = [melvin_state[MelvinAttributes.DTYPE], state_diff["entity_value"]];
        if (match_compare_dtype(query_dtypes, [DataTypes.MUTATIONS, DataTypes.CNA])) {
            response = await build_mut_cna_compare_response(handlerInput, melvin_state, state_diff);

        } else {
            throw melvin_error(
                `[build_compare_response] not implemented | melvin_state: ${JSON.stringify(melvin_state)}`,
                MelvinIntentErrors.NOT_IMPLEMENTED,
                "This data type comparison analysis is not yet supported"
            );
        }


    } else if (state_diff["entity_type"] === MelvinAttributes.DSOURCE) {
        throw melvin_error(
            `[build_compare_response] not implemented | melvin_state: ${JSON.stringify(melvin_state)}`,
            MelvinIntentErrors.NOT_IMPLEMENTED,
            "comparisons across data sources are not yet supported"
        );

    } else {
        if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.MUTATIONS) {
            response = await build_mutations_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.PROTEIN_DOMAINS) {
            response = await build_mutations_domain_response(handlerInput, melvin_state);

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
            response = await build_cna_compare_response(handlerInput, melvin_state, compare_state, state_diff);

        }else {
            throw melvin_error(
                `Error while building compare reponse: melvin_state: ${melvin_state}, ` + 
                    `compare_state: ${compare_state}`,
                MelvinIntentErrors.INVALID_STATE,
                "The data type is missing for comparison."
            );
        }
    }


    console.log(`[build_compare_response] response = ${JSON.stringify(response)}`);
    return response;
};

const build_navigation_response = async function (handlerInput, state_change) {
    const melvin_state = get_melvin_state(handlerInput);
    const attr_count = Object.keys(melvin_state).length;
    console.log(`[build_navigation_response] state_change: ${JSON.stringify(state_change)}, ` +
        `attr_count: ${attr_count}`);

    let response = "";
    if (attr_count <= FOLLOW_UP_TEXT_THRESHOLD || _.isEmpty(melvin_state[MelvinAttributes.DTYPE])) {
        response = ack_attribute_change(handlerInput, state_change);
        let card_text_list = [];
        for (let key in melvin_state) {
            card_text_list.push(`${key}: ${melvin_state[key]}`);
        }
        handlerInput.responseBuilder.withSimpleCard(MELVIN_APP_NAME, card_text_list.join("\n"));

    } else {
        if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GENE_DEFINITION) {
            response = await build_gene_definition_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.MUTATIONS) {
            response = await build_mutations_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.PROTEIN_DOMAINS) {
            const prev_dtype = state_change["prev_state"]["data_type"];
            if(prev_dtype === DataTypes.INDELS) {
                response = await build_indels_domain_response(handlerInput, melvin_state);
            } else if(prev_dtype === DataTypes.SNV) {
                response = await build_snv_domains_response(handlerInput, melvin_state);
            } else {
                response = await build_mutations_domain_response(handlerInput, melvin_state);
            }

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.INDELS) {
            response = await build_indels_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.SNV) {
            response = await build_snvs_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GAIN) {
            response = await build_gain_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.LOSS) {
            response = await build_loss_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.CNA) {
            response = await build_cna_response(handlerInput, melvin_state);

        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.STRUCTURAL_VARIANTS) {
            response = await build_sv_response(handlerInput, melvin_state);
 
        } else if (melvin_state[MelvinAttributes.DTYPE] === DataTypes.GENE_EXPRESSION) {
            response = await build_gene_expression_response(handlerInput, melvin_state);

        } else {
            throw melvin_error(`Unknown data_type found in melvin_state: ${JSON.stringify(melvin_state)}`,
                MelvinIntentErrors.INVALID_DATA_TYPE);
        }
    }
    return response;
};

module.exports = {
    build_navigation_response,
    build_compare_response,
    ack_attribute_change
};

