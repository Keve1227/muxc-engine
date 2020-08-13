const parser = require("./javascript/parser");
const components = require("./javascript/components");

let { html: HTML } = parser("home", components.load());
console.log(HTML.outerHTML);
require("fs").writeFileSync("./final.html", HTML.outerHTML);