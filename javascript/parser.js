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
    let replacerDefaults = component.config.default_values || {};

    if (!component) {
        throw new Error(`Component ${componentName} does not exist!`);
    }

    stack.push(`COMP:${componentName}`);
    assertStackSizeLimitNotExceeded(stack, depthLimit);

    let attributes = node.attributes;

    newHTML = component.html
        // Insert childs
        .replace(/\$childs/gi, node.innerHTML)
        // Apply replacer brackets
        .replace(/\{\{([^\p{C}\p{Z}"'>/={}]+)\}\}/gu, (_, replacer) => {
            let attribute = attributes[`@${replacer}`] ||
                attributes[replacer];

            if (attribute && attribute.value) {
                return attribute.value;
            } else if (replacerDefaults[replacer] != null) {
                if (typeof replacerDefaults[replacer] != "string")
                    return JSON.stringify(replacerDefaults[replacer]);

                return replacerDefaults[replacer];
            } else {
                return "";
            }
        });
    node = new JSDOM(newHTML).window.document.body.firstChild;

    // Apply non-argument attributes from component-tag
    for (let attr of attributes) {
        if (attr.name[0] == "@") continue;

        if (attr.name.toLowerCase() == "ref") {
            node.classList.add(`__${attr.value}__`);
        } else {
            node.setAttribute(attr.name, attr.value);
        }
    }

    // If the resulting element is a component in itself, parse it as well
    if (node.tagName.toLowerCase() == "component") {
        node = dereferenceComponent(node, depthLimit, stack);
    }

    return node;
}

function assertStackSizeLimitNotExceeded(stack, sizeLimit) {
    if (stack.length > sizeLimit) {
        let stackStr = (stack.length > 20 ? "...\n\t" : "") + stack.slice(stack.length - 20, stack.length).join("\n\t");
        throw new Error(`Depth limit exceeded!\n\t${stackStr}`);
    }
}

module.exports = parse;