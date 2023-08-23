const _ = require("lodash");
const nlp = require("compromise");

const match_entity_from_recorded_utterances = function (query, utterances) {
    let result = [];
    let cleaned_query = query.toLowerCase().trim();
    let query_doc = nlp(cleaned_query);
    query_doc.numbers().toText();
    let processed_query = query_doc.text().toLowerCase().trim();
    console.info(`[match_entity_from_recorded_utterances] cleaned_query: ${cleaned_query}, `
        + `processed_query: ${processed_query}, utterances: ${JSON.stringify(utterances)}`);

    utterances.forEach(item => {
        let item_query = item["query"].toLowerCase().trim();
        let item_doc = nlp(item_query);
        item_doc.numbers().toText();
        let processed_utterance = item_doc.text();
        if (cleaned_query === item_query) {
            result.push(item);
        }
        if (!_.isEmpty(processed_query)) {
            if (processed_query === item_query) {
                result.push(item);
            } else if (processed_query === processed_utterance) {
                result.push(item);
            }
        }
    });
    return result;
};

module.exports = { match_entity_from_recorded_utterances };
