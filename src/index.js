import { cssPath, domParser } from '@cocreate/utils';

String.prototype.customSplice = function (index, absIndex, string) {
    return this.slice(0, index) + string + this.slice(index + Math.abs(absIndex));
};

export function getSelection(element) {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        return {
            start: element.selectionStart,
            end: element.selectionEnd
        };

    } else {
        let Document = element.ownerDocument;
        let selection = Document.getSelection();
        if (!selection.rangeCount)
            return { start: 0, end: 0 };

        let range = selection.getRangeAt(0);

        let contenteditable = range.startContainer.parentElement.closest('[contenteditable][array][object][key]');
        if (contenteditable) {
            element = contenteditable;
        }

        let domTextEditor = element;
        if (!domTextEditor.htmlString) {
            domTextEditor = domTextEditor.closest('[contenteditable]');
        }

        let start = getNodePosition(range.startContainer, domTextEditor, range.startOffset)
        let end = start
        if (range.startContainer !== range.endContainer) {
            end = getNodePosition(range.endContainer, domTextEditor, range.endOffset)
        } else if (range.endOffset !== range.startOffset)
            end = start + (range.endOffset - range.startOffset)

        let startContainer = range.startContainer;
        if (startContainer.nodeType == 3)
            startContainer = range.startContainer.parentElement;

        let endContainer = range.endContainer;
        if (endContainer.nodeType == 3)
            endContainer = range.endContainer.parentElement;

        let textStart = 0, node = range.startContainer
        while (node) {
            textStart += node.textContent.length;
            node = node.previousSibling;
        }
        let textEnd = textStart + (range.endOffset - range.startOffset)

        let rangeObj = {
            element,
            domTextEditor,
            startOffset: range.startOffset,
            endOffset: range.endOffset,
            startContainer,
            endContainer,
            elementStart: start,
            elementEnd: end,
            nodeStartContainer: range.startContainer,
            nodeEndContainer: range.endContainer,
            textStart,
            textEnd
        };

        return { element: contenteditable, value: selection.toString(), start, end, range: rangeObj };
    }

}


function getNodePosition(container, domTextEditor, position) {
    let string = domTextEditor.htmlString
    let node = container.previousSibling
    while (node && node.nodeType === 3) {
        position += node.textContent.length;
        node = node.previousSibling;
    }

    let nodePosition
    if (node && node.nodeType === 1) {
        nodePosition = getStringPosition({ string, target: node, position: 'afterend' });
        position += nodePosition.end
    } else if (container.parentElement !== domTextEditor && container !== domTextEditor) {
        let parentElement = container.parentElement
        nodePosition = getStringPosition({ string, target: parentElement, position: 'afterbegin' });
        position += nodePosition.start
    }

    return position
}

export function processSelection(element, value = "", prev_start, prev_end, start, end, range) {
    let prevStart = prev_start;
    let prevEnd = prev_end;
    if (prev_start >= start) {
        if (value == "") {
            prev_start -= end - start;
            prev_end -= end - start;
            prev_start = prev_start < start ? start : prev_start;
        } else {
            prev_start += value.length;
            prev_end += value.length;
        }
    } {
        if (value == "" && prev_end >= start) {
            prev_end = (prev_end >= end) ? prev_end - (end - start) : start;
        }
    }
    if (range) {
        if (prevStart > prev_start) {
            let length = prevStart - prev_start;
            if (Math.sign(length) === 1 && range.startOffset >= length)
                range.startOffset -= length;
        } else if (prevStart < prev_start) {
            let length = prev_start - prevStart;
            if (Math.sign(length) === 1)
                if (range.startOffset == 0 || range.startOffset >= length)
                    range.startOffset += length;
        }
        if (prevEnd > prev_end) {
            let length = prevEnd - prev_end;
            if (Math.sign(length) === 1 && range.endOffset >= length)
                range.endOffset -= length;
        } else if (prevEnd < prev_end) {
            let length = prev_end - prevEnd;
            if (Math.sign(length) === 1)
                if (range.endOffset == 0 || range.endOffset >= length)
                    range.endOffset += length;
        }
    }

    setSelection(element, prev_start, prev_end, range);
    return { element, value, start, end, prev_start, prev_end };
}

export function setSelection(element, start, end, range) {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        element.selectionStart = start;
        element.selectionEnd = end;
    } else {
        if (!range) return;
        let Document = element.ownerDocument;

        let startContainer, endContainer
        // if (range.startContainer.htmlString)
        startContainer = getContainer(range.startContainer, range.textStart - range.startOffset);
        // else
        //     startContainer = getContainer(range.startContainer, range.startOffset);

        // if (range.endContainer.htmlString)
        endContainer = getContainer(range.endContainer, range.textEnd - range.endOffset);
        // else
        //     endContainer = getContainer(range.endContainer, range.endOffset);

        // let startContainer = getContainer(range.startContainer, range.elementStart);
        // let endContainer = getContainer(range.endContainer, range.elementEnd);
        // let startContainer = getContainer(range.startContainer, range.startOffset);
        // let endContainer = getContainer(range.endContainer, range.endOffset);

        if (!startContainer || !endContainer)
            return;

        let selection = Document.getSelection();
        selection.removeAllRanges();

        const newRange = Document.createRange();

        newRange.setStart(startContainer, range.startOffset);
        newRange.setEnd(endContainer, range.endOffset);

        selection.addRange(newRange);
    }
}

