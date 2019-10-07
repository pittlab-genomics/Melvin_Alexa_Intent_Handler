const Speech = require('ssml-builder');
const _ = require('lodash');
const { get_oov_mapping_by_query } = require('../http_clients/gene_mapping_client.js');

const NavigateStartIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigateStartIntent';
    },
    async handle(handlerInput) {
        // let gene_name = _.get(handlerInput, 'requestEnvelope.request.intent.slots.gene.value');
        // if (_.isNil(gene_name)) {
        //     gene_name = _.get(handlerInput, 'requestEnvelope.request.intent.slots.query.value').replace(/\s/g, '');;
        // }
        const query = _.get(handlerInput, 'requestEnvelope.request.intent.slots.query.value');
        const params = { query };
        const oov_data = get_oov_mapping_by_query(params);
        console.log(`oov_data: ${oov_data}`)

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};



module.exports = {
    NavigateStartIntentHandler
}