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

serverless invoke local --function alexa-skill -p ./examples/LaunchRequest_payload.json

serverless invoke local --function alexa-skill -p ./examples/SearchGeneIntent_payload.json
serverless invoke local --function alexa-skill -p ./examples/SearchGeneIntent_query_payload.json

serverless invoke local --function alexa-skill -p ./examples/CNVAmplificationGeneIntent_payload.json

serverless invoke local --function alexa-skill -p ./examples/MutationCountIntent_gene_payload.json
serverless invoke local --function alexa-skill -p ./examples/MutationCountIntent_gene_study_payload.json

serverless invoke local --function alexa-skill -p ./examples/NavigateGene_payload.json
serverless invoke local --function alexa-skill -p ./examples/NavigateGeneDefinition_payload.json

serverless invoke local --function alexa-skill -p ./examples/clinvar/NavigateOverviewIntent_study_payload.json
serverless invoke local --function alexa-skill -p ./examples/clinvar/NavigateOverviewIntent_gene_payload.json
serverless invoke local --function alexa-skill -p ./examples/clinvar/NavigateOverviewIntent_study_gene_payload.json

serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateMutationsIntent_payload.json
serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateMutationsIntent_BRCA_payload.json
serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateMutationDomains_payload.json
serverless invoke local --function alexa-skill -p ./examples/clinvar/NavigateMutationsIntent_payload.json

serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateCNVIntent_payload.json
serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateCNVDeletionsIntent_payload.json
serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateCNVCancerIntent_payload.json
serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateCNV_with_study_payload.json

serverless invoke local --function alexa-skill -p ./examples/clinvar/NavigateJoinIntent_SV_payload.json

serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateJoinFilterIntent_BRCA_payload.json
serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateJoinFilterIntent_TP53_payload.json
serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateJoinFilterIntent_Mutations_TP53_BRCA_payload.json
serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateJoinFilterIntent_SV-MD_TP53_BRCA_payload.json
serverless invoke local --function alexa-skill -p ./examples/tcga/NavigateJoinFilterIntent_TP53_BRCA_OV_payload.json

serverless invoke local --function alexa-skill -p ./examples/NavigateResetIntent_payload.json


### Clinical Trials
serverless invoke local --function alexa-skill -p ./examples/ClinicalTrialsNearbyIntent_payload.json
serverless invoke local --function alexa-skill -p ./examples/ClinicalTrialsWithinIntent_payload.json
serverless invoke local --function alexa-skill -p ./examples/ClinicalTrialClosestIntent_payload.json