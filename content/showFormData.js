'use strict';

// uses some functions from collectFormData.js
//import {collectFormData} from 'collectFormData.js';

browser.runtime.onMessage.addListener(receiveEvents);

function receiveEvents(fhcEvent) {
    if (fhcEvent.action) {
        console.log("Received action event " + fhcEvent.action);

        switch (fhcEvent.action) {
            case "showformfields":
                showformfields();
                break;

            // case "getformfields":
            //     getCurrentFields();
            //     break;
        }
    }
}


// function getCurrentFields() {
//     // TODO get the formfields for this (active) page and return in the form of a response event (array of fields)
//     let fields = [];
//
//     document.querySelectorAll("input,textarea").forEach( (node) => {
//         if (_isTextInputSubtype(node.type) && _isDisplayed(node)) {
//             let name = (node.name) ? node.name : ((node.id) ? node.id : "");
//             if (name) {
//                 fields.push({
//                     name: name,
//                     type: node.nodeName.toLowerCase()
//                 });
//             }
//         }
//     });
//
//     document.querySelectorAll("html,div,iframe,body").forEach( (node) => {
//         if ((_isContentEditable(node) && _isDisplayed(node)) || _isDesignModeOn(node)) {
//             let name = (node.name) ? node.name : ((node.id) ? node.id : "");
//             if (name) {
//                 fields.push({
//                     name: name,
//                     type: node.nodeName.toLowerCase()
//                 });
//             }
//         }
//     });
//
//     let gettingCurrent = browser.tabs.getCurrent();
//     gettingCurrent.then(
//         (tabInfo) => {
//             console.log('Sending getCurrentFields response message from tabID ' + tabInfo.id);
//             browser.runtime.sendMessage({
//                 eventType  : 6,
//                 targetTabId: tabInfo.id,
//                 fields     : fields
//             });
//         },
//         (error) => {
//             console.log(`Error getting current tab: ${error}`);
//         }
//     );
// }

function showformfields() {
    let ii = 0, id, div;
    document.querySelectorAll("input,textarea").forEach( (elem) => {
        //console.log("adding info for elem-id: " + elem.id);

        if (_isTextInputSubtype(elem.type) && _isDisplayed(elem)) {
            id = 'fhcFldInfo' + ++ii;

            // toggle info
            if (document.getElementById(id)) {
                // Remove info element
                document.body.removeChild(document.getElementById(id));
            } else {
                // Insert info element
                div = _createInfoElement(id, elem, true);
                // console.log("Adding div for " + elem.id + " of type " + elem.type + " div id " + id);
                document.body.appendChild(div);
            }
        }
    });

    document.querySelectorAll("html,div,iframe,body").forEach( (elem) => {
        if ((_isContentEditable(elem) && _isDisplayed(elem)) || _isDesignModeOn(elem)) {
            id = 'fhcFldInfo' + ++ii;
            //console.log("elem-id: " + elem.id + " of type ?");

            // toggle info
            if (document.getElementById(id)) {
                // Remove info element
                document.body.removeChild(document.getElementById(id));
            } else {
                // Insert info element
                div = _createInfoElement(id, elem, false);
                // console.log("Adding div for " + elem.id + " of type " + elem.type + " div id " + id);
                document.body.appendChild(div);
            }
        }
    });
}

/**
 * Create a div element for displaying the fieldname next to a formfield.
 *
 * @param id {String}
 *        the unique id for the div element
 *
 * @param sourceElem {Element}
 *        the inputfield determining the position for the new div element
 *
 * @param includeForm boolean
 *        whether or not to include info about te containing form
 *
 * @return {Element}
 *         the newly created div, absolute positioned next to the sourceElem
 */
function _createInfoElement(id, sourceElem, includeForm) {
    let fldName = _getElementNameOrId(sourceElem);
    if (fldName === '') {
        fldName = '\u00a0'; //&nbsp;
    }

    let style = 'display:block; border:1px solid #000; padding: 0 4px; ' +
        'background-color:#FFFFAA; color:#000; opacity: 0.75; ' +
        'font: bold 11px sans-serif; text-decoration:none; text-align:left; ' +
        'z-index: 2147483647; cursor:default; box-shadow: 3px 3px 2px black; ';

    let compstyle = document.defaultView.getComputedStyle(sourceElem, null);
    let width = 0;
    if ('BODY' !== sourceElem.nodeName && 'HTML' !== sourceElem.nodeName) {
        // do need place info about body or html next to (and outside) the element
        width = parseInt(compstyle.getPropertyValue("width").replace('px', ''));
    }
    let padding = parseInt(compstyle.getPropertyValue("padding-right").replace('px', ''));
    let border = parseInt(compstyle.getPropertyValue("border-right-width").replace('px', ''));

    let left = 0, top = 0, elem = sourceElem;
    if (elem.offsetParent) {
        do {
            left += elem.offsetLeft;
            top += elem.offsetTop;
        } while ((elem = elem.offsetParent));
    }
    style += 'position:absolute; top:' + top + 'px; ';
    style += 'left:' + (left + width + padding + border + 4) + 'px; ';

    let div = document.createElement('div');
    div.setAttribute('id', id);
    div.setAttribute('title', _getFormInfoText(sourceElem, includeForm));
    div.setAttribute('style', style);
    div.setAttribute('contenteditable', 'false');
    div.addEventListener("mouseenter", function(){this.style.opacity=1;this.style.zIndex=1002;}, false);
    div.addEventListener("mouseleave", function(){this.style.opacity=0.75;this.style.zIndex=1001;}, false);
    div.appendChild(document.createTextNode(fldName));

    let innerDiv = document.createElement('div');
    div.appendChild(innerDiv);
    div.addEventListener("click", function(){
        let e=document.getElementById(this.id + 'inner');
        if(e.style.display==='none') {
            e.style.display='block';
            this.style.zIndex=1001;
        } else {
            e.style.display='none';
            this.style.zIndex=1000;
        }
    }, false);
    innerDiv.setAttribute('id', id + 'inner');
    innerDiv.setAttribute('title', ' ');
    innerDiv.setAttribute('style',
        'display:none; background-color:#FFDCCF; margin:5px; padding:5px; ' +
        'font-weight: normal; border:1px inset #FFDCCF; ' +
        'box-shadow: inset 0 0 8px rgba(55, 20, 7, 0.5)');
    innerDiv.appendChild(_getFormInfoHTML(sourceElem, includeForm));

    return div;
}

