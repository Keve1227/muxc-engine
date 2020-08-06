const components = require("./javascript/components");
const { JSDOM } = require("jsdom");

let HTML = parse(components["home"].element);
console.log(HTML.outerHTML);
require("fs").writeFileSync("./final.html", HTML.outerHTML);

function parse(node) {
    
    if (node.tagName.toLowerCase() == "component") {
        
        if (!node.hasAttribute("ref"))
            throw new Error(`Component tag missing ref attribute: ${node.outerHTML}`);
            
        let compName = node.getAttribute("ref").toLowerCase();
        let component = components[compName];
            
        if (!component)
            throw new Error(`Component ${compName} does not exist!`);
        
        let groupedAttributes = groupAttributes(node);
        
        let componentElement = component.element;

        if (groupedAttributes.arguments) {
            let componentHTML = component.element.outerHTML;
            Object.keys(groupedAttributes.arguments).forEach(argName => {
                componentHTML = componentHTML.split(`{{${argName}}}`).join(groupedAttributes.arguments[argName]);
            });
            componentElement = new JSDOM(componentHTML).window.document.body.firstChild;
            node.replaceWith(componentElement);
            
            parse(componentElement);
        }
    } 
    else {
        Array.from(node.children).forEach(child => {
            parse(child);
        });
        return node;
    }   
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