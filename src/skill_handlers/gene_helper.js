const Speech = require('ssml-builder');
const _ = require('lodash');

const { get_gene_by_name } = require('../http_clients/gene_client.js');

const {
    MelvinAttributes
} = require('../common.js');


async function build_gene_definition_response(params) {
    const speech = new Speech();
    const response = await get_gene_by_name(params);

    speech.say(`${params[MelvinAttributes.GENE_NAME]} is at ${response.data.location}`);
    speech.pause('200ms');
    const sentence_sum = response.data.summary.match(/\S.*?\."?(?=\s|$)/g)[0]
    speech.say(sentence_sum);

    return {
        'speech_text': speech.ssml(),
        'image_list': []
    }
}


module.exports = {
    build_gene_definition_response
}