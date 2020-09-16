const fs = require("fs");

/* 
 * Some genes have special pronunciations. This dictionary contains SSML codes 
 * for those gene names that will help Alexa to properly pronounce them. 
*/
const gene_ssml_mappings_json = __dirname + "/../../resources/response_templates/gene_ssml_mappings.json";
const GeneSSMLMappings = JSON.parse(fs.readFileSync(gene_ssml_mappings_json, "utf8"));

module.exports = { GeneSSMLMappings };