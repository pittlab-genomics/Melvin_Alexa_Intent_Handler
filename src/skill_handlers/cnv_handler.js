const Speech = require('ssml-builder');
const { quickQueryRepromptText } = require('../common.js');
const { get_cnv_change_percent } = require('../http_clients/cnv.js');

const APLDocs = {
    cnv_change: require('../documents/cnv_change.json'),
};

function supportsAPL(handlerInput) {
    const supportedInterfaces = handlerInput.requestEnvelope.context
        .System.device.supportedInterfaces;
    const aplInterface = supportedInterfaces['Alexa.Presentation.APL'];
    return aplInterface != null && aplInterface !== undefined;
}

async function cnv_change_percent(params) {
    let speechText = '';
    let speech = new Speech();
    try {
        let response = await get_cnv_change_percent(params);
        if (response['data']) {
            if (params.cnv_change === 'alterations') {
                speech.sayAs({ word: response['data']['amplifications'], interpret: 'digits' })
                    .say(`percentage of ${params.study_name} cancer patients have amplifications whereas`);
                speech.sayAs({ word: response['data']['deletions'], interpret: 'digits' })
                speech.say(`percentage have deletions at ${params.gene_name}`);

            } else {
                speech.sayAs({ word: response['data'][0], interpret: 'digits' })
                    .say(`percentage of ${params.study_name} cancer patients have ` +
                        `${params.cnv_change} at ${params.gene_name}`);
            }
            speechText = speech.ssml();

        } else if (response['error'] && response['error'] === 'UNIDENTIFIED_STUDY') {
            speech.say(`There was a problem while processing the request.`);
            speech.pause('100ms');
            speech.say(`I could not find a study called ${params.study_name}`);
            speechText = speech.ssml();

        } else if (response['error'] && response['error'] === 'UNIDENTIFIED_GENE') {
            speech.say(`There was a problem while processing the request.`);
            speech.pause('100ms');
            speech.say(`I could not find a gene called ${params.gene_name}`);
            speechText = speech.ssml();

        } else {
            speech.say(`There was a problem while processing the request.`);
            speech.pause('100ms');
            speech.say(`I could not find a gene called ${params.gene_name}`);
            speechText = speech.ssml();
        }

    } catch (error) {
        speech.say(`There was a problem while looking for ${params.cnv_change} in ` +
            `${params.gene_name} for ${params.study_name} cancer patients`);
        speechText = speech.ssml();
        console.error(`Intent: ${handlerInput.requestEnvelope.request.intent.name}: message: ${error.message} `, error);
    }

    console.log("SPEECH TEXT = " + speechText);
    return speechText;
};

function constructCNVChangeAPLDataSource(gene_name, study_id) {
    let imageURL = `https://api.dev.melvin.pittlabgenomics.com/v0.1/analysis/cnvs/percent_patients_plot?` +
        `gene=${gene_name}&study=${study_id}&cnv_change=amplifications`;

    return {
        "bodyTemplate7Data": {
            "type": "object",
            "objectId": "bt7Sample",
            "title": `Copy Number Alterations at ${gene_name}`,
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

        const responseBuilder = handlerInput.responseBuilder;
        if (supportsAPL(handlerInput)) {
            responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.0',
                document: APLDocs.cnv_change,
                datasources: constructCNVChangeAPLDataSource(gene_name, study_id),
            });
        }


        return responseBuilder
            .speak(speechText)
            // .withStandardCard({
            //     type: 'Standard',
            //     cardTitle: `Copy Number Alterations at ${gene_name}`,
            //     cardContent: `Percentage of amplifications at ${gene_name} for ${study_name} patients`,
            //     largeImageUrl: imageURL
            // })
            // .withStandardCard('my title', 'my text', 'https://cdn.pixabay.com/photo/2013/07/13/11/44/penguin-158551_960_720.png', 'https://cdn.pixabay.com/photo/2013/07/13/11/44/penguin-158551_960_720.png')
            .reprompt(quickQueryRepromptText)
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

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(quickQueryRepromptText)
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

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(quickQueryRepromptText)
            .getResponse();
    }
};

module.exports = {
    CNVAmplificationGeneIntentHandler,
    CNVDeletionGeneIntent,
    CNVAlterationGeneIntent
}