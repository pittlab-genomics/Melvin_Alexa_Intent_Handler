const URL = require("url").URL;
const Speech = require("ssml-builder");
const _ = require("lodash");
const { add_to_APL_image_pager } = require("../utils/APL_utils.js");
const {
    round, add_query_params 
} = require("../utils/response_builder_utils.js");

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_INVALID_STATE_RESPONSE,
    get_gene_speech_text,
    get_study_name_text,
    MELVIN_EXPLORER_ENDPOINT
} = require("../common.js");

const { get_mutations_tcga_stats } = require("../http_clients/melvin_explorer_client.js");


function _populate_overview_by_gene_response(params, mut_response, cna_response, speech) {
    const mutated_cancer_type_count = mut_response["data"]["cancer_types_with_mutated_gene"];
    const total_cancer_types = mut_response["data"]["total_cancer_types"];
    const records_list = mut_response["data"]["records"];
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);

    if (Array.isArray(records_list)) {
        speech
            .sayWithSSML(gene_speech_text)
            .say(`mutations are found in ${mutated_cancer_type_count}`)
            .say(`out of ${total_cancer_types} cancer types.`);

        if (records_list.length >= 2) {
            speech
                .say(`It is most mutated in ${get_study_name_text(records_list[0][MelvinAttributes.STUDY_ABBRV])} at `)
                .say(round(records_list[0]["percent_cancer_patients_with_mutgene"], 1))
                .say(`percent, followed by ${get_study_name_text(records_list[1][MelvinAttributes.STUDY_ABBRV])} at `)
                .say(round(records_list[1]["percent_cancer_patients_with_mutgene"], 1))
                .say("percent.");

        } else if (records_list.length >= 1) {
            speech
                .sayWithSSML(gene_speech_text)
                .say(`mutations are found in ${mutated_cancer_type_count}`)
                .say(`out of ${total_cancer_types} cancer types.`)
                .say(`It is most mutated in ${get_study_name_text(records_list[0][MelvinAttributes.STUDY_ABBRV])} at `)
                .say(`${round(records_list[0]["percent_cancer_patients_with_mutgene"], 1)} percent.`);

        } else {
            speech
                .sayWithSSML(`I could not find any ${gene_speech_text} mutations.`);
        }

    } else {
        throw melvin_error(
            `Invalid response from MELVIN_EXPLORER: ${JSON.stringify(mut_response)}`,
            MelvinIntentErrors.INVALID_API_RESPOSE,
            `Sorry, I'm having trouble accessing mutations records for ${gene_speech_text}`
        );
    }

}

function _populate_overview_by_study_gene_response(params, mut_response, cna_response, speech) {
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const recc_positions = mut_response["data"]["recurrent_positions"];

    speech
        .sayWithSSML(`${gene_speech_text} mutations are found in`)
        .say(round(mut_response["data"]["patient_percentage"], 1))
        .say(`percent of ${get_study_name_text(params[MelvinAttributes.STUDY_ABBRV])} patients`)
        .say(`with ${recc_positions} amino acid residues recurrently mutated.`);
}

function _populate_overview_by_study_response(params, mut_response, cna_response, speech) {
    const gene_1_text = get_gene_speech_text(Object.keys(mut_response["data"])[0]);
    const gene_2_text = get_gene_speech_text(Object.keys(mut_response["data"])[1]);
    const gene_1_perc = mut_response["data"][Object.keys(mut_response["data"])[0]];
    const gene_2_perc = mut_response["data"][Object.keys(mut_response["data"])[1]];
    speech
        .say(`In ${get_study_name_text(params[MelvinAttributes.STUDY_ABBRV])},`)
        .say(`${gene_1_text} and ${gene_2_text} are the top 2 mutated genes found in`)
        .say(`${round(gene_1_perc, 1)} percent and ${round(gene_2_perc, 1)}`)
        .say("percent of the patients respectively.");
}


async function build_overview_tcga_response(handlerInput, params) {
    const speech = new Speech();
    const image_list = [];
    const mut_response = await get_mutations_tcga_stats(handlerInput, params);

    add_overview_tcga_plots(image_list, params);

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        _populate_overview_by_gene_response(params, mut_response, null, speech);

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        _populate_overview_by_study_gene_response(params, mut_response, null, speech);

    } else if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        _populate_overview_by_study_response(params, mut_response, null, speech);

    } else {
        throw melvin_error(
            `[build_overview_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }

    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech.ssml() };
}


const add_overview_tcga_plots = function (image_list, params) {
    const cna_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cna/tcga/plot`);
    add_query_params(cna_plot_url, params);
    image_list.push(cna_plot_url);

    const mutations_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/stats_plot`);
    add_query_params(mutations_plot_url, params);
    image_list.push(mutations_plot_url);
};

module.exports = { build_overview_tcga_response };