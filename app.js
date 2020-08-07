const parser = require("./javascript/parser");
const components = require("./javascript/components");

let HTML = parser(components["home"].element);
console.log(HTML.outerHTML);
require("fs").writeFileSync("./final.html", HTML.outerHTML);