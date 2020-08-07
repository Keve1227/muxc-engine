const components = require("./components");
const { JSDOM } = require("jsdom");

function parse(node) {
    if (node.tagName.toLowerCase() == "component") {
        if (!node.hasAttribute("ref")) {
            throw new Error(`Component tag missing ref attribute: ${node.outerHTML}`);
        }

        let componentName = node.getAttribute("ref").toLowerCase();
        let component = components[componentName];

        if (!component) {
            throw new Error(`Component ${componentName} does not exist!`);
        }

        let groupedAttributes = groupAttributes(node);

        let newHTML = component.html;
        newHTML = newHTML.split("$childs").join(node.innerHTML);
        for (let argName in groupedAttributes.arguments) {
            newHTML = newHTML.split(`{{${argName}}}`).join(groupedAttributes.arguments[argName]);
        }
        node = new JSDOM(newHTML).window.document.body.firstChild;

        // Apply non-arg attributes
        for (let argName in groupedAttributes.standard) {
            node.setAttribute(argName, groupedAttributes.standard[argName]);
        }
    } else {
        node = node.cloneNode(true);
    }

    Array.from(node.children).forEach(child => {
        child.replaceWith(parse(child));
    });

    return node;
}

// Group element attributes into normal attributes and argument attributes
function groupAttributes(element) {
    let attributes = {
        standard: {},
        arguments: {}
    };

    Array.from(element.attributes).forEach(attr => {

        if (attr.name.startsWith("@")) {

            let argName = attr.name.slice(1);
            attributes.arguments[argName] = attr.value;

        } else {

            if (attr.name == "ref")
                return;

            attributes.standard[attr.name] = attr.value;
        }
    });

    return attributes;
}

module.exports = parse;