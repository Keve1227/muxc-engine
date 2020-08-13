const { JSDOM } = require("jsdom");

function compile(rootComponentName, components, depthLimit = 128) {
    if (!components)
        throw new Error(`Invalid components argument!`);

    if (!components[rootComponentName])
        throw new Error(`Root component '${rootComponentName}' not found!`);

    let stack = [];

    let html = dereferenceNode(components[rootComponentName].element);
    return { html };

    function dereferenceNode(elem) {
        let stackSizeBefore = stack.length;

        if (elem.tagName.toLowerCase() == "component") {
            elem = dereferenceComponent(elem);
        } else {
            stack.push(elem.tagName.toLowerCase());
            assertDepthLimitNotExceeded();

            elem = elem.cloneNode(true);
        }

        Array.from(elem.children).forEach(child => {
            child.replaceWith(dereferenceNode(child));
        });

        stack.splice(stackSizeBefore, stack.length - stackSizeBefore);
        return elem;
    }

    function dereferenceComponent(elem) {
        if (!elem.hasAttribute("ref"))
            throw new Error(`Component tag missing ref attribute: ${elem.outerHTML}`);

        let componentName = elem.getAttribute("ref").toLowerCase();
        let component = components[componentName];
        let replacerDefaults = component.config.default_values || {};

        if (!component)
            throw new Error(`Component ${componentName} does not exist!`);

        stack.push(`COMP:${componentName}`);
        assertDepthLimitNotExceeded();

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
        if (elem.tagName.toLowerCase() == "component")
            elem = dereferenceComponent(elem);

        return elem;
    }

    function assertDepthLimitNotExceeded() {
        if (stack.length > depthLimit) {
            let stackStr = (stack.length > 20 ? "...\n\t" : "") + stack.slice(stack.length - 20, stack.length).join("\n\t");
            throw new Error(`Depth limit exceeded!\n\t${stackStr}`);
        }
    }
}

module.exports = compile;