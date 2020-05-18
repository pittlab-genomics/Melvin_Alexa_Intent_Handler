#!/bin/bash

# Passing the stage name as a parameter
stage=${1:-"dev"}

region="eu-west-1"

dir="${BASH_SOURCE%/*}"

irs_service_name="melvin-sqs-irs"
irs_queue_name=${irs_service_name}-${stage}

warmup_service_name="melvin-sqs-warmup"
warmup_queue_name=${warmup_service_name}-${stage}

aws sqs create-queue --queue-name $irs_queue_name --attributes file://${dir}/sqs-irs-attributes.json

aws sqs create-queue --queue-name $warmup_queue_name --attributes file://${dir}/sqs-warmup-attributes.json

echo "success"