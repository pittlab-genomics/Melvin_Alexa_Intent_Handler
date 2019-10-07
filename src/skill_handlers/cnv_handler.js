const Speech = require('ssml-builder');
const { GENOMIC_EXPLORER_API_BASE_URL: baseUrl } = require('../common.js');
const { supportsAPL } = require('../utils/APL_utils.js');
const { get_cnv_change_percent } = require('../http_clients/cnv_client.js');

const APLDocs = {
    cnv_change: require('../documents/cnv_change.json'),
};

async function cnv_change_percent(params) {
    let speechText = '';
    let speech = new Speech();

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

        } else if (response['error'] && response['error'] === MelvinErrors.UNIDENTIFIED_STUDY) {
            speech.say(`Sorry, I could not find a study called ${params.study_name}`);
            speechText = speech.ssml();

        } else if (response['error'] && response['error'] === MelvinErrors.UNIDENTIFIED_GENE) {
            speech.say(`Sorry, I could not find a gene called ${params.gene_name}`);
            speechText = speech.ssml();

        } else {
            speech.say(`There was a problem while looking for ${params.cnv_change} in ` +
                `${params.gene_name} for ${params.study_name} cancer patients. Please try again.`);
            speechText = speech.ssml();
        }

    } catch (error) {
        speech.say(`Something went wrong. Please try again later.`);
        speechText = speech.ssml();
        console.error(`cnv_change_percent: message: ${error.message} `, error);
    }

    console.log("SPEECH TEXT = " + speechText);
    return speechText;
};

function constructCNVChangeAPLDataSource(params) {
    let imageURL = `${baseUrl}/analysis/cnvs/percent_patients_plot?` +
        `gene=${params.gene_name}&study=${params.study_id}`;

    return {
        "bodyTemplate7Data": {
            "type": "object",
            "objectId": "bt7Sample",
            "title": `Copy Number Alterations at ${params.gene_name}`,
            "backgroundImage": {
                "contentDescription": null,
                "smallSourceUrl": null,
                "largeSourceUrl": null,
                "sources": [
                    {
                        "url": "https://d2o906d8ln7ui1.cloudfront.net/images/BT7_Background.png",
                        "size": "small",
                        "widthPixels": 0,
                        "heightPixels": 0
                    },
                    {
                        "url": "https://d2o906d8ln7ui1.cloudfront.net/images/BT7_Background.png",
                        "size": "large",
                        "widthPixels": 0,
                        "heightPixels": 0
                    }
                ]
            },
            "image": {
                "contentDescription": null,
                "smallSourceUrl": null,
                "largeSourceUrl": null,
                "sources": [
                    {
                        "url": `${imageURL}`,
                        "size": "small",
                        "widthPixels": 0,
                        "heightPixels": 0
                    },
                    {
                        "url": `${imageURL}`,
                        "size": "large",
                        "widthPixels": 0,
                        "heightPixels": 0
                    }
                ]
            }
        }
    };
}

const CNVAmplificationGeneIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CNVAmplificationGeneIntent';
    },
    async handle(handlerInput) {
        const gene_name = handlerInput.requestEnvelope.request.intent.slots.gene.value;
        const study_name = handlerInput.requestEnvelope.request.intent.slots.study.value;

        const study_id = handlerInput.requestEnvelope.request.intent.slots
            .study.resolutions.resolutionsPerAuthority[0].values[0].value.id;

        let params = { gene_name, study_name, study_id, cnv_change: 'amplifications' };
        let speechText = await cnv_change_percent(params);

        if (supportsAPL(handlerInput)) {
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.0',
                document: APLDocs.cnv_change,
                datasources: constructCNVChangeAPLDataSource(params),
            });
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const CNVDeletionGeneIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CNVDeletionGeneIntent';
    },
    async handle(handlerInput) {
        let gene_name = handlerInput.requestEnvelope.request.intent.slots.gene.value;
        let study_name = handlerInput.requestEnvelope.request.intent.slots.study.value;

        let study_id = handlerInput.requestEnvelope.request.intent.slots
            .study.resolutions.resolutionsPerAuthority[0].values[0].value.id;

        let params = { gene_name, study_name, study_id, cnv_change: 'deletions' };
        let speechText = await cnv_change_percent(params);

        if (supportsAPL(handlerInput)) {
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.0',
                document: APLDocs.cnv_change,
                datasources: constructCNVChangeAPLDataSource(params),
            });
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const CNVAlterationGeneIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CNVAlterationGeneIntent';
    },
    async handle(handlerInput) {
        let gene_name = handlerInput.requestEnvelope.request.intent.slots.gene.value;
        let study_name = handlerInput.requestEnvelope.request.intent.slots.study.value;

        let study_id = handlerInput.requestEnvelope.request.intent.slots
            .study.resolutions.resolutionsPerAuthority[0].values[0].value.id;

        let params = { gene_name, study_name, study_id, cnv_change: 'alterations' };
        let speechText = await cnv_change_percent(params);

        if (supportsAPL(handlerInput)) {
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.0',
                document: APLDocs.cnv_change,
                datasources: constructCNVChangeAPLDataSource(params),
            });
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

module.exports = {
    CNVAmplificationGeneIntentHandler,
    CNVDeletionGeneIntent,
    CNVAlterationGeneIntent
}