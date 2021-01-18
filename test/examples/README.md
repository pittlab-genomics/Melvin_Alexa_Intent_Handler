## Test Locally

serverless invoke local --function alexa-skill -p ./test/examples/other/SearchGeneIntent_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/other/SearchGeneIntent_query_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/other/NavigateGeneDefinition_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/legacy/MutationCountIntent_gene_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/legacy/MutationCountIntent_gene_study_payload.json


### Mutations
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateMutationsIntent_GS.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateMutationsIntent_S.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateMutationsIntent_G.json

serverless invoke local --function alexa-skill -p ./test/examples/clinvar/NavigateMutationsIntent_GS.json


### Mutation Domains
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateMutationDomains_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateMutationDomains_GS.json


### CNA
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCNAIntent_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCNAIntent_S.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCNAIntent_GS.json


### CNA - LOSS
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateLossIntent_GS.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateLossIntent_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateLossIntent_S.json


### CNA - GAIN
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateGainIntent_GS.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateGainIntent_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateGainIntent_S.json

### Compare CNA
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_cna_G_vs_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_cna_S_vs_S.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_cna_GS_vs_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_cna_GS_vs_S.json


### Compare GAIN
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_gain_G_vs_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_gain_S_vs_S.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_gain_GS_vs_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_gain_GS_vs_S.json


### Compare LOSS
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_loss_G_vs_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_loss_S_vs_S.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_loss_GS_vs_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_loss_GS_vs_S.json


### Gene Expression
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateGeneExpressionIntent_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateGeneExpressionIntent_GS.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateGeneExpressionIntent_S.json


### Structural Variants
serverless invoke local --function alexa-skill -p ./test/examples/clinvar/NavigateJoinIntent_SV_payload.json


### Navigation
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateJoinFilterIntent_MUT_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateJoinFilterIntent_BRCA_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateJoinFilterIntent_TP53_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateJoinFilterIntent_Mutations_TP53_BRCA_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateJoinFilterIntent_SV-MD_TP53_BRCA_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateJoinFilterIntent_TP53_BRCA_OV_payload.json


### Compare - mutations
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_mutations_G_vs_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_mutations_S_vs_S.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_mutations_GS_vs_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_mutations_GS_vs_S.json


### Compare - MUTATIONS vs CNA
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_mut_cna_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_mut_cna_GS.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateCompareIntent_mut_cna_S.json


### Splitby - MUTATIONS vs CNA
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateSplitbyIntent_exp_mut_G1_G2.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateSplitbyIntent_mut_exp_G1_G2.json

serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateSplitbyIntent_exp_gain_G1_G2.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateSplitbyIntent_exp_loss_G1_G2.json

serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateSplitbyIntent_mut_loss_G1_G2.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateSplitbyIntent_mut_gain_G1_G2.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateSplitbyIntent_mut_mut_G1_G2.json

serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateSplitbyIntent_loss_loss_G1_G2.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateSplitbyIntent_gain_gain_G1_G2.json

serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateSplitbyIntent_mut_loss_splitby_G.json
serverless invoke local --function alexa-skill -p ./test/examples/tcga/NavigateSplitbyIntent_mut_loss_splitby_MUT.json


### Clinical Trials
serverless invoke local --function alexa-skill -p ./test/examples/ClinicalTrialsNearbyIntent_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/ClinicalTrialsWithinIntent_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/ClinicalTrialClosestIntent_payload.json


### Navigation
serverless invoke local --function alexa-skill -p ./test/examples/other/LaunchRequest_1_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/other/LaunchRequest_2_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/other/NavigateResetIntent_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/other/TestMelvinHistory_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/other/NavigateRestoreSessionIntent_payload.json

serverless invoke local --function alexa-skill -p ./test/examples/other/NavigateGoBackHandler_1_payload.json
serverless invoke local --function alexa-skill -p ./test/examples/other/NavigateGoBackHandler_2_payload.json


### IRS
serverless invoke local --function alexa-skill -p ./test/examples/irs/email_count.json
serverless invoke local --function alexa-skill -p ./test/examples/irs/email_duration.json
serverless invoke local --function sqs_irs_subscriber --path ./test/examples/irs/ses_payload_1.json
serverless invoke local --function sqs_irs_subscriber --path ./test/examples/irs/ses_payload_2.json

### Warmup service
serverless invoke local --function warmup_service