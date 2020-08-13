const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const css = require("css");

function loadComponents() {
    let componentsDir = "./structure/components";
    let componentNames = fs.readdirSync(componentsDir);
    let components = {};

    componentNames.forEach(name => {
        let componentDir = path.join(componentsDir, name);

        let config = {};
        let configPath = path.join(componentDir, "config.json");
        if (fs.existsSync(configPath))
            config = JSON.parse(fs.readFileSync(configPath));

        let style;
        let stylePath = path.join(componentDir, "style.css");
        if (fs.existsSync(stylePath))
            style = css.parse(fs.readFileSync(stylePath, { encoding: "utf8" }));

        let componentHTML = fs.readFileSync(path.join(componentDir, "index.html")).toString();

        components[name] = {
            config: config,
            html: componentHTML,
            style,
            get element() {
                return new JSDOM(componentHTML).window.document.firstElementChild;
            }
        };
    });

    return components;
}

module.exports = loadComponents();