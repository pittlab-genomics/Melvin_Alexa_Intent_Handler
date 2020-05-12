const URL = require('url').URL;
const Speech = require('ssml-builder');
const _ = require('lodash');
const { add_to_APL_image_pager } = require('../utils/APL_utils.js');
const { round, add_query_params } = require('../utils/response_builder_utils.js');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT,
    get_gene_speech_text,
    get_study_name_text,
    MELVIN_EXPLORER_ENDPOINT
} = require('../common.js');

const {
    get_mutations_tcga_stats,
    get_mutations_tcga_domain_stats
} = require('../http_clients/mutations_tcga_client.js');

async function build_mutations_tcga_response(handlerInput, params) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_mutations_tcga_stats(params);

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        const mutated_cancer_type_count = response['data']['cancer_types_with_mutated_gene'];
        const total_cancer_types = response['data']['total_cancer_types'];
        const records_list = response['data']['records'];
        const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);

        if (Array.isArray(records_list)) {
            add_mutations_tcga_stats_plot(image_list, params);
            add_mutations_tcga_treemap_plot(image_list, params);
            speech
                .sayWithSSML(gene_speech_text)
                .say(`mutations are found in ${mutated_cancer_type_count}`)
                .say(`out of ${total_cancer_types} cancer types.`);

            if (records_list.length >= 2) {
                speech
                    .say(`It is most mutated in ${get_study_name_text(records_list[0][MelvinAttributes.STUDY_ABBRV])} at `)
                    .say(round(records_list[0]['percent_cancer_patients_with_mutgene'], 1))
                    .say(`percent, followed by ${get_study_name_text(records_list[1][MelvinAttributes.STUDY_ABBRV])} at `)
                    .say(round(records_list[1]['percent_cancer_patients_with_mutgene'], 1))
                    .say('percent.')

            } else if (records_list.length >= 1) {
                speech
                    .sayWithSSML(gene_speech_text)
                    .say(`mutations are found in ${mutated_cancer_type_count}`)
                    .say(`out of ${total_cancer_types} cancer types.`)
                    .say(`It is most mutated in ${get_study_name_text(records_list[0][MelvinAttributes.STUDY_ABBRV])} at `)
                    .say(`${round(records_list[0]['percent_cancer_patients_with_mutgene'], 1)} percent.`)

            } else {
                speech
                    .sayWithSSML(`I could not find any ${gene_speech_text} mutations.`);
            }

        } else {
            throw melvin_error(
                `Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
                MelvinIntentErrors.INVALID_API_RESPOSE,
                `Sorry, I'm having trouble accessing mutations records for ${gene_speech_text}`
            );
        }

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        add_mutations_tcga_profile_plot(image_list, params);
        const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
        const recc_positions = response['data']['recurrent_positions'];

        speech
            .sayWithSSML(`${gene_speech_text} mutations are found in`)
            .say(round(response['data']['patient_percentage'], 1))
            .say(`percent of ${get_study_name_text(params[MelvinAttributes.STUDY_ABBRV])} patients`)
            .say(`with ${recc_positions} amino acid residues recurrently mutated.`);

    } else if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        add_mutations_tcga_stats_plot(image_list, params);
        const gene_1_text = get_gene_speech_text(Object.keys(response['data'])[0]);
        const gene_2_text = get_gene_speech_text(Object.keys(response['data'])[1]);
        const gene_1_perc = response['data'][Object.keys(response['data'])[0]];
        const gene_2_perc = response['data'][Object.keys(response['data'])[1]];
        speech
            .say(`In ${get_study_name_text(params[MelvinAttributes.STUDY_ABBRV])},`)
            .say(`${gene_1_text} and ${gene_2_text} are the top 2 mutated genes found in`)
            .say(`${round(gene_1_perc, 1)} percent and ${round(gene_2_perc, 1)}`)
            .say(`percent of the patients respectively.`);

    } else {
        throw melvin_error(
            `[build_mutations_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }

    add_to_APL_image_pager(handlerInput, image_list);
    return {
        'speech_text': speech.ssml()
    }
}

async function build_mutations_compare_tcga_response(handlerInput, params, compare_params, sate_diff) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_mutations_tcga_stats(params);
    const compare_response = await get_mutations_tcga_stats(compare_params);

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        if (sate_diff['entity_type'] === MelvinAttributes.GENE_NAME) {
            const gene_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
            const c_gene_text = get_gene_speech_text(compare_params[MelvinAttributes.GENE_NAME]);

            const mut_ct_count = response['data']['cancer_types_with_mutated_gene'];
            const tot_ct_count = response['data']['total_cancer_types'];
            const mut_ct_perc = round(100 * mut_ct_count / tot_ct_count, 1);

            const c_mut_ct_count = compare_response['data']['cancer_types_with_mutated_gene'];
            const c_tot_ct_count = compare_response['data']['total_cancer_types'];
            const c_mut_ct_perc = round(100 * c_mut_ct_count / c_tot_ct_count, 1);

            const mut_cases = round(response['data']['patient_percentage'], 1);
            const c_mut_cases = round(compare_response['data']['patient_percentage'], 1);

            speech
                .sayWithSSML(`${c_gene_text} and ${gene_text} mutations are found in`)
                .say(`${c_mut_ct_perc} and ${mut_ct_perc} percent of cancer types respectively.`)
                .say(`Across all of TCGA,`)
                .sayWithSSML(`${c_gene_text} is mutated in ${c_mut_cases} percent of all cases while`)
                .sayWithSSML(`${gene_text} is mutated in ${mut_cases} percent`);

            add_mutations_tcga_stats_plot(image_list, params);
            add_mutations_tcga_treemap_plot(image_list, params);

            add_mutations_tcga_stats_plot(image_list, compare_params);
            add_mutations_tcga_treemap_plot(image_list, compare_params);
        } else {
            throw melvin_error(
                `[build_mutations_compare_tcga_response] invalid state: ${JSON.stringify(params)}`,
                MelvinIntentErrors.INVALID_STATE,
                "Sorry, I need a gene name to make a comparison."
            );
        }


    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        const gene_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
        const study_text = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);

        const patient_perc = round(response['data']['patient_percentage'], 1);
        const c_patient_perc = round(compare_response['data']['patient_percentage'], 1);
        const freq_adj = (c_patient_perc > patient_perc) ? "more" : "less";

        if (sate_diff['entity_type'] === MelvinAttributes.GENE_NAME) {
            const c_gene_text = get_gene_speech_text(compare_params[MelvinAttributes.GENE_NAME]);
            speech
                .sayWithSSML(`${study_text} patients have ${freq_adj} mutations`)
                .say(`in ${c_gene_text} at ${c_patient_perc} percent,`)
                .say(`while ${patient_perc} percent of cases have ${gene_text} mutations.`);

        } else if (sate_diff['entity_type'] === MelvinAttributes.STUDY_ABBRV) {
            const c_study_text = get_study_name_text(compare_params[MelvinAttributes.STUDY_ABBRV]);
            speech
                .sayWithSSML(`${gene_text} is mutated ${freq_adj} frequently`)
                .say(`in ${c_study_text} at ${c_patient_perc} percent,`)
                .say(`while ${patient_perc} percent of ${study_text} cases have mutations.`);

        } else {
            throw melvin_error(
                `[build_mutations_compare_tcga_response] invalid state: ${JSON.stringify(params)}`,
                MelvinIntentErrors.INVALID_STATE,
                "Sorry, something went wrong while performing the comparison analysis."
            );
        }


        add_mutations_tcga_profile_plot(image_list, params);
        add_mutations_tcga_profile_plot(image_list, compare_params);

    } else if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        add_mutations_tcga_stats_plot(image_list, params);
        add_mutations_tcga_stats_plot(image_list, compare_params);
        speech.say("Sorry, I'm still working on this analysis.");

    } else {
        throw melvin_error(
            `[build_mutations_compare_tcga_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }

    add_to_APL_image_pager(handlerInput, image_list);
    return {
        'speech_text': speech.ssml()
    }
}


function _populate_domain_response(params, records_list, speech, gene_speech_text) {
    // remove 'none' domain from the list since it should not be considered for speech response
    records_list = records_list.filter(item => item['domain'] !== 'none');

    if (records_list.length > 2) {
        speech
            .say(`${records_list[0]['domain']} and ${records_list[1]['domain']}`)
            .say(`are the most affected domains containing`)
            .say(round(records_list[0]['percentage'], 1))
            .say('percent and')
            .say(round(records_list[1]['percentage'], 1))
            .say(`percent of mutations respectively.`);

    } else if (records_list.length > 1) {
        speech
            .say(`${records_list[0]['domain']} is the most affected domain containing`)
            .say(round(records_list[0]['percentage'], 1))
            .say(`percent of mutations.`);

    } else if (records_list.length == 1) {
        speech
            .say(`${records_list[0]['domain']} is the only affected domain containing`)
            .say(round(records_list[0]['percentage'], 1))
            .say(`percent of mutations.`);

    } else {
        speech.sayWithSSML(`I could not find any domains with mutations.`);
    }
}


async function build_mutations_tcga_domain_response(handlerInput, params) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_mutations_tcga_domain_stats(params);
    const records_list = response['data']['records'];

    if (
        (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_ABBRV]))
        || (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV]))
    ) {
        const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
        if (Array.isArray(records_list)) {
            add_mutations_tcga_domain_pie_plot(image_list, params);
            add_mutations_tcga_domain_stack_plot(image_list, params);
            _populate_domain_response(params, records_list, speech, gene_speech_text);

        } else {
            throw melvin_error(
                `Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
                MelvinIntentErrors.INVALID_API_RESPOSE,
                `Sorry, I'm having trouble accessing mutation domains records`
                + ` for ${gene_speech_text} in ${get_study_name_text(params[MelvinAttributes.STUDY_ABBRV])}`
            );
        }

    } else {
        throw melvin_error(
            `[build_mutations_tcga_domain_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }

    add_to_APL_image_pager(handlerInput, image_list);
    return {
        'speech_text': speech.ssml()
    }
}

const add_mutations_tcga_stats_plot = function (image_list, params) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/stats_plot`);
    add_query_params(count_plot_url, params);
    image_list.push(count_plot_url);
}

const add_mutations_tcga_treemap_plot = function (image_list, params) {
    const count_treemap_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/treemap_plot`);
    add_query_params(count_treemap_plot_url, params);
    image_list.push(count_treemap_plot_url);
}

const add_mutations_tcga_profile_plot = function (image_list, params) {
    const profile_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/profile_plot`);
    add_query_params(profile_plot_url, params);
    image_list.push(profile_plot_url);
}

const add_mutations_tcga_domain_pie_plot = function (image_list, params) {
    const domain_pie_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/domain_pie_plot`);
    add_query_params(domain_pie_plot_url, params);
    image_list.push(domain_pie_plot_url);
}

const add_mutations_tcga_domain_stack_plot = function (image_list, params) {
    const domain_stack_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/tcga/domain_stack_plot`);
    add_query_params(domain_stack_plot_url, params);
    image_list.push(domain_stack_plot_url);
}

module.exports = {
    build_mutations_tcga_response,
    build_mutations_tcga_domain_response,
    build_mutations_compare_tcga_response
}