/**
 * Collect the attributes for the element and its form container and return as String.
 *
 * @param element {Element}
 *        the inputfield
 *
 * @param includeForm boolean
 *        whether or not to include info about te containing form
 *
 * @return {Element}
 *         info about element and form
 */
function _getFormInfoHTML(element, includeForm) {
    let info = document.createElement('div');

    let inputBold = document.createElement('b');
    inputBold.textContent = '<' + element.nodeName + '>';
    info.appendChild(inputBold);

    info.appendChild(document.createElement('br'));

    for (let j = 0; j < element.attributes.length; j++) {
        info.appendChild(document.createTextNode(element.attributes[j].name + '=' + element.attributes[j].value));
        info.appendChild(document.createElement('br'));
    }

    if (includeForm) {
        let form = element;
        while (form.parentNode && form.localName !== 'form') {
            form = form.parentNode;
        }
        if (form && form.localName === 'form') {
            info.appendChild(document.createElement('br'));
            let formBold = document.createElement('b');
            formBold.textContent = '<FORM>';
            info.appendChild(formBold);
            info.appendChild(document.createElement('br'));
            for (let i = 0; i < form.attributes.length; i++) {
                info.appendChild(document.createTextNode(form.attributes[i].name + '=' + form.attributes[i].value));
                info.appendChild(document.createElement('br'));
            }
        }
    }
    return info;
}

/**
 * Collect the attributes for the element and its form container and return as String.
 *
 * @param element {Element}
 *        the inputfield
 *
 * @param includeForm boolean
 *        whether or not to include info about te containing form
 *
 * @return {String}
 *         info about element and form
 */
function _getFormInfoText(element, includeForm) {
    let sep = ' ';

    let result = element.nodeName + ': ';
    for (let j = 0; j < element.attributes.length; j++) {
        result += element.attributes[j].name + '=' + element.attributes[j].value + sep;
    }

    if (includeForm) {
        let form = element;
        while (form.parentNode && form.localName !== 'form') {
            form = form.parentNode;
        }
        if (form && form.localName === 'form') {
            result += ' # FORM: ';
            for (let i = 0; i < form.attributes.length; i++) {
                result += form.attributes[i].name + '=' + form.attributes[i].value + sep;
            }
        }
    }
    return result;
}

/**
 * Determine the name of an element (either name if it has one, otherwise its id).
 *
 * @param  element {Element}
 *         the DOM element
 *
 * @return {String}
 *         the name of the element, if no name then return its id
 */
function _getElementNameOrId(element) {
    return (element.name && element.name.length > 0) ? element.name : element.id;
}

/**
 * Test whether the element is displayed according to its display property.
 *
 * @param  elem {Element}
 * @return {boolean} whether or not the element is displayed
 */
function _isDisplayed(elem) {
    let display = _getEffectiveStyle(elem, "display");
    if ("none" === display) return false;

    let visibility = _getEffectiveStyle(elem, "visibility");
    if ("hidden" === visibility || "collapse" === visibility) return false;

    let opacity = _getEffectiveStyle(elem, "opacity");
    if (0 === opacity) return false;

    if (elem.parentNode.style) {
        return _isDisplayed(elem.parentNode);
    }
    return true;
}

/**
 * Get the effective css style of an element.
 *
 * @param  element {Element}
 * @param  property {String} the css property to obtain
 * @return {String} the effective css style
 */
function _getEffectiveStyle(element, property) {
    if (element.style === undefined) {
        return undefined; // not a styled element
    }

    let doc = element.ownerDocument;
    let effectiveStyle = doc.defaultView.getComputedStyle(element, null);
    let propertyValue = effectiveStyle.getPropertyValue(property);
    if ("inherit" === propertyValue && element.parentNode.style) {
        return _getEffectiveStyle(element.parentNode, property);
    }
    return propertyValue;
}
