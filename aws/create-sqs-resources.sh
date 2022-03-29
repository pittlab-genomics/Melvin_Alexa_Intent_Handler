#!/bin/bash

# Passing the stage name as a parameter
stage=${1:-"dev"}

export AWS_DEFAULT_REGION="eu-west-1"

dir="${BASH_SOURCE%/*}"

irs_service_name="melvin-sqs-irs"
irs_queue_name=${irs_service_name}-${stage}
irs_dlq_queue_name=${irs_service_name}-dlq-${stage}

warmup_service_name="melvin-sqs-warmup"
warmup_queue_name=${warmup_service_name}-${stage}

irs_dlq_queue_url=$(aws sqs create-queue --queue-name $irs_dlq_queue_name --attributes '{"VisibilityTimeout": "300"}' | jq -r .QueueUrl)
echo "irs_dlq_queue_name: $irs_dlq_queue_name | irs_dlq_queue_url: $irs_dlq_queue_url"

irs_dlq_arn=$(aws sqs get-queue-attributes --queue-url $irs_dlq_queue_url --attribute-names QueueArn | jq -r .Attributes.QueueArn)
echo "irs_dlq_arn: $irs_dlq_arn"

aws sqs create-queue --queue-name $irs_queue_name --attributes \
    '{"VisibilityTimeout": "300", "RedrivePolicy": "{\"deadLetterTargetArn\": \"'$irs_dlq_arn'\", \"maxReceiveCount\": \"3\"}"}'

aws sqs create-queue --queue-name $warmup_queue_name --attributes '{"VisibilityTimeout": "30"}'

echo "success"