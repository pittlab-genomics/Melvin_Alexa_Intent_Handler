const URL = require("url").URL;
const Speech = require("ssml-builder");
const _ = require("lodash");
const { add_to_APL_image_pager } = require("../utils/APL_utils.js");
const { add_query_params } = require("../utils/response_builder_utils.js");

const {
    MelvinAttributes,
    MelvinIntentErrors,
    melvin_error,
    DEFAULT_INVALID_STATE_RESPONSE,
    get_gene_speech_text,
    get_study_name_text,
    MELVIN_EXPLORER_ENDPOINT
} = require("../common.js");

const { get_overview_clinvar_stats } = require("../http_clients/overview_clinvar_client.js");

function _populate_overview_by_study_gene_response(params, data, speech) {
    const mutation_count = data["mutation"];
    const sv_count = data["structural variant"];
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);
    const mutations_text = (mutation_count == 1) ? "mutation" : "mutations";
    const sv_text = (sv_count == 1) ? "structural variant" : "structural variants";

    if (mutation_count == 0 && sv_count == 0) {
        speech
            .say("There are no mutations or structural variants found")
            .sayWithSSML(`at ${gene_speech_text}`)
            .say(`in ${study}`);
    } else {
        speech
            .say(`There are ${mutation_count} ${mutations_text} and ${sv_count} ${sv_text}`)
            .sayWithSSML(`at ${gene_speech_text}`)
            .say(`in ${study}`);
    }

}

function _populate_overview_by_gene_response(params, study_mut_list, speech) {
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    if (study_mut_list.length > 2) {
        const study_0 = study_mut_list[0][0];
        const study_1 = study_mut_list[1][0];
        speech
            .sayWithSSML(`At ${gene_speech_text},`)
            .say(`${study_0} and ${study_1}`)
            .say("are the top two phenotypes with")
            .say(study_mut_list[0][1])
            .say("and")
            .say(study_mut_list[1][1])
            .say("pathogenic variants respectively.");

    } else if (study_mut_list.length > 1) {
        const study_0 = study_mut_list[0][0];
        speech
            .sayWithSSML(`At ${gene_speech_text},`)
            .say(`${study_0} is the top phenotype with`)
            .say(study_mut_list[0][1])
            .say("pathogenic variants.");

    } else if (study_mut_list.length == 1) {
        const study_0 = study_mut_list[0][0];
        speech
            .sayWithSSML(`At ${gene_speech_text},`)
            .say(`${study_0} is the only phenotype with`)
            .say(study_mut_list[0][1])
            .say("pathogenic variants.");

    } else {
        speech.sayWithSSML(`There is no data found in clinvar for ${gene_speech_text}`);
    }
}

function _populate_overview_by_study_response(params, gene_mut_list, speech) {
    const study = get_study_name_text(params[MelvinAttributes.STUDY_ABBRV]);
    if (gene_mut_list.length > 2) {
        const gene_0_speech_text = get_gene_speech_text(gene_mut_list[0][0]);
        const gene_1_speech_text = get_gene_speech_text(gene_mut_list[1][0]);        
        speech
            .say(`In ${study},`)
            .sayWithSSML(`${gene_0_speech_text} and ${gene_1_speech_text}`)
            .say("are the top two genes with")
            .say(gene_mut_list[0][1])
            .say("and")
            .say(gene_mut_list[1][1])
            .say("pathogenic variants respectively.");

    } else if (gene_mut_list.length > 1) {
        const gene_0_speech_text = get_gene_speech_text(gene_mut_list[0]);
        speech
            .say(`In ${study},`)
            .sayWithSSML(`${gene_0_speech_text}`)
            .say("is the top gene with")
            .say(gene_mut_list[0][1])
            .say("pathogenic variants.");

    } else if (gene_mut_list.length == 1) {
        const gene_0_speech_text = get_gene_speech_text(gene_mut_list[0]);
        speech
            .say(`In ${study},`)
            .sayWithSSML(`${gene_0_speech_text}`)
            .say("is the only gene with")
            .say(gene_mut_list[0][1])
            .say("pathogenic variants.");

    } else {
        speech.say(`There is no data found in clinvar for ${study}`);
    }
}

async function build_overview_clinvar_response(handlerInput, params) {
    const speech = new Speech();
    const image_list = [];
    const response = await get_overview_clinvar_stats(params);

    if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && _.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        add_overview_clinvar_plot(image_list, params);
        const study_mut_dict = response["data"];
        const study_mut_list = Object.keys(study_mut_dict).map(function (key) {
            return [key, study_mut_dict[key]];
        });
        _populate_overview_by_gene_response(params, study_mut_list, speech);

    } else if (!_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        add_overview_clinvar_plot(image_list, params);
        const data = response["data"];
        _populate_overview_by_study_gene_response(params, data, speech);

    } else if (_.isEmpty(params[MelvinAttributes.GENE_NAME]) && !_.isEmpty(params[MelvinAttributes.STUDY_ABBRV])) {
        add_overview_clinvar_plot(image_list, params);
        const gene_mut_dict = response["data"];
        const gene_mut_list = Object.keys(gene_mut_dict).map(function (key) {
            return [key, gene_mut_dict[key]];
        });
        _populate_overview_by_study_response(params, gene_mut_list, speech);

    } else {
        throw melvin_error(
            `[build_overview_clinvar_response] invalid state: ${JSON.stringify(params)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }

    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech.ssml() };
}

const add_overview_clinvar_plot = function (image_list, params) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/overview/clinvar/plot`);
    add_query_params(count_plot_url, params);
    image_list.push(count_plot_url);
};

module.exports = { build_overview_clinvar_response };
