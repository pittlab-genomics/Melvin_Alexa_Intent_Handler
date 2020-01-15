/* 
 * Some genes have special pronunciations. This dictionary contains SSML codes 
 * for those gene names that will help Alexa to properly pronounce them. 
*/
const GeneSSMLMappings = {
    "BRAF": "<phoneme alphabet=\"x-sampa\" ph='bi\"\\r{f'>braf</phoneme>",
    "NRAS": "<phoneme alphabet=\"x-sampa\" ph='En\"\\r{s'>nras</phoneme>",
    "KRAS": "<phoneme alphabet=\"x-sampa\" ph='key\"\\r{s'>kras</phoneme>",
    "PTEN": "<phoneme alphabet=\"x-sampa\" ph='pi\"\\tEn'>pten</phoneme>",
    "ABL1": "<phoneme alphabet=\"x-sampa\" ph='eb@l wUn'>ABL1</phoneme>",
    "ABL2": "<phoneme alphabet=\"x-sampa\" ph='eb@l tu'>ABL2</phoneme>",
    "AFF1": "<phoneme alphabet=\"x-sampa\" ph='{f wUn'>AFF1</phoneme>",
    "AFF3": "<phoneme alphabet=\"x-sampa\" ph='{f Tri'>AFF3</phoneme>",
    "AFF4": "<phoneme alphabet=\"x-sampa\" ph='{f fOr'>AFF4</phoneme>",
    "AKAP9": "<phoneme alphabet=\"x-sampa\" ph='eik{p\" naIn'>AKAP9</phoneme>",
    "ALK": "<phoneme alphabet=\"x-sampa\" ph='alk'>ALK</phoneme>",
    "AMER1": "<phoneme alphabet=\"x-sampa\" ph='eh\\m@r wUn'>AMER1</phoneme>",
    "CTNNB1": "Catenin Beta 1",
    "PIK3CA": "Pik 3 CA"
};

module.exports = {
    GeneSSMLMappings
}