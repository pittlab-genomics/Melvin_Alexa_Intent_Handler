const Speech = require('ssml-builder');
const URL = require('url').URL;
const _ = require('lodash');

const {
    MELVIN_EXPLORER_ENDPOINT
} = require('../common.js');

const {
    get_mutated_patient_stats,
    get_mutations_top_list,
    get_mutations_domain_percent
} = require('../http_clients/mutations_client.js');

async function build_mutations_response(params) {
    const speech = new Speech();
    const image_list = [];
    console.info(`[get_mutations_response] params: ${JSON.stringify(params)}`);

    if (_.isEmpty(params['study_name'])) {
        console.log(`study_name is empty`);
    }

    if (!_.isEmpty(params['gene_name']) && _.isEmpty(params['study_name'])) {
        const response = await get_mutations_top_list(params);
        const gene_list_str = response['data'].toString();
        speech.say(`${params['gene_name']} mutations are most found in ${gene_list_str}`);

        const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/count_plot`);
        count_plot_url.searchParams.set('gene', params.gene_name);
        image_list.push(count_plot_url);

    } else if (_.isEmpty(params['gene_name']) && !_.isEmpty(params['study_name'])) {
        speech.say(`${params['study_name']} cancer mutations`);

    } else if (!_.isEmpty(params['gene_name']) && !_.isEmpty(params['study_name'])) {
        const response = await get_mutated_patient_stats(params);
        speech
            .sayAs({ word: response['data']['patient_percentage'], interpret: 'digits' })
            .say(`percentage of ${params['study_name']} cancer patients have ${params['gene_name']} mutation`);

        const profile_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/profile_plot`);
        profile_plot_url.searchParams.set('gene', params.gene_name);
        profile_plot_url.searchParams.set('study', params.study_id);
        image_list.push(profile_plot_url);
    }

    return {
        'speech_text': speech.ssml(),
        'image_list': image_list
    }
}


async function build_mutations_domain_response(params) {
    const speech = new Speech();
    const image_list = [];
    console.log(`[get_mutations_domain_response] params: ${JSON.stringify(params)}`);

    if (!_.isEmpty(params['gene_name']) && _.isEmpty(params['study_name'])) {
        const response = await get_mutations_domain_percent(params);
        speech
            .say(`The ${response['data']['domain_name']} is the most mutated region containing`)
            .sayAs({ word: response['data']['mutated_percentage'], interpret: 'digits' })
            .say(`percent of all ${params['gene_name']} mutations.`);

        const domain_pie_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/domain_pie_plot`);
        domain_pie_plot_url.searchParams.set('gene', params.gene_name);
        image_list.push(domain_pie_plot_url);

        const domain_stack_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/domain_stack_plot`);
        domain_stack_plot_url.searchParams.set('gene', params.gene_name);
        image_list.push(domain_stack_plot_url);

    } else if (_.isEmpty(params['gene_name']) && !_.isEmpty(params['study_name'])) {
        speech.say(`${params['study_name']} cancer mutations domain`);

    } else if (!_.isEmpty(params['gene_name']) && !_.isEmpty(params['study_name'])) {
        const response = await get_mutations_domain_percent(params);
        speech
            .say(`The ${response['data']['domain_name']} is the most mutated region containing`)
            .sayAs({ word: response['data']['mutated_percentage'], interpret: 'digits' })
            .say(`percent of all ${params['gene_name']} mutations in ${params['study_name']}.`);

        const domain_pie_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/domain_pie_plot`);
        domain_pie_plot_url.searchParams.set('gene', params.gene_name);
        domain_pie_plot_url.searchParams.set('study', params.study_id);
        image_list.push(domain_pie_plot_url);

        const domain_stack_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/domain_stack_plot`);
        domain_stack_plot_url.searchParams.set('gene', params.gene_name);
        domain_stack_plot_url.searchParams.set('study', params.study_id);
        image_list.push(domain_stack_plot_url);
    } else {
        console.log(`[get_mutations_domain_response] invalid state`);
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
