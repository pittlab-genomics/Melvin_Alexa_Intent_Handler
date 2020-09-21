const _ = require("lodash");
const { MelvinAttributes } = require("../common.js");

const APLDocs = { image_pager: require("../../resources/APL/image_pager.json"), };
const {
    get_melvin_state,
    get_melvin_aux_state
} = require("../utils/navigation_utils.js");

const MelvinAttributesLabels = {
    [MelvinAttributes.GENE_NAME]:   "Gene",
    [MelvinAttributes.STUDY_ABBRV]: "Study",
    [MelvinAttributes.DTYPE]:       "Data-type",
    [MelvinAttributes.DSOURCE]:     "Data-source"
};

const supportsAPL = function (handlerInput) {
    const supportedInterfaces = handlerInput.requestEnvelope.context
        .System.device.supportedInterfaces;
    const aplInterface = supportedInterfaces["Alexa.Presentation.APL"];
    return aplInterface != null && aplInterface !== undefined;
};

function build_APL_datasource_properties(url_list) {
    const properties = {};

    url_list.forEach(function (value, i) {
        let key = "image" + i;
        properties[key] = { "URL": value };
    });
    return properties;
}

function build_APL_footer_text(handlerInput) {
    const melvin_state = get_melvin_state(handlerInput);
    const melvin_state_text = Object.keys(melvin_state)
        .filter(k => (k in MelvinAttributesLabels))
        .map(k => `${melvin_state[k]}`)
        .join(" | ");

    const melvin_aux_state = get_melvin_aux_state(handlerInput);
    const melvin_aux_state_text = Object.keys(melvin_aux_state)
        .filter(k => (_.without(Object.keys(MelvinAttributesLabels), MelvinAttributes.DSOURCE).includes(k)))
        .map(k => `${melvin_aux_state[k]}`)
        .join(" | ");

    let footer_text = melvin_state_text;
    if (melvin_aux_state_text !== "") {
        footer_text += " vs " + melvin_aux_state_text;
    }
    return footer_text;
}

function build_APL_layouts(url_list) {
    const layouts = {};
    const layout_page_template = {
        "parameters": [
            {
                "name": "imageURL",
                "type": "string"
            },
            {
                "name": "footer_text",
                "type": "string"
            }
        ],
        "items": [
            {
                "type":           "Container",
                "width":          "100vw",
                "height":         "100vh",
                "alignItems":     "center",
                "justifyContent": "center",
                "items":          [
                    {
                        "type":   "Image",
                        "source": "${imageURL}",
                        "scale":  "best-fit",
                        "width":  "100vw",
                        "height": "90vh",
                        "align":  "center"
                    },
                    {
                        "type":              "Text",
                        "width":             "100vw",
                        "height":            "10vh",
                        "paddingLeft":       "@spacingSmall",
                        "paddingRight":      "@spacingSmall",
                        "textAlign":         "left",
                        "textAlignVertical": "center",
                        "fontSize":          "30dp",
                        "text":              "${footer_text}",
                        "fontWeight":        "200"
                    }
                ]
            }
        ]
    };

    url_list.forEach(function (value, i) {
        let key = "Page" + i;
        layouts[key] = layout_page_template;
    });
    return layouts;
}


function build_APL_main_template_items(url_list) {
    const items = [];

    url_list.forEach(function (value, i) {
        let type = "Page" + i;
        let imageLabel = "image" + i;

        let item = {
            "type":        type,
            "imageURL":    "${payload.pagerTemplateData.properties." + imageLabel + ".URL}",
            "footer_text": "${payload.pagerTemplateData.footer_text}"
        };
        items.push(item);
    });
    return items;
}

function add_context_to_urls(handlerInput, url_list) {
    const request_id = handlerInput.requestEnvelope.request.requestId;
    const session_id = handlerInput.requestEnvelope.session.sessionId;
    url_list.forEach(function (url, i) {
        url.searchParams.set("request_id", request_id);
        url.searchParams.set("session_id", session_id);
    });
}

const add_to_APL_image_pager = function (handlerInput, url_list) {
    if (!Array.isArray(url_list) || url_list.length == 0) {
        console.log("[WARNING] add_to_APL_image_pager called with invalid url_list");
        return;
    }

    if (supportsAPL(handlerInput)) {
        // add context information to image URLs
        add_context_to_urls(handlerInput, url_list);

        const image_pager_doc = APLDocs.image_pager;
        image_pager_doc["layouts"] = build_APL_layouts(url_list);
        image_pager_doc["mainTemplate"]["items"][0]["items"] = build_APL_main_template_items(url_list);

        handlerInput.responseBuilder.addDirective({
            type:        "Alexa.Presentation.APL.RenderDocument",
            token:       "pagerToken",
            version:     "1.0",
            document:    image_pager_doc,
            datasources: { "pagerTemplateData": {
                "type":        "object",
                "properties":  build_APL_datasource_properties(url_list),
                "footer_text": build_APL_footer_text(handlerInput)
            }, },
        });

        if (url_list.length > 1) {
            handlerInput.responseBuilder.addDirective({
                type:     "Alexa.Presentation.APL.ExecuteCommands",
                token:    "pagerToken",
                commands: [
                    {
                        "type":        "AutoPage",
                        "componentId": "pagerComponentId",
                        "duration":    5000,
                    },
                ],
            });
        }

    } else {
        handlerInput.responseBuilder.withStandardCard(
            "Melvin",
            "Image response",
            url_list[0],
            url_list[0]
        );
    }
};


module.exports = {
    supportsAPL,
    add_to_APL_image_pager
};