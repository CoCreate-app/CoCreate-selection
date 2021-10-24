/*globals Node*/

export function getSelection (element) {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        return {
            start: element.selectionStart,
            end: element.selectionEnd
        };
    } 
    else {
		let document = element.ownerDocument;
		let selection = document.getSelection();
		if (!selection.rangeCount) return { start: 0, end: 0 };

		let range = selection.getRangeAt(0);
        let start = range.startOffset;
        let end = range.endOffset;
		if(range.startContainer != range.endContainer) {
    // 		toDo: replace common ancestor value
		}
		let domTextEditor = element;
		if (!domTextEditor.htmlString){
			domTextEditor = element.closest('[contenteditable]');
		}
        let nodePos = getDomPosition({ string: domTextEditor.htmlString, target: range.startContainer.parentElement, position: 'afterbegin'});
        if (nodePos){
            start = start + nodePos.start;
            end = end + nodePos.end;
        }
		return { start, end, range };
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
    // 	if (document.activeElement !== element) return;
    	if (range.commonAncestorContainer) {
    	    let prevElement = range.commonAncestorContainer;
    	    if (prevElement.nodeName == '#text')
    	        prevElement = range.commonAncestorContainer.parentElement;
    	    if (prevElement !== element) return;
    	}
    	let document = element.ownerDocument;
    	var selection = document.getSelection();
    	var range = contenteditable._cloneRangeByPosition(element, start, end);
    	selection.removeAllRanges();
    	selection.addRange(range);
    }
}


export function hasSelection(el) {
	let { start, end } = getSelection(el);
	if(start != end) {
		return true;
	}
}

const contenteditable = {	
	_cloneRangeByPosition: function(element, start, end, range) {
		if (!range) {
			range = document.createRange();
			range.selectNode(element);
			range.setStart(element, 0);
			this.start = start;
			this.end = end;
		}

		if (element && (this.start > 0 || this.end > 0)) {
			if (element.nodeType === Node.TEXT_NODE) {

				if (element.textContent.length < this.start) this.start -= element.textContent.length;
				else if (this.start > 0) {
					range.setStart(element, this.start);
					this.start = 0;
				}

				if (element.textContent.length < this.end) this.end -= element.textContent.length;
				else if (this.end > 0) {
					range.setEnd(element, this.end);
					this.end = 0;
				}
			}
			else {
				for (var lp = 0; lp < element.childNodes.length; lp++) {
					range = this._cloneRangeByPosition(element.childNodes[lp], this.start, this.end, range);
					if (this.start === 0 && this.end === 0) break;
				}
			}
		}

		return range;
	},

};

String.prototype.customSplice = function(index, absIndex, string) {
    return this.slice(0, index) + string + this.slice(index + Math.abs(absIndex));
};

