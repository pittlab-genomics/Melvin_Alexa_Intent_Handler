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

To run all the unit tests
```
bst test /unit.test
```

To run a particular suite
```
bst test /unit.test.mutations_handler.test
bst test /unit.test.navigation_handler.test
bst test /unit.test.gene_handler.test
```

### To run integration tests

These tests are similar to e2e tests in that they interact with the "real" skill. However, they do not actually "speak" to Alexa using text-to-speech but instead use text invocations. 

By default, the skillId is pointed to Melvin dev. If you want to test against uat, update the skillId in `integration.test.yml`.

To configure `ask cli` credentials to authenticate the user to Amazon developer services (This is needed as we are invoking the skillId)
```
ask configure
bst test /integration.test
```