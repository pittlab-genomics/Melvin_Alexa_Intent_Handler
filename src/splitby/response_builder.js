const _ = require("lodash");

const {
    MelvinAttributes,
    MelvinIntentErrors,
    DataSources,
    DataTypes,
    melvin_error,
    DEFAULT_INVALID_STATE_RESPONSE,
    MELVIN_EXPLORER_ENDPOINT
} = require("../common.js");

const {
    get_gain_gain_splitby_tcga_stats,
    get_gain_loss_splitby_tcga_stats,
    get_loss_loss_splitby_tcga_stats,
    get_cna_cna_splitby_tcga_stats,
    get_cna_gain_splitby_tcga_stats,
    get_cna_loss_splitby_tcga_stats,
    get_ind_ind_splitby_tcga_stats,
    get_ind_cna_splitby_tcga_stats,
    get_ind_gain_splitby_tcga_stats,
    get_ind_loss_splitby_tcga_stats,
    get_snv_snv_splitby_tcga_stats,
    get_snv_ind_splitby_tcga_stats,
    get_snv_cna_splitby_tcga_stats,
    get_snv_gain_splitby_tcga_stats,
    get_snv_loss_splitby_tcga_stats,
    get_mut_splitby_tcga_stats,
    get_exp_splitby_tcga_stats
} = require("../http_clients/melvin_explorer_client.js");

const { add_to_APL_image_pager } = require("../utils/APL_utils.js");
const { build_ssml_response_from_nunjucks } = require("../utils/response_builder_utils.js");

async function build_splitby_clinvar_response(handlerInput, melvin_state, splitby_state) {
    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:  melvin_state,
        splitby_state: splitby_state,
    };

    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_clinvar.njk", nunjucks_context);
    return { "speech_text": speech_ssml };
}

const add_gain_gain_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/GAINsGAIN_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_gain_gain_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_gain_gain_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_gain_gain_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);    
    return { "speech_text": speech_ssml };
}

const add_gain_loss_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/GAINsLOSS_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_gain_loss_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_gain_loss_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_gain_loss_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);    
    return { "speech_text": speech_ssml };
}

const add_loss_loss_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/LOSSsLOSS_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_loss_loss_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_loss_loss_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_loss_loss_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

const add_cna_cna_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/CNAsCNA_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_cna_cna_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_cna_cna_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_cna_cna_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);    
    return { "speech_text": speech_ssml };
}

const add_cna_gain_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/CNAsGAIN_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_cna_gain_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_cna_gain_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_cna_gain_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);    
    return { "speech_text": speech_ssml };
}

const add_cna_loss_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/CNAsLOSS_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_cna_loss_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_cna_loss_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_cna_loss_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

const add_ind_ind_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/INDsIND_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_ind_ind_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_ind_ind_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_ind_ind_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

const add_ind_cna_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/INDsCNA_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_ind_cna_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_ind_cna_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_ind_cna_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);    
    return { "speech_text": speech_ssml };
}

const add_ind_gain_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/INDsGAIN_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_ind_gain_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_ind_gain_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_ind_gain_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);    
    return { "speech_text": speech_ssml };
}

const add_ind_loss_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/INDsLOSS_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_ind_loss_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_ind_loss_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_ind_loss_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

const add_snv_snv_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/SNVsSNV_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_snv_snv_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_snv_snv_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_snv_snv_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

const add_snv_ind_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/SNVsIND_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_snv_ind_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_snv_ind_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_snv_ind_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

const add_snv_cna_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/SNVsCNA_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_snv_cna_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_snv_cna_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_snv_cna_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

const add_snv_gain_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/SNVsGAIN_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_snv_gain_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_snv_gain_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_snv_gain_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

const add_snv_loss_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/SNVsLOSS_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_snv_loss_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_snv_loss_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_snv_loss_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

const add_exp_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/EXP_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_exp_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_exp_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_exp_tcga.njk", nunjucks_context);

    add_exp_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

