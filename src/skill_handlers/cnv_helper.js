const Speech = require('ssml-builder');
const URL = require('url').URL;

const { MelvinExplorerErrors } = require('../common.js');
const { MELVIN_EXPLORER_ENDPOINT } = require('../common.js');
const { get_cnv_change_percent } = require('../http_clients/cnv_client.js');

async function build_cnv_response(params) {
    const speech = new Speech();
    const image_list = [];

    try {
        let response = await get_cnv_change_percent(params);
        if (response['data']) {
            if (params.cnv_change === 'alterations' && response['data']['amplifications'] &&
                response['data']['deletions']) {
                speech
                    .sayAs({ word: response['data']['amplifications'], interpret: 'digits' })
                    .say(`percentage of ${params.study_name} cancer patients have amplifications whereas`);
                speech.sayAs({ word: response['data']['deletions'], interpret: 'digits' })
                speech.say(`percentage have deletions at ${params.gene_name}`);

            } else if (response['data'][params.cnv_change]) {
                speech
                    .sayAs({ word: response['data'][params.cnv_change], interpret: 'digits' })
                    .say(`percentage of ${params.study_name} cancer patients have ` +
                        `${params.cnv_change} at ${params.gene_name}`);
            } else {
                speech.say(`Sorry, I could not find the requested CNV change data.`);
            }
            speechText = speech.ssml();

            const cnv_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cnvs/percent_patients_plot`);
            cnv_url.searchParams.set('gene', params.gene_name);
            cnv_url.searchParams.set('study', params.study_id);
            image_list.push(cnv_url);

        } else if (response['error'] && response['error'] === MelvinExplorerErrors.UNIDENTIFIED_STUDY) {
            speech.say(`Sorry, I could not find a study called ${params.study_name}`);

        } else if (response['error'] && response['error'] === MelvinExplorerErrors.UNIDENTIFIED_GENE) {
            speech.say(`Sorry, I could not find a gene called ${params.gene_name}`);

        } else {
            speech.say(`There was a problem while looking for ${params.cnv_change} in ` +
                `${params.gene_name} for ${params.study_name} cancer patients. Please try again.`);
        }

    } catch (error) {
        speech.say(`Something went wrong. Please try again later.`);
        console.error(`build_cnv_response | message: ${error.message}`, error);
    }

    return {
        'speech_text': speech.ssml(),
        'image_list': image_list
    }
};


module.exports = {
    build_cnv_response
}