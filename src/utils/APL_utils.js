const _ = require("lodash");
const {
    MelvinAttributes,
    MELVIN_APP_NAME,
    MELVIN_EXPLORER_REGION
} = require("../common.js");
const {
    sign_request, build_presigned_url
} = require("./sigv4_utils");

const APLDocs = {
    image_pager: require("../../resources/APL/image_pager.json"),
    text_pager:  require("../../resources/APL/text_pager.json")
};
const {
    get_melvin_state,
    get_melvin_aux_state
} = require("../utils/navigation_utils.js");
const ssml_regex = /(<([^>]+)>)/ig;

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
    const layout_result = {};
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

    url_list.forEach(function (value, index) {
        let key = "Page" + index;
        // deep clone layout template and set APL component ids
        let layout_page_instance = JSON.parse(JSON.stringify(layout_page_template));
        layout_page_instance["items"][0]["items"][0]["id"] = key + "_image_container";
        layout_page_instance["items"][0]["items"][1]["id"] = key + "_text_container";
        layout_result[key] = layout_page_instance;
    });
    return layout_result;
}


function build_APL_main_template_items(url_list) {
    const items = [];

    url_list.forEach(function (value, index) {
        let type = "Page" + index;
        let imageLabel = "image" + index;

        let item = {
            "id":          "imageComponent_" + index,
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
    url_list.forEach(function (url) {
        url.searchParams.set("request_id", request_id);
        url.searchParams.set("session_id", session_id);
    });
}

const add_to_APL_text_pager = function (handlerInput, text) {
    let response_text = "";
    if (!_.isEmpty(text)) response_text = text.replace(ssml_regex, "");
    if (supportsAPL(handlerInput)) {
        const text_pager_doc = APLDocs.text_pager;
        handlerInput.responseBuilder.addDirective({
            type:        "Alexa.Presentation.APL.RenderDocument",
            token:       "pagerToken",
            document:    text_pager_doc,
            datasources: { "pagerTemplateData": {
                "type":        "object",
                "footer_text": build_APL_footer_text(handlerInput),
                "body_text":   response_text,
                "header_text": MELVIN_APP_NAME
            }},
        });

    } else {
        response_text = response_text + "\n \n \n \n \n" + build_APL_footer_text(handlerInput);
        handlerInput.responseBuilder.withSimpleCard(
            MELVIN_APP_NAME,
            response_text
        );
    }
};

const add_to_APL_image_pager = function (handlerInput, url_list) {
    if (!Array.isArray(url_list) || url_list.length == 0) {
        add_to_APL_text_pager(handlerInput, "");
        return;
    }

    // add context information to image URLs and populate pre-signed URLs
    add_context_to_urls(handlerInput, url_list);
    const signed_url_list = [];
    url_list.forEach(function (url) {
        const signed_req = sign_request(url, MELVIN_EXPLORER_REGION, handlerInput, true);
        const presigned_url = build_presigned_url(signed_req);
        signed_url_list.push(presigned_url);
    });

    if (supportsAPL(handlerInput)) {
        const image_pager_doc = APLDocs.image_pager;
        image_pager_doc["layouts"] = build_APL_layouts(url_list);
        image_pager_doc["mainTemplate"]["items"][0]["items"] = build_APL_main_template_items(url_list);

        handlerInput.responseBuilder.addDirective({
            type:        "Alexa.Presentation.APL.RenderDocument",
            token:       "pagerToken",
            document:    image_pager_doc,
            datasources: { "pagerTemplateData": {
                "type":        "object",
                "properties":  build_APL_datasource_properties(signed_url_list),
                "footer_text": build_APL_footer_text(handlerInput)
            }},
        });

        handlerInput.responseBuilder.addDirective({
            "type":     "Alexa.Presentation.APL.ExecuteCommands",
            "token":    "pagerToken",
            "commands": [
                {
                    "type":     "Parallel",
                    "commands": [
                        {
                            "type":  "Idle",
                            "delay": 3000
                        },
                        {
                            "type":        "AutoPage",
                            "componentId": "pagerComponentId",
                            "duration":    5000
                        }
                    ]
                }
            ]
        });

    } else {
        handlerInput.responseBuilder.withStandardCard(
            "Melvin",
            build_APL_footer_text(handlerInput),
            signed_url_list[0],
            signed_url_list[0]
        );
    }
};


module.exports = {
    supportsAPL,
    add_to_APL_image_pager,
    add_to_APL_text_pager
};