export function getStringPosition(str, start, end) {
    let response = {};
    let selection = [start];
    // if (start != end) {
    //     selection = [start, end];
    // }
    
    for (let pos of selection) {
        let startString = str.substr(0, pos);
        let endString = str.substr(pos);
        let angleStart = startString.lastIndexOf("<");
        let angleEnd = startString.lastIndexOf(">");
        let endStringAngleEnd = endString.indexOf(">");
        let element, position, nodeStart, nodeEnd, startNode, type;
        if (angleEnd > angleStart) {
            let string = str.customSplice(start, 0, '<findelement></findelement>');
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
            }
            findEl.remove();
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
                if (type == "isEndTag")
                    element = element.parentElement;
                if (!element && newDom.tagName == 'HTML')
                    element = newDom;
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

    }

    console.log(response);
    return response;
    // findPosFromDom({ str, selector: path, value: 'g' });
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
            position = 'beforebegin';
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

export function getDomPosition({string, target, position, attribute, property, value}) {
    try {
        let selector = cssPath(target, '[contenteditable]');
        let dom = domParser(string);
        let element = dom.querySelector(selector);
        let findEl = document.createElement('findelement');
        let start = 0, end = 0;
        
        if (position) {
            element.insertAdjacentElement(position, findEl);
            start = getElementPosition(dom, string, position);
        }
        else if (attribute) {
            if (!element.hasAttribute(attribute)){
                element.setAttribute('findelement', '');
		        if (dom.tagName == 'HTML')
                	start = dom.outerHTML.indexOf("findelement");
		        else
                	start = dom.innerHTML.indexOf("findelement");
            }
            else {
                let elString = element.outerHTML;
                let attrValue = element.getAttribute(attribute);
                let attrStart = elString.indexOf(` ${attribute}=`) + 1;
            	element.insertAdjacentElement('beforebegin', findEl);
            	start = getElementPosition(dom, string, 'beforebegin');
                start = start + attrStart;
                end = start + attrValue.length + 2;
                if (attribute == 'style') {
                    element.style[property] = value;
                    value = element.getAttribute(attribute);
                }
                else if (attribute == 'class') {
                    let {prop, val} = value.split(':');
                    if (prop && val){
                        if (attrValue.includes(`${prop}:`)){
                            let propStart = attrValue.indexOf(`${prop}:`);
                            let propString = attrValue.substr(propStart)
                            let propEnd = propString.indexOf(" ");
                            if (propEnd > 0)
                                propString = propString.slice(0, propEnd);
                            element.classList.remove(propString)
                        }
                    }
                    element.classList.add(value);
                    value = element.getAttribute(attribute); 
                }
            }
        }
        else if (value) {
            element.insertAdjacentElement('afterbegin', findEl);
            let length = element.innerHTML.length;
            start = getElementPosition(dom);
            end = start + length;
        }
        else {
            element.insertAdjacentElement('beforebegin', findEl);
            start = getElementPosition(dom);
        }

        end = start + end;
        console.log('findindom', start);
        return {start, end, value};
    }
    catch (e){
        console.log(e);
    }
}

function getElementPosition(dom, string, position) {
    let start, angle, documentTypeAngles;

    if (dom.tagName == 'HTML')
    	start = dom.outerHTML.indexOf("<findelement></findelement>");
    else
    	start = dom.innerHTML.indexOf("<findelement></findelement>");
    let domString = dom.outerHTML.substring(0, start);
    if (position == 'afterbegin' || position == 'afterend')
    	angle = '>'
    if (position == 'beforebegin' || position == 'beforeend')
    	angle = '<'
    	start += 1;

    if (dom.tagName == "HTML") {
    	let htmlIndex = string.indexOf('<html');
    	let documentType = string.substring(0, htmlIndex)
    	documentTypeAngles = documentType.split(angle).length -1;
    }
    let angles = domString.split(angle);;
    let angleLength = angles.length -1;
    if (documentTypeAngles)
    	angleLength += documentTypeAngles;
    let elStart = getPosition(string, angle, angleLength)
    elStart += 1;
    return elStart;
}


function getPosition(string, subString, index) {
  return string.split(subString, index).join(subString).length;
}

function cssPath(node, container = 'HTML') {
    let pathSplits = [];
    do {
        if (!node || !node.tagName) return false;
        let pathSplit = node.tagName.toLowerCase();
        if (node.id) pathSplit += "#" + node.id;

        if (node.classList.length) {
            node.classList.forEach((item) => {
                if (item.indexOf(":") === -1) pathSplit += "." + item;
            });
        }

        if (node.parentNode) {
            let index = Array.prototype.indexOf.call(
                node.parentNode.children,
                node
            );
            pathSplit += `:nth-child(${index + 1})`;
        }

        pathSplits.unshift(pathSplit);
        node = node.parentNode;
        if (node.tagName == "HTML" || node.nodeName == "#document" || node.hasAttribute('contenteditable'))
        	node = ''
    } while (node);
    return pathSplits.join(" > ");
}

export function domParser(str) {
    let mainTag = str.match(/\<(?<tag>[a-z0-9]+)(.*?)?\>/).groups.tag;
    if (!mainTag)
        throw new Error('find position: can not find the main tag');

    let doc;
    switch (mainTag) {
        case 'html':
            doc = new DOMParser().parseFromString(str, "text/html");
            return doc.documentElement;
        case 'body':
            doc = new DOMParser().parseFromString(str, "text/html");
            return doc.body;
        case 'head':
            doc = new DOMParser().parseFromString(str, "text/html");
            return doc.head;

        default:
            let con = document.createElement('div');
            con.innerHTML = str;
            return con;
    }
}


export default {getSelection, setSelection, hasSelection, processSelection, getDomPosition, getStringPosition, domParser};