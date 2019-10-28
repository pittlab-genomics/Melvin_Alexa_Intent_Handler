const _ = require('lodash');

const APLDocs = {
    image_pager: require('../../resources/APL/image_pager.json'),
};

const supportsAPL = function (handlerInput) {
    const supportedInterfaces = handlerInput.requestEnvelope.context
        .System.device.supportedInterfaces;
    const aplInterface = supportedInterfaces['Alexa.Presentation.APL'];
    return aplInterface != null && aplInterface !== undefined;
};

function build_APL_datasource_properties(url_list) {
    const properties = {};

    url_list.forEach(function (value, i) {
        let key = 'image' + i;
        properties[key] = {
            'URL': value
        };
    });
    return properties;
}



function build_APL_layouts(url_list) {
    const layouts = {};
    const layout_page_template = {
        "parameters": [
            {
                "name": "imageURL",
                "type": "string"
            }
        ],
        "items": [
            {
                "type": "Container",
                "width": "100vw",
                "height": "100vh",
                "items": [
                    {
                        "type": "Container",
                        "width": "100vw",
                        "height": "100vh",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "items": [
                            {
                                "type": "Image",
                                "source": "${imageURL}",
                                "scale": "best-fit",
                                "width": "100vw",
                                "height": "100vh",
                                "align": "center"
                            }
                        ]
                    }
                ]
            }
        ]
    };

    url_list.forEach(function (value, i) {
        let key = 'Page' + i;
        layouts[key] = layout_page_template;
    });
    return layouts;
}


function build_APL_main_template_items(url_list) {
    const items = [];

    url_list.forEach(function (value, i) {
        let type = 'Page' + i;
        let imageLabel = 'image' + i;

        let item = {
            "type": type,
            "imageURL": "${payload.pagerTemplateData.properties." + imageLabel + ".URL}"
        };
        items.push(item);
    });
    return items;
}

function add_context_to_urls(handlerInput, url_list) {
    const request_id = handlerInput.requestEnvelope.request.requestId;
    const session_id = handlerInput.requestEnvelope.session.sessionId;
    url_list.forEach(function (url, i) {
        url.searchParams.set('request_id', request_id);
        url.searchParams.set('session_id', session_id);
    });
}

const add_to_APL_image_pager = function (handlerInput, url_list) {
    if (!Array.isArray(url_list) || url_list.length == 0) {
        console.log('[WARNING] add_to_APL_image_pager called with invalid url_list');
        return;
    }

    if (supportsAPL(handlerInput)) {
        // add context information to image URLs
        add_context_to_urls(handlerInput, url_list);

        const image_pager_doc = APLDocs.image_pager;
        image_pager_doc['layouts'] = build_APL_layouts(url_list);
        image_pager_doc['mainTemplate']['items'][0]['items'] = build_APL_main_template_items(url_list);

        handlerInput.responseBuilder.addDirective({
            type: 'Alexa.Presentation.APL.RenderDocument',
            token: 'pagerToken',
            version: '1.0',
            document: image_pager_doc,
            datasources: {
                'pagerTemplateData': {
                    'type': 'object',
                    'properties': build_APL_datasource_properties(url_list)
                },
            },
        });

        if (url_list.length > 1) {
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.ExecuteCommands',
                token: 'pagerToken',
                commands: [
                    {
                        'type': 'AutoPage',
                        'componentId': 'pagerComponentId',
                        'duration': 5000,
                    },
                ],
            });
        }
    }
}


module.exports = {
    supportsAPL,
    add_to_APL_image_pager
}