const add_mut_splitby_tcga_stats_plot = function(image_list, melvin_state, splitby_state) {
    const splitby_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/splitby/tcga/MUT_plot`);
    splitby_url.searchParams.set("melvin_state", JSON.stringify(melvin_state));
    splitby_url.searchParams.set("splitby_state", JSON.stringify(splitby_state));
    image_list.push(splitby_url);
};

async function build_mut_splitby_tcga_response(handlerInput, melvin_state, splitby_state) {
    const image_list = [];
    const m_state = convert(melvin_state);
    const s_state = convert(splitby_state);
    const response = await get_mut_splitby_tcga_stats(handlerInput, m_state, s_state);

    const nunjucks_context = {
        MelvinAttributes,
        melvin_state:     melvin_state,
        splitby_state:    splitby_state,
        splitby_response: response
    };
    const speech_ssml = build_ssml_response_from_nunjucks("splitby/splitby_tcga.njk", nunjucks_context);

    add_mut_splitby_tcga_stats_plot(image_list, m_state, s_state);
    add_to_APL_image_pager(handlerInput, image_list);
    return { "speech_text": speech_ssml };
}

async function build_splitby_response(handlerInput, melvin_state, splitby_state) {
    console.info(`[build_splitby_response] melvin_state: ${JSON.stringify(melvin_state)}, ` + 
        `splitby_state: ${JSON.stringify(splitby_state)}`);
    let response = {};
    if (!_.isEmpty(melvin_state[MelvinAttributes.STUDY_ABBRV])) {
        splitby_state[MelvinAttributes.STUDY_ABBRV] = melvin_state[MelvinAttributes.STUDY_ABBRV];
    }
    
    if (melvin_state[MelvinAttributes.DSOURCE] === DataSources.TCGA) {
        const query_dtypes = [melvin_state[MelvinAttributes.DTYPE], splitby_state[MelvinAttributes.DTYPE]];
        if (match_splitby_dtype(query_dtypes, [DataTypes.GAIN, DataTypes.GAIN])) {
            response = await build_gain_gain_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.GAIN, DataTypes.LOSS])) {
            response = await build_gain_loss_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.LOSS, DataTypes.LOSS])) {
            response = await build_loss_loss_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.CNA, DataTypes.CNA])) {
            response = await build_cna_cna_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.CNA, DataTypes.GAIN])) {
            response = await build_cna_gain_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.CNA, DataTypes.LOSS])) {
            response = await build_cna_loss_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.INDELS, DataTypes.INDELS])) {
            response = await build_ind_ind_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.INDELS, DataTypes.CNA])) {
            response = await build_ind_cna_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.INDELS, DataTypes.GAIN])) {
            response = await build_ind_gain_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.INDELS, DataTypes.LOSS])) {
            response = await build_ind_loss_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.SNV, DataTypes.SNV])) {
            response = await build_snv_snv_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.SNV, DataTypes.INDELS])) {
            response = await build_snv_ind_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.SNV, DataTypes.CNA])) {
            response = await build_snv_cna_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.SNV, DataTypes.GAIN])) {
            response = await build_snv_gain_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if (match_splitby_dtype(query_dtypes, [DataTypes.SNV, DataTypes.LOSS])) {
            response = await build_snv_loss_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if(match_either_splitby_dtype(query_dtypes, DataTypes.GENE_EXPRESSION)) {
            response = await build_exp_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else if(match_either_splitby_dtype(query_dtypes, DataTypes.MUTATIONS)) {
            response = await build_mut_splitby_tcga_response(handlerInput, melvin_state, splitby_state);
        } else {
            throw melvin_error(
                `[build_splitby_response] invalid state | melvin_state: ${JSON.stringify(melvin_state)}` +
                `splitby_state: ${JSON.stringify(splitby_state)}`,
                MelvinIntentErrors.INVALID_STATE,
                DEFAULT_INVALID_STATE_RESPONSE
            );
        }

    } else if (melvin_state[MelvinAttributes.DSOURCE] === DataSources.CLINVAR) {
        response = await build_splitby_clinvar_response(handlerInput, melvin_state, splitby_state);

    } else {
        throw melvin_error(
            `[build_splitby_response] invalid state: melvin_state: ${JSON.stringify(melvin_state)}, ` + 
                `splitby_state: ${JSON.stringify(splitby_state)}`,
            MelvinIntentErrors.INVALID_STATE,
            DEFAULT_INVALID_STATE_RESPONSE
        );
    }
    return response;
}

const match_either_splitby_dtype = function(query_dtypes, target) {
    if (query_dtypes[0] === target || query_dtypes[1] === target) {
        return true;
    }
    return false;
};

const match_splitby_dtype = function (query_dtypes, target_dtypes) {
    if ((query_dtypes[0] === target_dtypes[0] && query_dtypes[1] === target_dtypes[1])
        || (query_dtypes[0] === target_dtypes[1] && query_dtypes[1] === target_dtypes[0])
    ) {
        return true;
    }
    return false;
};

const convert = function(state){
    const tempState = { ...state };
    renameKey(tempState, "gene_name", "gene");
    renameKey(tempState, "study_abbreviation", "study");
    return tempState;
};

const renameKey = function(obj, oldKey, newKey) {
    obj[newKey] = obj[oldKey];
    delete obj[oldKey];
};

module.exports = { build_splitby_response };