function getContainer(element, offset) {
    let nodeLengths = 0;
    let nodes = element.childNodes
    for (let i = 0; i < nodes.length; i++) {
        nodeLengths += nodes[i].textContent.length
        if (nodeLengths >= offset)
            return nodes[i];
    }
}

export function hasSelection(el) {
    let { start, end } = getSelection(el);
    if (start != end) {
        return true;
    }
}

export function getElementPosition(str, start, end) {
    let response = {};
    let startString = str.substring(0, start);
    let endString = str.substring(start);
    let angleStart = startString.lastIndexOf("<");
    let angleEnd = startString.lastIndexOf(">");
    let endStringAngleEnd = endString.indexOf(">");
    let element, path, position, nodeStart, nodeEnd, startNode, type;
    if (angleEnd > angleStart) {
        let length = 0;
        if (start != end)
            length = end - start;
        let string = str.customSplice(start, length, '<findelement></findelement>');
        let newDom = domParser(string);
        let findEl = newDom.querySelector('findelement');
        if (findEl) {
            let insert = getInsertPosition(findEl);
            element = insert.target;
            position = insert.position;
            type = 'insertAdjacent';
            if (!position)
                type = 'textNode';
            if (position == 'beforeend' && findEl.previousSibling && findEl.previousSibling.nodeType == 3)
                type = 'textNode';
            if (position == 'afterbegin')
                nodeStart = start - angleEnd - 1;
            if (type == 'textNode') {
                if (element.tagName === 'DOM-PARSER') {
                    element = null
                    nodeStart = start
                    nodeEnd = end
                } else
                    nodeStart = start - angleEnd - 1;
            }

            findEl.remove();
        }
    } else if (angleStart == -1) {
        type = 'textNode';
    } else {
        let node = str.slice(angleStart, startString.length + endStringAngleEnd + 1);
        if (node.startsWith("</")) {
            startNode = node.slice(0, 1) + node.slice(2);
            startNode = startNode.substring(0, startNode.length - 1);
            nodeStart = startString.lastIndexOf(startNode);
            let endString1 = str.substring(nodeStart);
            let end = endString1.indexOf(">");
            nodeEnd = nodeStart + end + 1;
            type = 'isEndTag';
        } else {
            nodeEnd = startString.length + endStringAngleEnd + 1;
            startNode = node;
            nodeStart = angleStart;
            type = 'isStartTag';
        }

        if (nodeEnd > 0) {
            let string = str.customSplice(nodeEnd - 1, 0, ' findelement');
            let newDom = domParser(string);
            element = newDom.querySelector('[findelement]');
            if (!element && newDom.tagName == 'HTML')
                element = newDom;
            else if (type == "isEndTag")
                element = element.parentElement;
            element.removeAttribute('findelement');
        } else {
            let string = str.customSplice(angleStart, 0, '<findelement></findelement>');
            let newDom = domParser(string);
            element = newDom.querySelector('findelement');
            if (element) {
                let insert = getInsertPosition(element);
                element = insert.target.parentElement;
                position = insert.position;
                if (position == 'afterend')
                    element = element.parentElement;
                type = 'innerHTML';
            }
            if (!element) {
                console.log('Could not find element');
            }
        }
    }

    response.element = element;
    if (element)
        response.path = cssPath(element);
    response.position = position;
    response.start = nodeStart;
    response.end = nodeEnd;
    response.type = type;

    return response;
}

function getInsertPosition(element) {
    let target, position;
    let previousSibling = element.previousSibling;
    let nextSibling = element.nextSibling;
    if (previousSibling || nextSibling) {
        if (!previousSibling) {
            target = element.parentElement;
            position = 'afterbegin';
        } else if (!nextSibling) {
            target = element.parentElement;
            position = 'beforeend';
        } else if (previousSibling && previousSibling.nodeType == 1) {
            target = previousSibling;
            position = 'afterend';
        } else if (nextSibling && nextSibling.nodeType == 1) {
            target = element.parentElement;
            position = 'afterbegin';
        } else {
            target = element.parentElement;
        }
    } else {
        target = element.parentElement;
        position = 'afterbegin';
    }
    return { target, position };
}

