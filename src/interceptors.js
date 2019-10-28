

const RequestLogInterceptor = {
    process(handlerInput) {
        console.log("ASP REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope));
    }
};

const ResponseLogInterceptor = {
    process(handlerInput) {
        console.log(`ASP RESPONSE BUILDER = ${JSON.stringify(handlerInput)}`);
        console.log(`ASP RESPONSE = ${JSON.stringify(handlerInput.responseBuilder.getResponse())}`);
    },
};

module.exports = {
    RequestLogInterceptor,
    ResponseLogInterceptor
}