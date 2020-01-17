const {
    MelvinAttributes
} = require('../common.js');


const add_query_list_params = function (url, params, list) {
    list.forEach(function (item) {
        if (item in params) {
            url.searchParams.set(item, params[item]);
        }
    });
}

const add_query_params = function (url, params) {
    if (params[MelvinAttributes.GENE_NAME]) {
        url.searchParams.set('gene', params[MelvinAttributes.GENE_NAME]);
    }

    if (params[MelvinAttributes.STUDY_ABBRV]) {
        url.searchParams.set('study', params[MelvinAttributes.STUDY_ABBRV]);
    }
}

const round = function (value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

module.exports = {
    add_query_params,
    add_query_list_params,
    round
}