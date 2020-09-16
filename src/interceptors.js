const {
    update_melvin_history, get_melvin_history 
} = require("./navigation/navigation_helper.js");

const RequestLogInterceptor = { process(handlerInput) {
    console.log("ASP REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope));
} };

const ResponseLogInterceptor = { process(handlerInput) {
    console.log(`ASP RESPONSE = ${JSON.stringify(handlerInput.responseBuilder.getResponse())}`);
}, };

const UserUtteranceTrackInterceptor = { async process(handlerInput) {
    await update_melvin_history(handlerInput);
}, };

module.exports = {
    RequestLogInterceptor,
    ResponseLogInterceptor,
    UserUtteranceTrackInterceptor
};