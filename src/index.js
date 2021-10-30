/*globals Node*/
import {cssPath, domParser} from '@cocreate/utils';

String.prototype.customSplice = function(index, absIndex, string) {
    return this.slice(0, index) + string + this.slice(index + Math.abs(absIndex));
};

export function getSelection(element) {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        return {
            start: element.selectionStart,
            end: element.selectionEnd
        };
    } 
    else {
		let Document = element.ownerDocument;
		let selection = Document.getSelection();
		if (!selection.rangeCount) return { start: 0, end: 0 };

		let range = selection.getRangeAt(0);
        let start = range.startOffset;
        let end = range.endOffset;
        let previousSibling = range.startContainer.previousSibling
		if(previousSibling && previousSibling.nodeType == 3) {
			let length = 0;
			do {
				length += previousSibling.length;
				previousSibling = previousSibling.previousSibling;
			} while (previousSibling);
			start += length
			end += length
		}
		if(range.startContainer != range.endContainer) {
    // 		toDo: replace common ancestor value
		}
		let domTextEditor = element;
		if (!domTextEditor.htmlString){
			domTextEditor = element.closest('[contenteditable]');
		}
		let elementStart = start, elementEnd = end;
		if (domTextEditor){
            let nodePos = getStringPosition({ string: domTextEditor.htmlString, target: range.startContainer.parentElement, position: 'afterbegin'});
            if (nodePos){
                elementStart = nodePos.start
                elementEnd = nodePos.end
                start = start + nodePos.start;
                end = end + nodePos.end;
            }
		}
        let rangeObj = {
        	startOffset: range.startOffset, 
        	endOffset: range.endOffset, 
        	startContainer: range.startContainer.parentElement, 
        	endContainer: range.endContainer.parentElement,
        	elementStart,
        	elementEnd
        };
		return { start, end, range: rangeObj};
    }
    
}

export function processSelection(element, value = "", prev_start, prev_end, start, end, range) {
	if (prev_start >= start) {
		if (value == "") {
			prev_start -= end - start;
			prev_end -= end - start;
			prev_start = prev_start < start ? start : prev_start;
		}
		else {
			prev_start += value.length;
			prev_end += value.length;
		}
	} {
		if (value == "" && prev_end >= start) {
			prev_end = (prev_end >= end) ? prev_end - (end - start) : start;
		}
	}
	setSelection(element, prev_start, prev_end, range);
    return {element, value, start, end, prev_start, prev_end};
}

export function setSelection(element, start, end, range) {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        element.selectionStart = start;
        element.selectionEnd = end;
    } 
    else {
        if (!range) return;
    	let Document = element.ownerDocument;
    	let startOffset = start - range.elementStart;
    	let endOffset = end - range.elementEnd;
		let startContainer = getContainer(range.startContainer, startOffset);
		let endContainer = getContainer(range.endContainer, endOffset);
    	
    	let selection = Document.getSelection();
    	selection.removeAllRanges();
		const nrange = Document.createRange();
		nrange.setStart(startContainer, startOffset);
		nrange.setEnd(endContainer, endOffset);
	    selection.addRange(nrange);
	}
}

function getContainer(element, offset){
	let nodeLengths = 0;
	for (let node of element.childNodes){
		if (node.nodeType == 3) {
			let length = node.length + nodeLengths;
			if (length >= offset)
				return node;
			else
				nodeLengths += length;
		}
	}
}

export function hasSelection(el) {
	let { start, end } = getSelection(el);
	if(start != end) {
		return true;
	}
}

export function getElementPosition(str, start, end) {
    let response = {};
    let startString = str.substr(0, start);
    let endString = str.substr(start);
    let angleStart = startString.lastIndexOf("<");
    let angleEnd = startString.lastIndexOf(">");
    let endStringAngleEnd = endString.indexOf(">");
    let element, position, nodeStart, nodeEnd, startNode, type;
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
            if(!position)
                type = 'textNode';
            if (type == 'textNode' || type == 'afterbegin');
                nodeStart = start - angleEnd - 1;
            findEl.remove();
        }
    }
    else {
        let node = str.slice(angleStart, startString.length + endStringAngleEnd + 1);
        if (node.startsWith("</")) {
            startNode = node.slice(0, 1) + node.slice(2);
            startNode = startNode.substr(0, startNode.length - 1);
            nodeStart = startString.lastIndexOf(startNode);
            let endString1 = str.substr(nodeStart);
            let end = endString1.indexOf(">");
            nodeEnd = nodeStart + end + 1;
            type = 'isEndTag';
        }
        else {
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
        }
        else {
            let string = str.customSplice(angleStart, 0, '<findelement></findelement>');
            let newDom = domParser(string);
            element = newDom.querySelector('findelement');
            if (element) {
                let insert = getInsertPosition(element);
                element = insert.target.parentElement;
                position = insert.position;
                if(position == 'afterend')
                    element = element.parentElement;
                type = 'innerHTML';
            }
            if (!element) {
                console.log('Could not find element');
            }
        }
    }
    
    if (element) {
        response.element = element;
        response.path = cssPath(element);
        response.position = position;
        response.start = nodeStart;
        response.end = nodeEnd;
        response.type = type;
    }

    return response;
}

