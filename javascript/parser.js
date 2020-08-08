const components = require("./components");
const { JSDOM } = require("jsdom");

function parse(node, depthLimit = 128, stack = []) {
    let stackSizeBefore = stack.length;

    if (node.tagName.toLowerCase() == "component") {
        node = dereferenceComponent(node, depthLimit, stack);
    } else {
        stack.push(node.tagName.toLowerCase());
        assertStackSizeLimitNotExceeded(stack, depthLimit);

        node = node.cloneNode(true);
    }

    Array.from(node.children).forEach(child => {
        child.replaceWith(parse(child, depthLimit, stack));
    });

    stack.splice(stackSizeBefore, stack.length - stackSizeBefore);
    return node;
}

function dereferenceComponent(node, depthLimit, stack) {
    if (!node.hasAttribute("ref")) {
        throw new Error(`Component tag missing ref attribute: ${node.outerHTML}`);
    }

    let componentName = node.getAttribute("ref").toLowerCase();
    let component = components[componentName];

    if (!component) {
        throw new Error(`Component ${componentName} does not exist!`);
    }

    stack.push(`COMP:${componentName}`);
    assertStackSizeLimitNotExceeded(stack, depthLimit);

    let groupedAttributes = groupAttributes(node);

    let newHTML = component.html;
    let args = groupedAttributes.arguments;

    // Check required parameters/arguments
    let required = component.config.required_params;
    if (Array.isArray(required) && !required.every(val => args[val]))
        throw new Error(`Component ${componentName} requires arguments: ${required}`);

    // Apply argument values
    newHTML = newHTML.split("$childs").join(node.innerHTML);
    for (let argName in args) {
        newHTML = newHTML.split(`{{${argName}}}`).join(args[argName]);
    }

    node = new JSDOM(newHTML).window.document.body.firstChild;

    // Apply non-arg attributes
    for (let argName in groupedAttributes.standard) {
        node.setAttribute(argName, groupedAttributes.standard[argName]);
    }

    // If the resulting element is a component in itself, parse it as well
    if (node.tagName.toLowerCase() == "component") {
        node = dereferenceComponent(node, depthLimit, stack);
    }

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

function assertStackSizeLimitNotExceeded(stack, sizeLimit) {
    if (stack.length > sizeLimit) {
        let stackStr = (stack.length > 20 ? "...\n\t" : "") + stack.slice(stack.length - 20, stack.length).join("\n\t");
        throw new Error(`Depth limit exceeded!\n\t${stackStr}`);
    }
}

module.exports = parse;