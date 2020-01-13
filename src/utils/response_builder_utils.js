const URL = require('url').URL;
const _ = require('lodash');

const {
    MELVIN_EXPLORER_ENDPOINT,
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

const add_mutations_stats_plot = function (image_list, params) {
    const count_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/count_plot`);
    add_query_params(count_plot_url, params);
    image_list.push(count_plot_url);
}

const add_mutations_treemap_plot = function (image_list, params) {
    const count_treemap_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/count_treemap_plot`);
    add_query_params(count_treemap_plot_url, params);
    image_list.push(count_treemap_plot_url);
}

const add_mutations_profile_plot = function (image_list, params) {
    const profile_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/profile_plot`);
    add_query_params(profile_plot_url, params);
    image_list.push(profile_plot_url);
}

const add_domain_pie_plot = function (image_list, params) {
    const domain_pie_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/domain_pie_plot`);
    add_query_params(domain_pie_plot_url, params);
    image_list.push(domain_pie_plot_url);
}

const add_domain_stack_plot = function (image_list, params) {
    const domain_stack_plot_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/mutations/domain_stack_plot`);
    add_query_params(domain_stack_plot_url, params);
    image_list.push(domain_stack_plot_url);
}

const add_cnv_plot = function (image_list, params) {
    const cnv_url = new URL(`${MELVIN_EXPLORER_ENDPOINT}/analysis/cnvs/percent_patients_plot`);
    add_query_params(cnv_url, params);
    image_list.push(cnv_url);
}

const round = function (value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

module.exports = {
    add_query_params,
    add_query_list_params,
    add_mutations_stats_plot,
    add_mutations_treemap_plot,
    add_mutations_profile_plot,
    add_domain_pie_plot,
    add_domain_stack_plot,
    add_cnv_plot,
    round
}