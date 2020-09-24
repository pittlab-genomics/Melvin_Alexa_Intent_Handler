const Speech = require("ssml-builder");
const _ = require("lodash");
const { add_to_APL_image_pager } = require("../utils/APL_utils.js");
const { add_query_params } = require("../utils/response_builder_utils.js");

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_INVALID_STATE_RESPONSE,
    DEFAULT_NOT_IMPLEMENTED_RESPONSE,
    get_gene_speech_text,
    get_study_name_text,
    MELVIN_EXPLORER_ENDPOINT
} = require("../common.js");

const { get_sv_clinvar_stats } = require("../http_clients/melvin_explorer_client.js");

async function build_sv_clinvar_response(handlerInput, params) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_sv_clinvar_stats(handlerInput, params);

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        speech.say(DEFAULT_NOT_IMPLEMENTED_RESPONSE);

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        add_sv_clinvar_plot(image_list, params);
        const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
        const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);
        const data = response["data"];
        const sv_types_count = Object.keys(data).length;
        const top_sv = Object.keys(data)[0];
        const top_sv_count = data[top_sv];
        if (sv_types_count > 1) {
            speech
                .sayWithSSML(`In ${gene_speech_text},`)
                .say(`there are ${sv_types_count} types of structural variants`)
                .say(`for ${study} with the most frequent one being`)
                .say(`${top_sv} with ${top_sv_count}`);
            (top_sv_count == 1) ? speech.say("variant") : speech.say("variants");

        } else if (sv_types_count == 1) {
            speech
                .sayWithSSML(`In ${gene_speech_text},`)
                .say(`${top_sv} is the only type of structural variant with ${top_sv_count} variants`)
                .say(`for ${study}`);
        } else {
            speech
                .say("There are no structural variants at")
                .sayWithSSML(gene_speech_text)
                .say(`for ${study}`);
        }

    } else if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        speech.say(DEFAULT_NOT_IMPLEMENTED_RESPONSE);

    } else {
        throw melvin_error(
            `[build_sv_clinvar_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }

    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech.ssml() };
}

const add_sv_clinvar_plot = function (image_list, params) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/structural_variants/clinvar/plot`);
    add_query_params(count_plot_url, params);
    image_list.push(count_plot_url);
};

module.exports = { build_sv_clinvar_response };
