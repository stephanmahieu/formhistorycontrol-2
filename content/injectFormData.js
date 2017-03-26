browser.runtime.onMessage.addListener(receiveEvents);

function receiveEvents(fhcEvent) {
    if (fhcEvent.action) {
        switch (fhcEvent.action) {
            case "showformfields":
                console.log("Received action event " + fhcEvent.action);
                showformfields();
                break;
        }
    }
}


function showformfields() {
    var ii = 0, id, div;
    [].forEach.call( document.querySelectorAll("input,textarea"), function(elem) {
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

    [].forEach.call( document.querySelectorAll("html,div,iframe,body"), function(elem) {
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


function _isDesignModeOn(elem) {
    return (elem.contentDocument && ("on" === elem.contentDocument.designMode));
}

/**
 * Create a div element for displaying the fieldname next to a formfield.
 *
 * @param document {DOM Document}
 *        the HTML document containing the inputfield
 *
 * @param id {String}
 *        the unique id for the div element
 *
 * @param sourceElem {DOM Element}
 *        the inputfield determining the position for the new div element
 *
 * @param includeForm boolean
 *        whether or not to include info about te containing form
 *
 * @return {DOM Element}
 *         the newly created div, absolute positioned next to the sourceElem
 */
function _createInfoElement(id, sourceElem, includeForm) {
    var fldName = _getElementNameOrId(sourceElem);
    if (fldName == '') {
        fldName = '\u00a0'; //&nbsp;
    }

    var style = 'display:block; border:1px solid #000; padding: 0 4px; ' +
        'background-color:#FFFFAA; color:#000; opacity: 0.75; ' +
        'font: bold 11px sans-serif; text-decoration:none; text-align:left; ' +
        'z-index: 2147483647; cursor:default; box-shadow: 3px 3px 2px black; ';

    var compstyle = document.defaultView.getComputedStyle(sourceElem, null);
    var width = 0;
    if ('BODY' !== sourceElem.nodeName && 'HTML' !== sourceElem.nodeName) {
        // do need place info about body or html next to (and outside) the element
        width = parseInt(compstyle.getPropertyValue("width").replace('px', ''));
    }
    var padding = parseInt(compstyle.getPropertyValue("padding-right").replace('px', ''));
    var border = parseInt(compstyle.getPropertyValue("border-right-width").replace('px', ''));

    var left = 0, top = 0, elem = sourceElem;
    if (elem.offsetParent) {
        do {
            left += elem.offsetLeft;
            top += elem.offsetTop;
        } while ((elem = elem.offsetParent));
    }
    style += 'position:absolute; top:' + top + 'px; ';
    style += 'left:' + (left + width + padding + border + 4) + 'px; ';

    var div = document.createElement('div');
    div.setAttribute('id', id);
    div.setAttribute('title', _getFormInfoText(sourceElem, includeForm));
    div.setAttribute('style', style);
    div.setAttribute('contenteditable', 'false');
    div.addEventListener("mouseenter", function(){this.style.opacity=1;this.style.zIndex=1002;}, false);
    div.addEventListener("mouseleave", function(){this.style.opacity=0.75;this.style.zIndex=1001;}, false);
    div.appendChild(document.createTextNode(fldName));

    var innerDiv = document.createElement('div');
    div.appendChild(innerDiv);
    div.addEventListener("click", function(){
        var e=document.getElementById(this.id + 'inner');
        if(e.style.display=='none') {
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
 * @param element {DOM Element}
 *        the inputfield
 *
 * @param {DOM Document}
 *        the HTML document object
 *
 * @param includeForm boolean
 *        whether or not to include info about te containing form
 *
 * @return {DOM}
 *         info about element and form
 */
function _getFormInfoHTML(element, includeForm) {
    var info = document.createElement('div');

    var inputBold = document.createElement('b');
    inputBold.textContent = '<' + element.nodeName + '>';
    info.appendChild(inputBold);

    info.appendChild(document.createElement('br'));

    for (var j = 0; j < element.attributes.length; j++) {
        info.appendChild(document.createTextNode(element.attributes[j].name + '=' + element.attributes[j].value));
        info.appendChild(document.createElement('br'));
    }

    if (includeForm) {
        var form = element;
        while (form.parentNode && form.localName != 'form') {
            form = form.parentNode;
        }
        if (form && form.localName == 'form') {
            info.appendChild(document.createElement('br'));
            var formBold = document.createElement('b');
            formBold.textContent = '<FORM>';
            info.appendChild(formBold);
            info.appendChild(document.createElement('br'));
            for (var i = 0; i < form.attributes.length; i++) {
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
 * @param element {DOM Element}
 *        the inputfield
 *
 * @param includeForm boolean
 *        whether or not to include info about te containing form
 *
 * @return {String}
 *         info about element and form
 */
function _getFormInfoText(element, includeForm) {
    var sep = ' ';

    var result = element.nodeName + ': ';
    for (var j = 0; j < element.attributes.length; j++) {
        result += element.attributes[j].name + '=' + element.attributes[j].value + sep;
    }

    if (includeForm) {
        var form = element;
        while (form.parentNode && form.localName != 'form') {
            form = form.parentNode;
        }
        if (form && form.localName == 'form') {
            result += ' # FORM: ';
            for (var i = 0; i < form.attributes.length; i++) {
                result += form.attributes[i].name + '=' + form.attributes[i].value + sep;
            }
        }
    }
    return result;
}

/**
 * Determine the name of an element (either name if it has one, otherwise its id).
 *
 * @param  element {DOM element}
 *         the DOM element
 *
 * @return {String}
 *         the name of the element, if no name then return its id
 */
function _getElementNameOrId(element) {
    return (element.name && element.name.length > 0) ? element.name : element.id;
}


/**
 * Determine whether or not a DOM element type is a text input element.
 * New html5 types like search, tel, url, time, week and email are
 * also considered text types.
 *
 * @param  type {DOM element type}
 * @return {Boolean} whether or not a DOM element is a text input element
 */
function _isTextInputSubtype(type) {
    if ("text" === type || "search" === type || "tel" === type || "url" === type || "email" === type || "textarea" === type) {
        // exclude "password", never save those!
        // also exclude number, range and color
        // and exclude the not fully supported: date, datetime-local, month, time, week
        return true;
    }
    return false;
}

/**
 * Test whether the element is displayed according to its display property.
 *
 * @param  elem {DOM element}
 * @return {boolean} whether or not the element is displayed
 */
function _isDisplayed(elem) {
    var display = _getEffectiveStyle(elem, "display");
    if ("none" == display) return false;

    var visibility = _getEffectiveStyle(elem, "visibility");
    if ("hidden" == visibility || "collapse" == visibility) return false;

    var opacity = _getEffectiveStyle(elem, "opacity");
    if (0 == opacity) return false;

    if (elem.parentNode.style) {
        return _isDisplayed(elem.parentNode);
    }
    return true;
}

/**
 * Get the effective css style of an element.
 *
 * @param  element {DOM element}
 * @param  property {String} the css property to obtain
 * @return {String} the effective css style
 */
function _getEffectiveStyle(element, property) {
    if (element.style == undefined) {
        return undefined; // not a styled element
    }

    var doc = element.ownerDocument;
    var effectiveStyle = doc.defaultView.getComputedStyle(element, null);
    var propertyValue = effectiveStyle.getPropertyValue(property);
    if ("inherit" == propertyValue && element.parentNode.style) {
        return _getEffectiveStyle(element.parentNode, property);
    }
    return propertyValue;
}

/**
 * Get the effective contentEditable property of an element.
 *
 * @param  element {DOM element}
 * @return {boolean} whether content is editable "true" or not "false"
 */
function _isContentEditable(element) {
    if (element.contentEditable === undefined) {
        return false;
    }
    if ("inherit" !== element.contentEditable) {
        return ("true" === element.contentEditable);
    }

    var doc = element.ownerDocument;
    var effectiveStyle = doc.defaultView.getComputedStyle(element, null);
    var propertyValue = effectiveStyle.getPropertyValue("contentEditable");
    if ("inherit" == propertyValue && element.parentNode.style) {
        return _isContentEditable(element.parentNode);
    }
    return ("true" == propertyValue);
}
