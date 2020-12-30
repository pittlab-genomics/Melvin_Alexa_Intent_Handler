const Speech = require("ssml-builder");
const _ = require("lodash");

const {
    get_gene_by_name,
    get_gene_target
} = require("../http_clients/melvin_explorer_client.js");

const {
    MelvinAttributes,
    get_gene_speech_text
} = require("../common.js");

const build_gene_definition_response = async function (handlerInput, params) {
    const speech = new Speech();
    const response = await get_gene_by_name(handlerInput, params);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const sentence_sum = response.data.summary.match(/\S.*?\."?(?=\s|$)/g)[0];

    speech
        .sayWithSSML(gene_speech_text)
        .say(`is at ${response.data.location}`)
        .pause("200ms")
        .say(sentence_sum);

    return { "speech_text": speech.ssml() };
};

const build_gene_target_response = async function (handlerInput, params) {
    const speech = new Speech();
    const response = await get_gene_target(handlerInput, params);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const sentence_sum = response.data.summary.match(/\S.*?\."?(?=\s|$)/g)[0];

    speech
        .sayWithSSML(gene_speech_text)
        .say("can be targeted.")
        .pause("200ms")
        .say(sentence_sum);

    return { "speech_text": speech.ssml() };
};

module.exports = {
    build_gene_definition_response,
    build_gene_target_response
};