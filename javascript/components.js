const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function loadComponents() {
    let componentsDir = "./structure/components";
    let componentNames = fs.readdirSync(componentsDir);
    let components = {};

    componentNames.forEach(name => {
        let componentDir = path.join(componentsDir, name);

        let config = null;
        let configPath = path.join(componentDir, "config.json");
        if (fs.existsSync(configPath))
            config = JSON.parse(fs.readFileSync(path.join(componentDir, "config.json")));

        let componentHTML = fs.readFileSync(path.join(componentDir, "index.html")).toString();

        components[name] = {
            config: config,
            html: componentHTML,
            get element() {
                return new JSDOM(componentHTML).window.document.firstElementChild;
            }
        };
    });

    return components;
}

module.exports = loadComponents();