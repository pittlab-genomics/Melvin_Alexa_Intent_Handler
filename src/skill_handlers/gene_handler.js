const Speech = require('ssml-builder');
const _ = require('lodash');

const { MelvinExplorerErrors } = require('../common.js');
const { get_gene_by_name } = require('../http_clients/gene_client.js');

const SearchGeneIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'SearchGeneIntent';
    },
    async handle(handlerInput) {

        let gene_name = _.get(handlerInput, 'requestEnvelope.request.intent.slots.gene.value');
        if (_.isNil(gene_name)) {
            gene_name = _.get(handlerInput, 'requestEnvelope.request.intent.slots.query.value').replace(/\s/g, '');
        }

        let speechText = '';
        let speech = new Speech();
        let params = { gene_name };

        try {
            let response = await get_gene_by_name(params);
            if (response['data'] && response['data']['location'] && response['data']['summary']) {
                speech.say(`${gene_name} is at ${response.data.location}`);
                speech.pause('100ms');
                const sentence_sum = response.data.summary.match(/\S.*?\."?(?=\s|$)/g)[0]
                speech.say(sentence_sum);
                speechText = speech.ssml();

            } else if (response['error'] && response['error'] === MelvinExplorerErrors.UNIDENTIFIED_GENE) {
                speech.say(`Sorry, I could not find a gene called ${gene_name}`);
                speechText = speech.ssml();

            } else {
                speech.say(`Sorry, there was a problem while fetching the data. Please try again.`);
                speechText = speech.ssml();
            }

        } catch (error) {
            speech.say(`Sorry, something went wrong while processing the request. Please try again later.`);
            speechText = speech.ssml();
            console.error(`SearchGeneIntentHandler: message: ${error.message}`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

module.exports = {
    SearchGeneIntentHandler
}