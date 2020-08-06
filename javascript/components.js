const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function loadComponents() {
    let componentsDir = "./structure/components";
    let componentDirs = fs.readdirSync(componentsDir);
    let objToReturn = [];

    componentDirs.forEach(dir => {
        let componentDir = path.join(componentsDir, dir);

        let config = null;
        let configPath = path.join(componentDir, "config.json");
        if (fs.existsSync(configPath))
            config = JSON.parse(fs.readFileSync(path.join(componentDir, "config.json")));

        let componentHTML = fs.readFileSync(path.join(componentDir, "index.html")).toString();

        objToReturn[dir] = {
            config: config, 
            element: new JSDOM(componentHTML).window.document.body.firstChild
        };
    });

    return objToReturn;
}

module.exports = loadComponents();