function getInsertPosition(element){
    let target, position;
    let previousSibling = element.previousSibling;
    let nextSibling = element.nextSibling;
    if (previousSibling || nextSibling) {
        if (!previousSibling) {
            target = element.parentElement;
            position = 'afterbegin';
        }
        else if (!nextSibling) {
            target = element.parentElement;
            position = 'beforend';
        }
        else if (previousSibling && previousSibling.nodeType == 1) {
            target = previousSibling;
            position = 'afterend';
        }
        else if (nextSibling && nextSibling.nodeType == 1) {
            target = element.parentElement;
            position = 'afterbegin';
        }
        else {
            target = element.parentElement;
        }
    }
    else {
        target = element.parentElement;
        position = 'afterbegin';
    }
    return {target, position};
}

export function getStringPosition({string, target, position, attribute, property, value}) {
    try {
        let selector = cssPath(target, '[contenteditable]');
        let dom = domParser(string);
        let element = dom.querySelector(selector);
        if (!element){
            console.log('element could not be found using selector:', selector);
            return;
        }
        let start = 0, end = 0;
        
        if (position) {
            if (position == 'beforebegin')
                start = getElFromString(dom, string, element, position, true);
            else
            start = getElFromString(dom, string, element, position);
            end = start;
        }
        else if (attribute) {
            if (!element.hasAttribute(attribute)){
            	start = getElFromString(dom, string, element, 'afterbegin') - 1;
                end = start;
            }
            else {
            	start = getElFromString(dom, string, element, 'beforebegin');
                let elString = string.substr(start);
                let attrValue = element.getAttribute(attribute);
                let attrStart = elString.indexOf(` ${attribute}=`);
                start = start + attrStart;
                if (attribute == 'style') {
                    element.style[property] = value;
                    value = element.getAttribute(attribute);
                }
                else if (attribute == 'class') {
                    let [prop, val] = value.split(':');
                    if (prop && val){
                        if (attrValue.includes(`${prop}:`)){
                            let propStart = attrValue.indexOf(`${prop}:`);
                            let propString = attrValue.substr(propStart);
                            let propEnd = propString.indexOf(" ");
                            if (propEnd > 0)
                                propString = propString.slice(0, propEnd);
                            element.classList.remove(propString);
                        }
                    }
                    element.classList.add(value);
                    value = element.getAttribute(attribute); 
                }
                else {
                    element.setAttribute(attribute, value)
                    value = element.getAttribute(attribute); 
                }
                end = start + attribute.length + attrValue.length + 4;
            }
        }
        else if (value) {
            start = getElFromString(dom, string, element, 'afterbegin');
            let length = element.innerHTML.length;
            end = start + length;
        }
        else {
            start = getElFromString(dom, string, element, 'beforebegin');
            end = getElFromString(dom, string, element, 'afterend', true);
        }

        return {start, end, newValue: value};
    }
    catch (e){
        console.log(e);
    }
}

function getElFromString(dom, string, element, position, wholeEl) {
    let findEl = document.createElement('findelement');
    let start, angle, documentTypeAngles;
    if (position == 'afterbegin') {
        element.insertAdjacentElement('afterbegin', findEl);
    	angle = '>';
    }
    else if (position == 'afterend') {
        element.insertAdjacentElement('afterend', findEl);
    	angle = '>';
    }
    else if (position == 'beforebegin'){
        element.insertAdjacentElement('afterbegin', findEl);
    	angle = '<';
    }	
    else if (position == 'beforeend'){
        element.insertAdjacentElement('afterend', findEl);
    	angle = '<';
    }	
    if (dom.tagName == 'HTML')
    	start = dom.outerHTML.indexOf("<findelement></findelement>");
    else
    	start = dom.innerHTML.indexOf("<findelement></findelement>");
    
    findEl.remove();
    
    let domString = dom.outerHTML.substring(0, start);

    if (dom.tagName == "HTML") {
    	let htmlIndex = string.indexOf('<html');
    	let documentType = string.substring(0, htmlIndex);
    	documentTypeAngles = documentType.split(angle).length -1;
    }
    let angles = domString.split(angle);
    let angleLength = angles.length - 1;
    // if (position == 'afterend' && angles[angles.length - 1] === '') 
    //     angleLength -= 1;
    // else if (position == 'afterend' && angles[angles.length - 1] !== '')
    //     angleLength += 1;
    // if (wholeEl && position == 'afterend') {
    //     angleLength += 1;
    // }
    // if (wholeEl && position == 'beforebegin') {
    //     angleLength += 1;
    // }
    if (documentTypeAngles)
    	angleLength += documentTypeAngles;
    let elStart = getPosition(string, angle, angleLength);
   
    // if (position == 'beforebegin')
        // elStart += 1
    if (position == 'afterbegin') 
        elStart += 1
    else if (position == 'beforeend')
        elStart += 1
    else if (position == 'afterend') 
        elStart += 1
   	
    return elStart;
}

function getPosition(string, subString, index) {
  return string.split(subString, index).join(subString).length;
}

export default {getSelection, setSelection, hasSelection, processSelection, getStringPosition, getElementPosition};