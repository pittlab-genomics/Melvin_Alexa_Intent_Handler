const Speech = require('ssml-builder');
const _ = require('lodash');

const {
    add_mutations_stats_plot,
    add_mutations_profile_plot,
    add_mutations_treemap_plot,
    add_domain_pie_plot,
    add_domain_stack_plot,
    round
} = require('../utils/response_builder_utils.js');

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_MELVIN_ERROR_SPEECH_TEXT,
    get_gene_speech_text
} = require('../common.js');

const {
    get_mutated_patient_stats,
    get_mutations_domain_percent
} = require('../http_clients/mutations_client.js');

async function build_mutations_response(params) {
    const speech = new Speech();
    const image_list = [];
    console.info(`[build_mutations_response] params: ${JSON.stringify(params)}`);
    const response = await get_mutated_patient_stats(params);

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        const mutated_cancer_type_count = response['data']['cancer_types_with_mutated_gene'];
        const total_cancer_types = response['data']['total_cancer_types'];
        const records_list = response['data']['records'];
        const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);

        if (Array.isArray(records_list)) {
            add_mutations_stats_plot(image_list, params);
            add_mutations_treemap_plot(image_list, params);
            speech.say(`${gene_speech_text} mutations are found in ${mutated_cancer_type_count}`
                + ` out of ${total_cancer_types} cancer types.`);

            if (records_list.length >= 2) {
                speech
                    .say(`It is most mutated in ${records_list[0][MelvinAttributes.STUDY_NAME]} at `)
                    .say(round(records_list[0]['percent_cancer_patients_with_mutgene'], 1))
                    .say(`percent, followed by ${records_list[1][MelvinAttributes.STUDY_NAME]} at `)
                    .say(round(records_list[1]['percent_cancer_patients_with_mutgene'], 1))
                    .say('percent.')

            } else if (records_list.length >= 1) {
                speech
                    .say(`${gene_speech_text} mutations are found in ${mutated_cancer_type_count}`
                        + ` out of ${total_cancer_types} cancer types.`)
                    .say(`It is most mutated in ${records_list[0][MelvinAttributes.STUDY_NAME]} at `)
                    .say(`${round(records_list[0]['percent_cancer_patients_with_mutgene'], 1)} percent.`)

            } else {
                speech.say(`There were no mutations found for ${gene_speech_text}`);
            }

        } else {
            throw melvin_error(
                `Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
                MelvinIntentErrors.INVALID_API_RESPOSE,
                `Sorry, I'm having trouble accessing mutations records for ${gene_speech_text}`
            );
        }

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        add_mutations_profile_plot(image_list, params);
        const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
        speech
            .say(round(response['data']['patient_percentage'], 1))
            .say(`percent of ${params[MelvinAttributes.STUDY_NAME]} patients have `
                + `${gene_speech_text} mutations with` +
                ` ${response['data']['recurrent_positions']} amino acid residues recurrently mutated.`);

    } else if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME])) {
        speech.say("I'm still working on this analysis. Please try again later.");

    } else {
        throw melvin_error(
            `[build_mutations_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }

    return {
        'speech_text': speech.ssml(),
        'image_list': image_list
    }
}


function build_mutations_domain_response_helper(params, records_list, speech, gene_speech_text) {
    // remove 'none' domain from the list since it should not be considered for speech response
    records_list = records_list.filter(item => item['domain'] !== 'none');

    if (records_list.length > 2) {
        speech
            .say(`${records_list[0]['domain']} and ${records_list[1]['domain']}`
                + ` are the most affected domains containing`)
            .say(round(records_list[0]['percentage'], 1))
            .say('percent and')
            .say(round(records_list[1]['percentage'], 1))
            .say(`percent of all ${gene_speech_text} mutations respectively.`);

    } else if (records_list.length > 1) {
        speech
            .say(`${records_list[0]['domain']} is the most affected domain containing`)
            .say(round(records_list[0]['percentage'], 1))
            .say(`percent of all ${gene_speech_text} mutations.`);

    } else if (records_list.length == 1) {
        speech
            .say(`${records_list[0]['domain']} is the only affected domain containing`)
            .say(round(records_list[0]['percentage'], 1))
            .say(`percent of all ${gene_speech_text} mutations.`);

    } else {
        speech.say('There were no mutation domains found.');
    }
}


async function build_mutations_domain_response(params) {
    console.log(`[build_mutations_domain_response] params: ${JSON.stringify(params)}`);
    const speech = new Speech();
    const image_list = [];
    const response = await get_mutations_domain_percent(params);
    const records_list = response['data']['records'];

    if (
        (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_NAME]))
        || (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_NAME]))
    ) {
        const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
        if (Array.isArray(records_list)) {
            add_domain_pie_plot(image_list, params);
            add_domain_stack_plot(image_list, params);
            build_mutations_domain_response_helper(params, records_list, speech, gene_speech_text);

        } else {
            throw melvin_error(
                `Invalid response from MELVIN_EXPLORER: ${JSON.stringify(response)}`,
                MelvinIntentErrors.INVALID_API_RESPOSE,
                `Sorry, I'm having trouble accessing mutation domains records`
                + ` for ${gene_speech_text} in ${params[MelvinAttributes.STUDY_NAME]}`
            );
        }

    } else {
        throw melvin_error(
            `[build_mutations_domain_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_MELVIN_ERROR_SPEECH_TEXT
        );
    }

    return {
        'speech_text': speech.ssml(),
        'image_list': image_list
    }
}

module.exports = {
    build_mutations_response,
    build_mutations_domain_response
}
