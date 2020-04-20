#!/bin/bash

# Passing the stage name as a parameter
stage=${1:-"dev"}

region="eu-west-1"

dir="${BASH_SOURCE%/*}"

service_name="melvin"

declare -a table_list=(
                "user-utterance"
                "user-session"
                )


for i in "${table_list[@]}"
do
    table_name=$service_name-$i-$stage
    echo "Creating table: $table_name"

    table_definition_path="$dir/$i-table-definition.json"
    tmp_table_definition_path="/tmp/_MELVIN_$table_name"
    sed "s/_MELVIN_DYNAMODB_TABLE_NAME/$table_name/g" $table_definition_path > $tmp_table_definition_path

    # Trigger table creation
    aws dynamodb create-table --cli-input-json "file://$tmp_table_definition_path" \
        --region $region \
        --billing-mode "PAY_PER_REQUEST"

    # Wait till the table is active
    aws dynamodb wait table-exists --table-name "$table_name" --region $region
    sleep 10

    aws dynamodb update-continuous-backups \
        --table-name $table_name \
        --point-in-time-recovery-specification PointInTimeRecoveryEnabled=True
done

echo "success"






