'use strict';

const AWS = require("aws-sdk");
const sqs = new AWS.SQS({
    region: "eu-west-1",
});

const warmup_handler = function (event, context, callback) {
    console.info(`[warmup_handler] event: ${JSON.stringify(event)}, context: ${JSON.stringify(context)}`);
    const accountId = context.invokedFunctionArn.split(":")[4];
    const queueName = context.invokedFunctionArn.split(":")[5];
    const queueUrl = `https://eu-west-1.queue.amazonaws.com/${accountId}/${queueName}`;

    // response and status of HTTP endpoint
    const responseBody = {
        message: ""
    };

    let responseCode = 200;
    // SQS message parameters
    const params = {
        MessageBody: event.body,
        QueueUrl: queueUrl,
    };

    sqs.sendMessage(params, (error, data) => {
        if (error) {
            console.info("error:", `failed to send message: ${error}`);
            responseCode = 500;
        } else {
            console.info("data:", data.MessageId);
            responseBody.message = `Sent to ${queueUrl}`;
            responseBody.messageId = data.MessageId;
        }
        const response = {
            statusCode: responseCode,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(responseBody),
        };
        callback(null, response);
    });
};

exports.handler = warmup_handler;