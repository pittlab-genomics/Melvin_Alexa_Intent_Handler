const Speech = require("ssml-builder");
const _ = require("lodash");

const { get_gene_by_name } = require("../http_clients/gene_client.js");

const {
    MelvinAttributes,
    get_gene_speech_text
} = require("../common.js");

const build_gene_definition_response = async function (params) {
    const speech = new Speech();
    const response = await get_gene_by_name(params);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const sentence_sum = response.data.summary.match(/\S.*?\."?(?=\s|$)/g)[0];

    speech
        .sayWithSSML(gene_speech_text)
        .say(`is at ${response.data.location}`)
        .pause("200ms")
        .say(sentence_sum);

    return { "speech_text": speech.ssml() };
};

module.exports = { build_gene_definition_response };