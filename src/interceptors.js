const _ = require("lodash");
const { update_melvin_history } = require("./utils/navigation_utils.js");
const { assume_role } = require("./utils/sigv4_utils");
const { performance } = require("perf_hooks");

const { MELVIN_API_INVOKE_ROLE } = require("./common.js");

const RequestLogInterceptor = { process(handlerInput) {
    const reqAttributes = handlerInput.attributesManager.getRequestAttributes();
    reqAttributes["REQUEST_START"] = performance.now();
    handlerInput.attributesManager.setRequestAttributes(reqAttributes);
    console.debug("ASP REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope));
} };

const ResponseLogInterceptor = { process(handlerInput) {
    const reqAttributes = handlerInput.attributesManager.getRequestAttributes();
    const duration = performance.now() - reqAttributes["REQUEST_START"];
    console.debug(`ASP RESPONSE (in ${duration}ms) = ${JSON.stringify(handlerInput.responseBuilder.getResponse())}`);
} };

const UserUtteranceTrackInterceptor = { async process(handlerInput) {
    await update_melvin_history(handlerInput);
} };

const STSCredentialsInterceptor = { async process(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const request_id = _.get(handlerInput, "requestEnvelope.request.requestId");
    if (!sessionAttributes["MELVIN.STS.CREDENTIALS"]) {
        console.info(`[STSCredentialsInterceptor] Assuming IAM role ${MELVIN_API_INVOKE_ROLE}`);
        sessionAttributes["MELVIN.STS.CREDENTIALS"] = await assume_role(MELVIN_API_INVOKE_ROLE, request_id);
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    }
} };

module.exports = {
    RequestLogInterceptor,
    ResponseLogInterceptor,
    UserUtteranceTrackInterceptor,
    STSCredentialsInterceptor
};