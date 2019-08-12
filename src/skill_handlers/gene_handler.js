const Speech = require('ssml-builder');
const { quickQueryRepromptText } = require('../common.js');
const { get_gene_by_name } = require('../http_clients/gene.js');

const SearchGeneIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'SearchGeneIntent';
    },
    async handle(handlerInput) {
        let gene_name = handlerInput.requestEnvelope.request.intent.slots.gene.value;
        let speechText = '';
        let speech = new Speech();
        let params = { gene_name };

        try {
            let response = await get_gene_by_name(params);
            if (response['data'] && response['data']['location'] && response['data']['summary']) {
                speech.say(`${gene_name} is at ${response.data.location}`);
                speech.pause('200ms');
                speech.say(response.data.summary);
                speechText = speech.ssml();

            } else if (response['error'] && response['error'] === 'UNIDENTIFIED_GENE') {
                speech.say(`There was a problem while processing the request.`);
                speech.pause('100ms');
                speech.say(`I could not find a gene called ${gene_name}`);
                speechText = speech.ssml();

            } else {
                speech.say(`There was a problem while processing the request.`);
                speechText = speech.ssml();
            }
            
        } catch (error) {
            speech.say(`Hmmm, this is weird. Something went wrong.`);
            speechText = speech.ssml();
            console.error(`Intent: ${handlerInput.requestEnvelope.request.intent.name}: message: ${error.message}`, error);
        }

        console.log("SPEECH TEXT = " + speechText);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(quickQueryRepromptText)
            .getResponse();
    }
};

module.exports = {
    SearchGeneIntentHandler
}