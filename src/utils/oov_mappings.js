const fs = require("fs");

const oov_mappings_json = __dirname + "/../../resources/response_templates/oov_mappings.json";
const OOVMappings = JSON.parse(fs.readFileSync(oov_mappings_json, "utf8"));

module.exports = { OOVMappings };