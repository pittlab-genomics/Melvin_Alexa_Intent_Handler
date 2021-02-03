# Serverless Lambda Functions for Melvin Alexa Skill

This serverless project contains AWS Lambda functions for Melvin Alexa skill - genomic explorer based on Alexa Digital Voice Assistant


## How it works

In the Alexa Developer Portal you can add your own skill. To do so you need to define the available intents and then connect them to a Lambda. You can update and define the Lambda with Serverless.

## Setup

In order to deploy the endpoint simply run

```bash
serverless deploy
```

## Testing

### To run the unit tests

To run all the tests
```
npm run unit-tests
```

To run a particular suite
```
bst test --config test/unit/testing.json /unit.test.mutations_handler.test 
bst test --config test/unit/testing.json /unit.test.navigation_handler.test
bst test --config test/unit/testing.json /unit.test.gene_handler.test
```

### To run tests via Skill Simulation API

These tests are similar to e2e tests in that they interact with the "real" skill. However, they do not actually "speak" to Alexa using text-to-speech but instead use text invocations. 

By default, the skillId is pointed to Melvin dev. If you want to test against uat, update the skillId in `integration.test.yml`.

To configure `ask cli` credentials to authenticate the user to Amazon developer services (This is needed as we are invoking the skillId)
```
ask configure
npm run smapi-tests
```

### To run the end-to-end tests

To run the tests for all the voice recordings
```
npm run e2e-tests
```

To run a particular person's recordings
```
bst test --config test/e2e/testing.json /e2e.test.Hannan
bst test --config test/e2e/testing.json /e2e.test.Shwetha
bst test --config test/e2e/testing.json /e2e.test.Jason
```