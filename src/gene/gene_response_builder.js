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
    
    if(response.data.summary.match(regex))
    {
        const sentence_sum = response.data.summary.match(regex)[0];
        const location = response.data.location;

        if(location != "N/A") {
            speech
                .sayWithSSML(gene_speech_text)
                .say(`is at ${location}.`)
                .pause("800ms")
                .say(sentence_sum);
        } else {
            speech.say(sentence_sum);
        }
    } else {
        speech.sayWithSSML(`Sorry, I don't have the gene definition for ${gene_speech_text}.`);
    }

    add_to_APL_text_pager(handlerInput, speech.ssml(true));
    return speech;
};

const build_gene_target_response = async function (handlerInput, params) {
    const speech = new Speech();
    const response = await get_gene_target(handlerInput, params);
    const gene_speech_text = get_gene_speech_text(params[MelvinAttributes.GENE_NAME]);

    if(_.size(response.data)!=0)
    {
        const groups = _(response.data).groupBy("Biomarker")
            .map((v, biomarker) => ({
                biomarker,
                drugs: _.map(v, "Drug")
            }));
        const count = Object.keys(_.groupBy(response.data, drug => drug.Biomarker)).length;
        const bm_sentence = (count > 1) ? "biomarkers": "biomarker";
        const drugs_sentence = parse(groups);
        speech
            .say("According to the US FDA,")
            .sayWithSSML(gene_speech_text)
            .say(`has ${count} therapeutic ${bm_sentence} relevant to oncology.`)
            .pause("800ms")
            .say(drugs_sentence);
    } else {
        speech
            .sayWithSSML(`Sorry, I don't have any drug information about ${gene_speech_text}.`);
    }

    add_to_APL_text_pager(handlerInput, speech.ssml(true));
    return speech;
};


const parse = function(groups) {
    let result = "";

    groups.forEach((group) => {
        let bm = group["biomarker"];
        let drugs = group["drugs"];
        let last = drugs.pop();
        if(drugs.length > 1) {
            result += " " + bm + " is treated with " + drugs.join(", ") + " and " + last + ".";
        } else {
            result += " " + bm + " is treated with " + last + ".";
        }
    });
    return result;
};

module.exports = {
    build_gene_definition_response,
    build_gene_target_response
};