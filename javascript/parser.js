const components = require("./components");
const { JSDOM } = require("jsdom");

function parse(elem, depthLimit = 128, stack = []) {
    let stackSizeBefore = stack.length;

    if (elem.tagName.toLowerCase() == "component") {
        elem = dereferenceComponent(elem, depthLimit, stack);
    } else {
        stack.push(elem.tagName.toLowerCase());
        assertStackSizeLimitNotExceeded(stack, depthLimit);

        elem = elem.cloneNode(true);
    }

    Array.from(elem.children).forEach(child => {
        child.replaceWith(parse(child, depthLimit, stack));
    });

    stack.splice(stackSizeBefore, stack.length - stackSizeBefore);
    return elem;
}

function dereferenceComponent(elem, depthLimit, stack) {
    if (!elem.hasAttribute("ref")) {
        throw new Error(`Component tag missing ref attribute: ${elem.outerHTML}`);
    }

    let componentName = elem.getAttribute("ref").toLowerCase();
    let component = components[componentName];
    let replacerDefaults = component.config.default_values || {};

    if (!component) {
        throw new Error(`Component ${componentName} does not exist!`);
    }

    stack.push(`COMP:${componentName}`);
    assertStackSizeLimitNotExceeded(stack, depthLimit);

    let attributes = elem.attributes;

    newHTML = component.html
        // Insert childs from the component-tag
        .replace(/\$childs/gi, elem.innerHTML)
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
    elem = new JSDOM(newHTML).window.document.body.firstChild;

    // Pass down non-argument attributes from the component-tag
    for (let attr of attributes) {
        // Filter out argument attributes
        if (attr.name[0] == "@") continue;

        if (attr.name.toLowerCase() == "ref") {
            // Add the component's name as a class: class="whatever... __component_name__"
            elem.classList.add(`__${attr.value}__`);
        } else {
            elem.setAttribute(attr.name, attr.value);
        }
    }

    // If the resulting element is a component, dereference it as well
    if (elem.tagName.toLowerCase() == "component") {
        elem = dereferenceComponent(elem, depthLimit, stack);
    }

    return elem;
}

function assertStackSizeLimitNotExceeded(stack, sizeLimit) {
    if (stack.length > sizeLimit) {
        let stackStr = (stack.length > 20 ? "...\n\t" : "") + stack.slice(stack.length - 20, stack.length).join("\n\t");
        throw new Error(`Depth limit exceeded!\n\t${stackStr}`);
    }
}

module.exports = parse;