const Speech = require("ssml-builder");

const { MELVIN_EXPLORER_ENDPOINT, } = require("../common.js");

const { add_to_APL_image_pager } = require("../utils/APL_utils.js");
const { add_query_params } = require("../utils/response_builder_utils.js");


async function build_hrd_response(handlerInput, melvin_state) {
    console.info(`[build_hrd_response] melvin_state: ${JSON.stringify(melvin_state)}`);
    const image_list = [];
    const speech = new Speech();
    speech.say("In breast invasive carcinoma, homologous recombination deficiency scores show " +
        "differential activity between braca one mutant and wild type samples " +
        "with a Mann Whitney P value of 0.01.");
    add_hrd_plot(image_list, melvin_state);
    await add_to_APL_image_pager(handlerInput, image_list);
    return speech;
}

const add_hrd_plot = function (image_list, params) {
    const hrd_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/hrd/hrd_plot`);
    add_query_params(hrd_url, params);
    image_list.push(hrd_url);
};


module.exports = { build_hrd_response };