export function getStringPosition({ string, target, position, attribute, property, value, remove }) {
    try {
        let element;
        let selector = cssPath(target, '[contenteditable]');
        let dom = domParser(string);
        if (!selector.includes('[eid=') && dom.tagName == "DOM-PARSER") {
            let containerEl = document.createElement('div');
            containerEl.appendChild(dom)
            selector = `dom-parser > ${selector}`
            element = containerEl.querySelector(selector);
        }
        else
            element = dom.querySelector(selector);
        if (!element) {
            // console.log('element could not be found using selector:', selector);
            return;
        }
        let start = 0, end = 0;

        if (position) {
            if (position == 'beforebegin')
                start = getElFromString(dom, string, element, position, true);
            else
                start = getElFromString(dom, string, element, position);
            end = start;
        } else if (attribute) {
            if (!element.hasAttribute(attribute)) {
                start = getElFromString(dom, string, element, 'afterbegin', true) - 1;
                end = start;
            } else {
                start = getElFromString(dom, string, element, 'beforebegin');
                let elString = string.substring(start);
                let attrValue = element.getAttribute(attribute);
                let attrStart = elString.indexOf(` ${attribute}=`);
                start = start + attrStart;
                if (attribute == 'style') {
                    if (remove)
                        element.style.removeProperty(property);
                    else
                        element.style[property] = value;
                    value = element.getAttribute(attribute);
                } else if (attribute == 'class') {
                    let [prop, val] = value.split(':');
                    if (prop && val) {
                        if (attrValue.includes(`${prop}:`)) {
                            let propStart = attrValue.indexOf(`${prop}:`);
                            let propString = attrValue.substring(propStart);
                            let propEnd = propString.indexOf(" ");
                            if (propEnd > 0)
                                propString = propString.slice(0, propEnd);
                            element.classList.remove(propString);
                        }
                    }
                    if (!remove)
                        element.classList.add(value);
                    value = element.getAttribute(attribute);
                } else {
                    element.setAttribute(attribute, value);
                    value = element.getAttribute(attribute);
                }
                end = start + attribute.length + attrValue.length + 4;
            }
        } else if (value) {
            start = getElFromString(dom, string, element, 'afterbegin');
            let length = element.innerHTML.length;
            end = start + length;
        } else {
            start = getElFromString(dom, string, element, 'beforebegin');
            end = getElFromString(dom, string, element, 'afterend', true);
        }

        return { start, end, newValue: value };
    }
    catch (e) {
        console.log(e);
    }
}

function getElFromString(dom, string, element, position, isAttribute) {
    let findEl = document.createElement('findelement');
    let start, angle, documentTypeAngles;
    if (position == 'afterbegin') {
        element.insertAdjacentElement('afterbegin', findEl);
        angle = '>';
    } else if (position == 'afterend') {
        element.insertAdjacentElement('afterend', findEl);
        angle = '>';
    } else if (position == 'beforebegin') {
        element.insertAdjacentElement('afterbegin', findEl);
        angle = '<';
    } else if (position == 'beforeend') {
        element.insertAdjacentElement('afterend', findEl);
        angle = '<';
    }

    if (dom.tagName == 'HTML')
        start = dom.outerHTML.indexOf("<findelement></findelement>");
    else
        start = dom.innerHTML.indexOf("<findelement></findelement>");

    if (start == -1) {
        position = 'singleton';
        element.insertAdjacentElement('afterend', findEl);
        if (dom.tagName == 'HTML')
            start = dom.outerHTML.indexOf("<findelement></findelement>");
        else
            start = dom.innerHTML.indexOf("<findelement></findelement>");
    }

    findEl.remove();

    let domString = dom.innerHTML.substring(0, start);
    // let domString = dom.outerHTML.substring(0, start);

    if (dom.tagName == "HTML") {
        domString = dom.outerHTML.substring(0, start);
        let htmlIndex = string.indexOf('<html');
        let documentType = string.substring(0, htmlIndex);
        documentTypeAngles = documentType.split(angle).length - 1;
    }
    let angles = domString.split(angle);
    let angleLength = angles.length - 1;
    // if (position == 'afterend')
    //     angleLength += 1;
    if (documentTypeAngles)
        angleLength += documentTypeAngles;
    let elStart = getPosition(string, angle, angleLength);

    if (position == 'afterbegin')
        elStart += 1;
    else if (position == 'beforeend')
        elStart += 1;
    else if (position == 'afterend')
        elStart += 1;
    else if (position == 'singleton') {
        let newString = string.substring(0, elStart);
        if (newString.lastIndexOf('/') == newString.length - 1 && isAttribute)
            elStart;
        else
            elStart += 1;
    }
    return elStart;
}

function getPosition(string, subString, index) {
    let angleArray = string.split(subString, index);
    let startstring = angleArray.join(subString);
    let start = startstring.length;
    return start;
    // return string.split(subString, index).join(subString).length;
}

export default { getSelection, setSelection, hasSelection, processSelection, getStringPosition, getElementPosition };