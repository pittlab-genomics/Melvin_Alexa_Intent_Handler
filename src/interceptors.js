const _ = require("lodash");
const { update_melvin_history } = require("./utils/navigation_utils.js");
const { assume_role } = require("./utils/sigv4_utils");

const { MELVIN_API_INVOKE_ROLE } = require("./common.js");

const RequestLogInterceptor = { process(handlerInput) {
    console.log("ASP REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope));
} };

const ResponseLogInterceptor = { process(handlerInput) {
    console.log(`ASP RESPONSE = ${JSON.stringify(handlerInput.responseBuilder.getResponse())}`);
} };

const UserUtteranceTrackInterceptor = { async process(handlerInput) {
    await update_melvin_history(handlerInput);
} };

const STSCredentialsInterceptor = { async process(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const request_id = _.get(handlerInput, "requestEnvelope.request.requestId");
    if (!sessionAttributes["MELVIN.STS.CREDENTIALS"]) {
        sessionAttributes["MELVIN.STS.CREDENTIALS"] = await assume_role(MELVIN_API_INVOKE_ROLE, request_id);
    }
} };

module.exports = {
    RequestLogInterceptor,
    ResponseLogInterceptor,
    UserUtteranceTrackInterceptor,
    STSCredentialsInterceptor
};