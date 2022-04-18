const Speech = require("ssml-builder");
const _ = require("lodash");

const {
    get_gene_by_name,
    get_gene_target
} = require("../http_clients/melvin_explorer_client.js");
const { add_to_APL_text_pager } = require("../utils/APL_utils.js");

const {
    MelvinAttributes,
    get_gene_speech_text
} = require("../common.js");

const build_gene_definition_response = async function (handlerInput, params) {
    const speech = new Speech();
    const response = await get_gene_by_name(handlerInput, params);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);
    let regex = new RegExp(/\S.*?\."?(?=\s|$)/g);

    if (response.data.summary.match(regex)) {
        const sentence_sum = response.data.summary.match(regex)[0];
        const location = response.data.location;
        if (!_.isEmpty(location) && location !== "N/A") {
            speech
                .sayWithSSML(gene_speech_text)
                .say(`is at ${location}.`)
                .pause("500ms");
        }
        speech.say(sentence_sum);
        const APL_text = `${params[MelvinAttributes.GENE_NAME]} is at ${location}. ${sentence_sum}`;
        add_to_APL_text_pager(handlerInput, APL_text);
    } else {
        speech.sayWithSSML(`Sorry, I don't have the gene definition for ${gene_speech_text}.`);
    }

    return speech;
};

const build_gene_target_response = async function (handlerInput, params) {
    const speech = new Speech();
    const response = await get_gene_target(handlerInput, params);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);

    if (_.size(response.data) != 0) {
        const groups = _(response.data).groupBy("Biomarker")
            .map((v, biomarker) => ({
                biomarker,
                drugs: _.map(v, "Drug")
            }));
        const count = Object.keys(_.groupBy(response.data, drug => drug.Biomarker)).length;
        const bm_sentence = (count > 1) ? "entries" : "entry";
        const drugs_sentence = parseBiomarkers(groups).trim();
        speech
            .say("According to the US FDA's pharmacogenomics database,")
            .sayWithSSML(gene_speech_text)
            .say(`has ${count} therapeutic biomarker ${bm_sentence} relevant to oncology.`)
            .pause("500ms")
            .say(drugs_sentence);
        const APL_text = `According to the US FDA's pharmacogenomics database, ${params[MelvinAttributes.GENE_NAME]} `
            + `has ${count} therapeutic biomarker ${bm_sentence} relevant to oncology. ${drugs_sentence}`;
        add_to_APL_text_pager(handlerInput, APL_text);
    } else {
        speech
            .sayWithSSML(`Sorry, I don't have any drug information about ${gene_speech_text}.`);
    }

    return speech;
};


const parseBiomarkers = function (groups) {
    console.debug(`[gene_response_builder] parsed biomarkers: ${JSON.stringify(groups)}`);
    let bm_speech_list = [];
    groups.forEach((group) => {
        let bm = group["biomarker"];
        let drugs = group["drugs"];
        if (drugs.length > 2) {
            bm_speech_list.push(`'${bm}' can be targeted with ${drugs.slice(0, -1).join(", ")}`
                + `, and ${drugs.slice(-1)[0]}.`);
        } else if (drugs.length == 2) {
            bm_speech_list.push(`'${bm}' can be targeted with ${drugs[0]} and ${drugs[1]}.`);
        } else if (drugs.length == 1) {
            bm_speech_list.push(`'${bm}' can be targeted with ${drugs[0]}.`);
        }
    });
    return bm_speech_list.join(" ");
};

module.exports = {
    build_gene_definition_response,
    build_gene_target_response
};