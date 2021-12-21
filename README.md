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


## Continuous Integration
Done via Gitlab CI/CD. [Unit](#to-run-the-unit-tests) and [integration](#to-run-tests-via-skill-simulation-api) tests are run with every commit to master branch.

## Continuous Deployment

### Environment Rules
If the test runs are successful, deployments are made to the `dev` and `uat` environments respectively.
The relevant portion of the [gitlab-ci.yml](./gitlab-ci.yml) file is below:
```
dev-deploy:
  stage: dev_deploy
  before_script:
    - npm install serverless@1.83.3
  script:
    - npm run dev-deploy
  environment:
    name: dev
  only:
    - master

...

uat-deploy:
  stage: uat_deploy
  before_script:
    - npm install serverless@1.83.3
  script:
    - npm run uat-deploy
  environment:
    name: uat
  only:
    - master
```

### Deployment Script
`deploy.sh` script is used to set up AWS and ASK config files.

This is done with a bash script because of the powerful tools it provides for file manipulation and creation.

These lines setup our AWS and ASK configs from environment variables configured securely in Gitlab-CI:
```
echo "[default]" > ~/.aws/credentials
echo "aws_access_key_id=$AWS_ACCESS_KEY_ID" >> ~/.aws/credentials
echo "aws_secret_access_key=$AWS_SECRET_ACCESS_KEY" >> ~/.aws/credentials

sed -e s/ASK_ACCESS_TOKEN/${ASK_ACCESS_TOKEN}/g -e \
    s/ASK_REFRESH_TOKEN/${ASK_REFRESH_TOKEN}/g conf/ask_cli.json > ~/.ask/cli_config
```

Everytime, you commit changes to the `master` branch, we have to generate the ask-cli tokens. We then take the local ASK credentials and upload them to our project. In order to keep them secure, we make the ASK_ACCESS_TOKEN and the ASK_REFRESH_TOKEN in Gitlab-CI as environment variables.


During the deployment, we replace the values using this [script](./deploy.sh). With that, we have a “good” ASK credentials file, which we can then use to interact with the [SMAPI](#to-run-tests-via-skill-simulation-api). 