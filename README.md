# Serverless Lambda Functions for Melvin Alexa Skill

This serverless project contains AWS Lambda functions for Melvin Alexa skill - genomic explorer based on Alexa Digital Voice Assistant


## How it works

In the Alexa Developer Portal you can add your own skill. To do so you need to define the available intents and then connect them to a Lambda. You can update and define the Lambda with Serverless.

## Setup

In order to deploy the endpoint simply run

```bash
serverless deploy
```

## Test Locally

serverless invoke local --function alexa-skill -p ./examples/SearchGeneIntent_payload.json
serverless invoke local --function alexa-skill -p ./examples/SearchGeneIntent_query_payload.json
serverless invoke local --function alexa-skill -p ./examples/CNVAmplificationGeneIntent_payload.json
serverless invoke local --function alexa-skill -p ./examples/MutationCountIntent_payload.json

serverless invoke local --function alexa-skill -p ./examples/NavigateGeneDefinition_payload.json
serverless invoke local --function alexa-skill -p ./examples/NavigateMutationsIntent_payload.json
serverless invoke local --function alexa-skill -p ./examples/NavigateMutationDomains_payload.json
serverless invoke local --function alexa-skill -p ./examples/NavigateCNVIntent_payload.json
serverless invoke local --function alexa-skill -p ./examples/NavigateJoinFilterIntent_BRCA_payload.json
serverless invoke local --function alexa-skill -p ./examples/NavigateJoinFilterIntent_TP53_BRCA_OV_payload.json

serverless invoke local --function alexa-skill -p ./examples/NavigateResetIntent_payload.json