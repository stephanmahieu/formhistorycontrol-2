/*
 * Copyright (c) 2023. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

let eventQueue = [];
let updateInterval = 5000;

const DISPLAY_DURATION = 7000;
const TRANSITION_DURATION = 1200;
const FILL_STYLE = [
    {prop: 'transition', value:'all ' + TRANSITION_DURATION + 'ms ease-in-out'},
    {prop: 'background', value:'#ffffcc'},
    {prop: 'color',      value:'#000000'},
    {prop: 'box-shadow', value:'inset 0 0 0 2px red'}
];

browser.runtime.onMessage.addListener(receiveEvents);

function receiveEvents(fhcActionEvent /*, sender, sendResponse*/) {
    if (fhcActionEvent.action) {
        switch (fhcActionEvent.action) {

            case "fillMostRecent":
            case "fillMostUsed":
            case "clearFields":
                //console.log("Received action event " + fhcActionEvent.action);
                _fillformfields(fhcActionEvent.action, fhcActionEvent.targetTabId);
                break;

            case "formfieldValueResponseSingle":
                //console.log("Received action event " + fhcActionEvent.action);
                if (fhcActionEvent.nodeName === "input") {
                    _findTextFieldAndSetValueSingle(fhcActionEvent);
                } else {
                    _findMultilineFieldAndSetValueSingle(fhcActionEvent);
                }
                setTimeout(() => { removeAllStyles(); }, DISPLAY_DURATION);
                break;


            case "formfieldValueResponse":
                //console.log("Received action event " + fhcActionEvent.action);
                _findFieldAndSetValue(fhcActionEvent);
                setTimeout(() => { removeAllStyles(); }, DISPLAY_DURATION);
                break;
        }
    }
    if (fhcActionEvent.eventType && fhcActionEvent.eventType === 888) {
        if (fhcActionEvent.updateIntervalChanged) {
            setPreferredUpdateInterval();
        }
    }
}

//----------------------------------------------------------------------------
// fill formfields response handling methods
//----------------------------------------------------------------------------

function _findTextFieldAndSetValueSingle(fhcEvent) {
    let found = false;
    // try to set the value in the active element
    if (document.activeElement) {
        found = _setTextValue(document.activeElement, fhcEvent.value);
    }
}

function _findMultilineFieldAndSetValueSingle(fhcEvent) {
    // try to set the value in the field it came from (same name/type)
    let found = _findFieldAndSetValue(fhcEvent);

    if (!found && document.activeElement) {
        // if activated from a focused element, try to insert value there
        found = _setMultilineTextValue(document.activeElement, fhcEvent.value);
    }

    if (!found) {
        // if all failed try to put the value in the first field it may fit
        let firstElm = _findFirstMultilineTextField();
        if (firstElm) {
            found = _setMultilineTextValue(firstElm, fhcEvent.value);
        }
    }

    return found;
}

function _findFieldAndSetValue(fhcEvent) {
    let found = false;

    // try to find the element directly by id
    if (fhcEvent.id) {
        let elem = document.getElementById(fhcEvent.id);
        if (elem) {
            found = _ifMatchSetValue(elem, fhcEvent);
            //if (found) console.log("1. Just filled field by id: " + fhcEvent.id);
        }
    }

    // try to match by name
    if (!found && fhcEvent.name) {
        Array.from(document.getElementsByName(fhcEvent.name)).forEach( elem => {
            if (!found) {
                found = _ifMatchSetValue(elem, fhcEvent);
                //if (found) console.log("2. Just filled field by name: " + fhcEvent.id);
            }
        });
    }

    // still not found, if id was empty but we have a name, use the name as id
    if (!found && fhcEvent.name && !fhcEvent.id) {
        const fhcEventClone = Object.assign({}, fhcEvent);
        fhcEventClone.id = fhcEvent.name;
        fhcEventClone.name = '';
        let elem = document.getElementById(fhcEventClone.id);
        if (elem) {
            found = _ifMatchSetValue(elem, fhcEventClone);
            //if (found) console.log("3. Just filled field by id: " + fhcEvent.id);
        }
    }

    // try all elements matching the nodeName one by one
    if (!found) {
        document.querySelectorAll(fhcEvent.nodeName).forEach( elem => {
            if (_isDisplayed(elem)) {
                if (!found) {
                    found = _ifMatchSetValue(elem, fhcEvent);
                    //if (found) console.log("4. Just filled field by nodeName: " + fhcEvent.id);
                }
            }
        });
    }
    return found;
}

function _findFirstMultilineTextField() {
    document.querySelectorAll("textarea").forEach( (elem) => {
        // text types
        if (_isTextInputSubtype(elem.type) && _isDisplayed(elem)) {
            return elem;
        }
    });
    document.querySelectorAll("html,div,iframe,body").forEach( (elem) => {
        if ((_isContentEditable(elem) && _isDisplayed(elem)) || _isDesignModeOn(elem)) {
            return elem;
        }
    });
}

function _isDesignModeOn(elem) {
    return (elem.contentDocument && ("on" === elem.contentDocument.designMode));
}

function _setMultilineTextValue(element, value) {
    let found = false;
    let changed = false;
    if (element.nodeName.toLowerCase()==='textarea') {
        if (element.value !== value) {
            // element.value = value;
            _setValueAndSimulatedUserInteraction(element, value);
            changed = true;
        }
        found = true;
    } else if (_isContentEditable(element)) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        element.appendChild(DOMPurify.sanitize(value, {RETURN_DOM_FRAGMENT: true, RETURN_DOM_IMPORT: true}));
        found = true;
        changed = true;
    }
    if (found && value !== "") {
        _setStyle(element, false);
        if (changed) {
            // trigger update count and last used date
            _manualOnContentChanged(element);
        }
    }
    return found;
}

function _setTextValue(element, value) {
    let found = false;
    if (element.nodeName.toLowerCase()==='input') {
        found = true;
        let changed = false;
        if (element.value !== value) {
            // element.value = value;
            _setValueAndSimulatedUserInteraction(element, value);
            changed = true;
        }
        _setStyle(element, false);
        if (changed) {
            // trigger update count and last used date
            _manualOnContentChanged(element);
        }
    }
    return found;
}

function _ifMatchSetValue(node, fhcEvent) {
    let doErase = (fhcEvent.value === "");

    let nodeName = node.nodeName.toLowerCase();
    //let location = node.ownerDocument.location;
    //let pagetitle = node.ownerDocument.title;
    //let formid = "";
    //let name = (node.name) ? node.name : ((node.id) ? node.id : "");\

    let id = (node.id) ? node.id : ((node.name) ? node.name : "");
    if (id === "") {
        // node without a id or name, skip
        return false;
    }

    // switch(nodeName) {
    //     case "textarea":
    //     case "input":
    //         // if id is empty, ditch it, it can never be used for restore
    //         if (id === "") return;
    //         //formid = _getFormId(node);
    //         break;
    // }

    //console.log("## testing " + fhcEvent.id + " for a match");

    // TODO test if additional properties are equal (location, pagetitle, formid)???
    if (fhcEvent.nodeName === 'iframe' && nodeName === 'body' && fhcEvent.id === id) {
        // special case, stored as iframe, but node is actually body
    } else if (fhcEvent.nodeName !== nodeName || fhcEvent.id !== id) {
        //console.log("## missing id, skipping!" + fhcEvent.name);
        return false;
    }

    //console.log("#### node id matches " + fhcEvent.id + "  nodeName:" + nodeName + "  type: " + node.type);

    // node.type undefined
    switch(nodeName) {
        case "html":
        case "div":
        //case "iframe":
        case "body":
            while (node.firstChild) {
                node.removeChild(node.firstChild);
            }
            node.appendChild(DOMPurify.sanitize(fhcEvent.value, {RETURN_DOM_FRAGMENT: true, RETURN_DOM_IMPORT: true}));
            _setValueAndSimulatedUserInteraction(node, null);

            // indicate changed value backgroundColor
            _setStyle(node, doErase);

            // trigger update count and last used date
            _manualOnContentChanged(node);

            //console.log("###### setting " + nodeName + " id:" + fhcEvent.id);
            return true;
            break;
    }

    if (node.type) {
        switch(node.type) {
            case "textarea":
            case "text":
            case "number":
            case "range":
            case "color":
            case "search":
            case "tel":
            case "url":
            case "email":
            case "date":
            case "time":
            case "week":
            case "month":
            case "datetime":
            case "datetime-local":
                if (node.value !== fhcEvent.value) {
                    // node.value = fhcEvent.value;
                    _setValueAndSimulatedUserInteraction(node, fhcEvent.value)

                    // trigger update count and last used date
                    _manualOnContentChanged(node);
                }

                // indicate changed value backgroundColor
                _setStyle(node, doErase);

                //console.log("###### setting " + node.type + " id:" + fhcEvent.id);
                return true;
                break;

            case "radio":
            case "checkbox":
                if (fhcEvent.selected !== node.checked) {
                    // only check a radiobutton, never uncheck
                    //console.log("###### setting " + node.type + " id:" + fhcEvent.id);
                    if (!(node.type === "radio" && !fhcEvent.selected)) {
                        node.checked = fhcEvent.selected;
                    }
                } else {
                    //console.log("###### skipping " + node.type + "(same state) id:" + fhcEvent.id);
                }

                // indicate changed value backgroundColor
                _setStyle(node, doErase);

                return true;
                break;

            case "select":
            case "select-multiple":
            case "select-one":
                //console.log("###### setting " + node.type + "!!!! " + fhcEvent.id);
                if (node.options) {
                    Array.from(node.options).forEach( optionElem => {
                        if (optionElem.value === fhcEvent.name && fhcEvent.selected !== optionElem.selected) {
                            optionElem.selected = fhcEvent.selected;
                        }
                    });
                }

                // indicate changed value backgroundColor
                _setStyle(node, doErase);

                return true;
                break;
        }
    }

    return false;
}
function _createKeyboardEvent(eventType, key) {
    return new KeyboardEvent(eventType, {
        'key': ' ',
        'code': ' ',
        'charCode': 0,
        'keyCode': ' '.charCodeAt(0),
        'which': ' '.charCodeAt(0),
        'bubbles': true,
        'composed': true,
        'cancelable': true
    });
}

function _createInputEvent(eventType) {
    return new InputEvent(eventType, {
        'bubbles': true,
        'composed': true,
        'cancelable': true
    })
}

function _setValueAndSimulatedUserInteraction(element, value) {
    // set a new value on an element and dispatch additional events to simulate
    // user interaction and trigger local javascript (if any) to detect the change
    element.dispatchEvent(_createKeyboardEvent('keydown'));
    if (value !== null) {
        element.value = value;
    }
    element.dispatchEvent(_createKeyboardEvent('keyup'));
    element.dispatchEvent(_createKeyboardEvent('keypress'));
    element.dispatchEvent(_createInputEvent('input'));
    element.dispatchEvent(_createInputEvent('change'));
}

function _setStyle(node, doErase) {
    if (doErase) {
        FILL_STYLE.forEach(style => {
            let orgAttribute = 'data-fhc-orgstyle-' + style.prop;
            if (node.hasAttribute(orgAttribute)) {
                node.style[style.prop] = node.getAttribute(orgAttribute);
                node.removeAttribute(orgAttribute);
            }
        });
    } else {
        FILL_STYLE.forEach(style => {
            let orgAttribute = 'data-fhc-orgstyle-' + style.prop;
            if (!node.hasAttribute(orgAttribute)) {
                // store current value
                node.setAttribute(orgAttribute, node.style[style.prop]);
                // apply new style
                node.style[style.prop] = style.value;
            }
        });
    }
}

function removeAllStyles(removeAll = false) {
    document.querySelectorAll("input,textarea,select,select-multiple,select-one").forEach( (elem) => {
        if (_isDisplayed(elem)) {
            _removeAllStyles(elem, removeAll);
        }
    });
    document.querySelectorAll("html,div,iframe,body").forEach( (elem) => {
        if ((_isContentEditable(elem) && _isDisplayed(elem)) || _isDesignModeOn(elem)) {
            _removeAllStyles(elem, removeAll);
        }
    });
    if (!removeAll) {
        setTimeout(() => { removeAllStyles(true); }, TRANSITION_DURATION);
    }
}

function _removeAllStyles(node, includeTransition) {
    FILL_STYLE.forEach(style => {
        let orgAttribute = 'data-fhc-orgstyle-' + style.prop;
        if ((includeTransition || style.prop !== 'transition') && node.hasAttribute(orgAttribute)) {
            node.style[style.prop] = node.getAttribute(orgAttribute);
            node.removeAttribute(orgAttribute);
        }
    });
}

//----------------------------------------------------------------------------
// fill formfields request handling methods
//----------------------------------------------------------------------------

function _fillformfields(action, targetTabId) {
    document.querySelectorAll("input,textarea").forEach( (elem) => {
        // text types
        if (_isTextInputSubtype(elem.type) && _isDisplayed(elem)) {
            _requestHistoricValue(elem, action, targetTabId, "text");
        }
    });

    document.querySelectorAll("input,textarea").forEach( (elem) => {
        // form element (state) types
        if (_isFormElementInputSubtype(elem.type) && _isDisplayed(elem)) {
            _requestHistoricValue(elem, action, targetTabId, "state");
        }
    });

    document.querySelectorAll("html,div,iframe,body").forEach( (elem) => {
        if ((_isContentEditable(elem) && _isDisplayed(elem)) || _isDesignModeOn(elem)) {
            _requestHistoricValue(elem, action, targetTabId, "text");
        }
    });

    document.querySelectorAll("select,select-multiple,select-one").forEach( (elem) => {
        if (_isDisplayed(elem)) {
            _requestHistoricValue(elem, action, targetTabId, "state");
        }
    });
}

function _requestHistoricValue(node, action, targetTabId, textOrState) {
    let nodeName = node.nodeName.toLowerCase();
    let location = node.ownerDocument.location;
    let pagetitle = node.ownerDocument.title;
    let formid = _getFormId(node);
    let id = _getId(node);

    //let name = (node.name) ? node.name : ((node.id) ? node.id : "");
    let name;
    if (textOrState === "text") {
        name  = (node.name) ? node.name : ((node.id) ? node.id : "");
    } else {
        name  = (node.name) ? node.name : "";
    }

    // html,div,body have no type
    let type = (node.type) ? node.type : "";

    switch(nodeName) {
        case "textarea":
        case "input":
            // if id is empty, ditch it, it can never be used for restore
            if (id === "") return;
            break;

        case "select":
        case "select-multiple":
        case "select-one":
            // need the options
            if (node.options) {
                Array.from(node.options).forEach( optionElem => {
                    //console.log("requesting content for select option value: " + optionElem.value + " type: " + type + "  id: " + id);
                    let dataRetrievalEvent = _createHistoricValueRetrievalEvent(optionElem.value, nodeName, type, id, formid, location, pagetitle, textOrState, action, targetTabId);
                    browser.runtime.sendMessage(dataRetrievalEvent);
                });
                return;
            }
            break;
    }


    //console.log("requesting formelement content for elem-id: " + id + " type: " + type + "  nodename: " + nodeName);

    let dataRetrievalEvent = _createHistoricValueRetrievalEvent(name, nodeName, type, id, formid, location, pagetitle, textOrState, action, targetTabId);
    browser.runtime.sendMessage(dataRetrievalEvent);
}

function _createHistoricValueRetrievalEvent(name, nodeName, aType, id, formid, location, pagetitle, textOrState, action, targetTabId) {
    return {
        eventType:   3,
        node:        null,
        type:        aType,
        id:          id,
        nodeName:    nodeName,
        name:        name,
        formid:      formid,
        url:         location.href,
        host:        _getHost(location),
        pagetitle:   pagetitle,
        value:       null,
        textOrState: textOrState,
        action:      action,
        targetTabId: targetTabId
    };
}


//----------------------------------------------------------------------------
// EventQueue handling methods
//----------------------------------------------------------------------------

/**
 * handle all events in the event-queue.
 */
function processEventQueue() {
    if (0 < eventQueue.length) {
        //console.log("Start processing event-queue");
        let event;
        for (let it=0; it<eventQueue.length; it++) {
            event = eventQueue[it];
            switch(event.eventType) {
                case 1:
                    _processContentEvent(event);
                    break;
                // case 2:
                //     _processFormElementEvent();
                //     break;
            }
        }
        eventQueue = [];
        //console.log("Finished processing event-queue");
    }
}

/**
 * Send content-event to the background handler.
 */
function _processContentEvent(event) {
    //console.log("_handleContentEvent");

    // get current content (lazily load)
    let theContent = _getContent(event);
    if (theContent.length > 0 && _containsPrintableContent(theContent))  {
        event.value = JSON.stringify(theContent);
        event.last = (new Date()).getTime();
        event.node = null;

        // console.log("Send content-event for " + event.id + " to background-script: " + event.value);
        browser.runtime.sendMessage(event);
    }
}

/**
 * Send formelement-event immediately to the background handler not using the event-queue
 * because submitting will reload the page and background-connection will be lost.
 */
function _processFormElementEvent(event) {
    //console.log("Send form-event for " + event.id + " to background-script: " + event.type);
    browser.runtime.sendMessage(event);
}

function _containsPrintableContent(value) {
    return value.replace('&nbsp;','').replace(/[^\x20-\x7E]/g, '').replace(/\s/g,'').length > 0;
}

//----------------------------------------------------------------------------
// Event listeners
//----------------------------------------------------------------------------

function onFormSubmit(event) {
    //console.log("collectFormData::onFormSubmit start");
    let form = _findForm(event.target);
    if (form && form.elements){
        let formElements = form.elements;
        let location = form.ownerDocument.location;
        let pagetitle = form.ownerDocument.title;
        //console.log("form id: " + form.id);
        //console.log("form url: " + location.href);
        //console.log("formElements #: " + formElements.length);

        let formFormid = _getId(form);
        let formHost = _getHost(location);

        let formField, allFormElements = [];
        for (let i=0; i<formElements.length; i++) {
            formField = formElements[i];
            //console.log("###field id=" + _getId(formField) + " type=" + formField.type);
            switch(formField.type){
                case "number":
                case "range":
                case "color":
                    allFormElements.push({
                        node: "",
                        id: _getId(formField),
                        name: (formField.name) ? formField.name : "",
                        type: formField.type,
                        selected: 1,
                        value: formField.value,
                        formid: formFormid,
                        host: formHost,
                        url: location.href,
                        pagetitle: pagetitle
                    });
                    break;
                case "radio":
                case "checkbox":
                    //console.log("field id=" + formField.id + " type=" + formField.type + " checked=" + formField.checked);
                    allFormElements.push({
                        node: "",
                        id: _getId(formField),
                        name: (formField.name) ? formField.name : "",
                        type: formField.type,
                        selected: formField.checked,
                        value: null,
                        formid: formFormid,
                        host: formHost,
                        url: location.href,
                        pagetitle: pagetitle
                    });
                    break;
                case "select":
                case "select-multiple":
                case "select-one":
                    //console.log("select field:");
                    if (formField.options) {
                        let option;
                        for (let j=0; j<formField.options.length; j++) {
                            option = formField.options[j];
                            // option may contain attribute label and/or value, if both missing use the text-content
                            //console.log("- option id=" + option.id + " value=" + option.value + " selected=" + option.selected);
                            allFormElements.push({
                                node: "",
                                id: _getId(formField),
                                name: option.value,
                                type: formField.type,
                                selected: option.selected,
                                value: null,
                                formid: formFormid,
                                host: formHost,
                                url: location.href,
                                pagetitle: pagetitle
                            });
                        }
                    }
                    break;
            }
        }

        _processFormElementEvent({
            eventType: 2,
            host: formHost,
            incognito: browser.extension.inIncognitoContext,
            formElements: allFormElements
        });
    }
    //console.log("collectFormData::onFormSubmit done.");
}

/**
 * trigger update count and last used date just like regular DOM events.
 */
function _manualOnContentChanged(element) {
    const dummyEventObj = {
        target: element,
        type: 'dummy'
    };
    onContentChanged(dummyEventObj);
}


function onContentChanged(event) {
    let t = event.target;
    let n = t.nodeName.toLowerCase();

    if ("keyup" === event.type) {
        // for input we rely on change events
        if ("input" === n) return;

        // only react to content changing keys
        if (! (event.key.length === 1 || ("Backspace" === event.key || "Delete" === event.key || "Enter" === event.key))) return;
    }

    // only handle text inputs
    if ("input" === n && !_isTextInputSubtype(t.type)) return;

    //console.log("node of type: " + n);
    if ("textarea" === n || "input" === n) {
        //var id = (t.id) ? t.id : t.name;
        //console.log(n + " with id: " + id);
        _contentChangedHandler(n, t);
    }
    else if ("html" === n) {
        //console.log("keyup from html");
        let p = t.parentNode;
        if (p && "on" === p.designMode) {
            _contentChangedHandler("html", p);
        }
    }
    else if ("body" === n || "div" === n) {
        // body of iframe
        //console.log("keyup from body");
        let doc = t.ownerDocument;
        // activeElement prevents manual update
        // let e = doc.activeElement;
        let e = t;
        if (("on" === doc.designMode) || _isContentEditable(e)) {
            //console.log("content is editable");
            _contentChangedHandler("body" === n ? "iframe" : "div", e);
        }
    }
}

function _contentChangedHandler(type, node) {

    // Custom handling online web editor frameworks

    // Ace - The High Performance Code Editor for the Web
    if ('ace_text-input' === node.className) {
        // change node to the actual content
        let actualContentNode = node.ownerDocument.querySelector("div.ace_text-layer");
        if (actualContentNode) {
            node = actualContentNode;
            type = 'div';
        }
    }


    let location = node.ownerDocument.location;
    let pagetitle = node.ownerDocument.title;
    let formid = "";
    let id = (node.id) ? node.id : ((node.name) ? node.name : "");
    let name = (node.name) ? node.name : ((node.id) ? node.id : "");
    switch(type) {
        case "textarea":
        case "input":
             // if id is empty, ditch it, it can never be used for restore
             // if (id === "") return;
             formid = _getFormId(node);
             break;
        case "html":
        case "div":
        case "iframe":
             // noop
             break;
    }

    // add to queue (if not already queued)
    _enqueueContentEvent(name, type, id, formid, location, pagetitle, node);
}


//----------------------------------------------------------------------------
// HTML Field/Form helper methods
//----------------------------------------------------------------------------

/**
 * Determine whether or not a DOM element type is a text input element.
 * New html5 types like search, tel, url, time, week and email are
 * also considered text types.
 *
 * @param  type {String}
 * @return {Boolean} whether or not a DOM element is a text input element
 */
function _isTextInputSubtype(type) {
    // exclude "password", never save those!
    return ("text" === type || "search" === type || "tel" === type || "url" === type || "email" === type
            || "textarea" === type || "week" === type || "month" === type || "date" === type || "time" === type
            || "datetime-local" === type || "datetime" === type);
}

function _isFormElementInputSubtype(type) {
    return ("radio" === type || "checkbox" === type || "color" === type || "number" === type || "range" === type);
}


/**
 * Get the editor (multiline) content from a HTML element.
 *
 * @param  event {Event}
 *         eventlistener-event
 * @return {String}
 *         the editor/multiline text being edited by a user
 */
function _getContent(event) {
    let theContent = "";
    try {
        switch(event.type) {
            case "textarea":
            case "input":
                theContent = event.node.value;
                break;
            case "html":
                theContent = event.node.body.innerHTML;
                break;
            case "div":
            case "iframe":
                theContent = event.node.innerHTML;
                break;
        }
    } catch(e) {
        // possible "can't access dead object" TypeError, DOM object destroyed
    }
    return theContent;
}

function _findForm(element) {
    let form = element;
    while (form.parentNode && form.localName !== 'form') {
        form = form.parentNode;
    }
    if (form && form.localName === 'form') {
        return form;
    }
    return null;
}


/**
 * Get the id of a HTML element, if id not present return the name.
 * If neither is present return an empty string.
 *
 * @param  element {Element}
 * @return {String} id, name or empty string
 */
function _getId(element) {
    return (element.id) ? element.id : ((element.name) ? element.name : "");
}


/**
 * Get the id (or name) of the parent form if any for the HTML element.
 *
 * @param  element {Element}
 * @return {String} id, name or empty string of the parent form element
 *
 */
function _getFormId(element) {
    let insideForm = false;
    let parentElm = element;
    while(parentElm && !insideForm) {
        parentElm = parentElm.parentNode;
        insideForm = (parentElm && "FORM" === parentElm.tagName);
    }
    return (insideForm && parentElm) ? _getId(parentElm) : "";
}


/**
 * Return the host of a URL (http://host:port/path).
 *
 * @param  aLocation {Location}
 * @return {String} the host of strURL
 */
function _getHost(aLocation) {
    if (aLocation.protocol === "file:") {
        return "localhost";
    } else {
        return aLocation.host;
    }
}


/**
 * Get the effective contentEditable property of an element.
 *
 * @param  element {Element}
 * @return {boolean} whether content is editable "true" or not "false"
 */
function _isContentEditable(element) {
    if (element.contentEditable === undefined) {
        return false;
    }
    if ("inherit" !== element.contentEditable) {
        return ("true" === element.contentEditable);
    }

    let doc = element.ownerDocument;
    let effectiveStyle = doc.defaultView.getComputedStyle(element, null);
    let propertyValue = effectiveStyle.getPropertyValue("contentEditable");
    if ("inherit" === propertyValue && element.parentNode.style) {
        return _isContentEditable(element.parentNode);
    }
    return ("true" === propertyValue);
}


//----------------------------------------------------------------------------
// Event enqueueing methods
//----------------------------------------------------------------------------

/**
 * Place a content-changed event on the queue.
 *
 * @param name {String}
 *        the name of the field if present otherwise the id
 *
 * @param type {String}
 *        the type of the field (textarea|html|iframe)
 *
 * @param id {String}
 *        the id of the field if present otherwise the name
 *
 * @param formid {String}
 *        the id of the parent form of the field
 *
 * @param location {Location}
 *        the location of the page
 *
 * @param pagetitle {String}
 *        the title of the page
 *
 * @param node {Node}
 *        the node object representing the field
 */
function _enqueueContentEvent(name, type, id, formid, location, pagetitle, node) {
    let event = {
        eventType:  1,
        node:       node,
        type:       type,
        id:         id,
        name:       name,
        formid:     formid,
        url:        location.href,
        host:       _getHost(location),
        pagetitle:  pagetitle,
        incognito:  browser.extension.inIncognitoContext,
        last:       null,
        value:      null
    };
    if (!_alreadyQueued(event)) {
        eventQueue.push(event);
    }
    //console.log("[" + eventQueue.length + "] Enqueue event for " + event.type + " with id:" + event.formid + " on host " + event.host);
}

/**
 * Check whether the event is already placed on the queue.
 *
 * @param event {Object}
 *        a content or maintenance event
 */
function _alreadyQueued(event) {
    let e;
    for (let it=0; it<eventQueue.length; it++) {
        e = eventQueue[it];
        if (e.eventType === event.eventType && e.node === event.node) {
            return true;
        }
    }
    return false;
}

//setInterval(processEventQueue, 5000);
(function processEventQueueLoop(){
    setTimeout(function() {
        processEventQueue();
        processEventQueueLoop();
    }, updateInterval);
})();


//----------------------------------------------------------------------------
// Get / set preferences
//----------------------------------------------------------------------------

// init updateInterval
setPreferredUpdateInterval();

function setPreferredUpdateInterval() {
    _getUpdateIntervalPref().then(res=>{updateInterval = res;});
}

function _getUpdateIntervalPref() {
    const defaultValue = 5000;
    return new Promise((resolve, reject) => {
        browser.storage.local.get({prefUpdateInterval: defaultValue}).then(
            result => {
                resolve(result.prefUpdateInterval);
            },
            () => {
                resolve(defaultValue);
            }
        );
    });
}


//----------------------------------------------------------------------------
// Add event handlers
//----------------------------------------------------------------------------

function createDomObserver() {
    return new MutationObserver(mutations => {
        mutations.forEach((mutation) => {
            // console.log('Detected a mutation!  type = ' + mutation.type);
            if (mutation.type === 'attributes') {
                const targetElem = mutation.target;
                if ('style' === mutation.attributeName) {
                    // style changed
                    if (mutation.oldValue && mutation.oldValue.indexOf('display: none')!==-1 && targetElem.style.display !== 'none') {
                        // element style became visible, add event handler(s) that were not added previously because the element was invisible
                        // console.log('display changed for id:' + targetElem.id + " type:" + targetElem.tagName + " oldValue:" + mutation.oldValue);
                        addElementHandlers(targetElem);
                    }
                } else {
                    // attribute contenteditable or designMode changed
                    // console.log('Contenteditable changed ' + targetElem.nodeName  + '  editable = ' + _isContentEditable(targetElem) + '  designModeOn = ' +  _isDesignModeOn(targetElem));
                    targetElem.addEventListener("keyup", onContentChanged);
                }
            } else if (mutation.addedNodes) {
                mutation.addedNodes.forEach(elem => {
                    // console.log('element ' + elem.nodeName + ' has been added! ');
                    addElementHandlers(elem);
                });
            }
        });
    });
}

// instantiate an observer for adding event handlers to dynamically created DOM elements
function addBodyObserver(aDocument) {
    let body = aDocument.querySelector("body");
    if (body === null) {
        // probably a frameset, its use is deprecated
        body = aDocument.body;
    }
    createDomObserver().observe(
        body, {
            childList: true,
            attributes: true,
            attributeFilter: ['contenteditable','designMode','style'],
            attributeOldValue: true,
            subtree: true
        }
    );
}

function addHandler(aDocument, selector, eventType, aFunction) {
    aDocument.querySelectorAll(selector).forEach( (elem) => {
        // console.log("adding " + eventType + " handler to " + selector + "-element with elem-id: [" + elem.id + '] name: [' + elem.name + ']');
        elem.addEventListener(eventType, aFunction);
    });
}

function addElementHandlers(element) {
    switch(element.nodeName) {
        case 'INPUT':
            // console.log('add ev handlers to input id:' + element.id + ' type:' + element.nodeName);
            element.addEventListener('change', onContentChanged);
            element.addEventListener('paste', onContentChanged);
            break;
        case 'TEXTAREA':
            // console.log('add ev handlers to textarea id:' + element.id + ' type:' + element.nodeName);
            element.addEventListener("keyup", onContentChanged);
            element.addEventListener('paste', onContentChanged);
            break;
        case 'FORM':
            // console.log('add ev handlers to form id:' + element.id + ' type:' + element.nodeName);
            element.addEventListener('submit', onFormSubmit);
            if (element.hasChildNodes()) {
                Array.from(element.childNodes).forEach(elem => addElementHandlers(elem));
            }
            break;
        case 'IFRAME':
            const iframeDocument = element.contentDocument;
            if (iframeDocument) {
                if ('about:blank' === iframeDocument.URL) {
                    // initial blank content, wait for new source to load
                    element.addEventListener('load', (event) => {
                        const newIframeDocument = event.target.contentDocument;
                        // console.log('iframe was (re)loaded!!!!!' + newIframeDocument.URL);
                        addAllHandlers(newIframeDocument);
                    });
                }
                else {
                    // console.log('Dynamic iframe has been added! ' + element.className);
                    addAllHandlers(iframeDocument);
                }
                // else if (iframeDocument.readyState === 'uninitialized') {
                //     // console.log('Dynamic iframe (not yet loaded)! ' + element.className);
                //     const iframeWindow = element.contentWindow;
                //     iframeWindow.addEventListener('DOMContentLoaded', (event) => {
                //         console.log('iframe DOMContent loaded! ' + element.className);
                //         document.querySelectorAll("iframe").forEach( (iframe) => {
                //             const iframeDocument = iframe.contentDocument;
                //             addAllHandlers(iframeDocument);
                //         });
                //     });
                // } else {
                //     // console.log('Dynamic iframe has been added! ' + element.className);
                //     addAllHandlers(iframeDocument);
                // }
            }
            break;
        default:
            if (element.hasChildNodes()) {
                Array.from(element.childNodes).forEach(elem => addElementHandlers(elem));
            }
    }
}

function onContextMenuShow(evt) {
    // console.log("Showing menu...");
    let elem = evt.target;

    // menus API cannot be used from content scripts, send message to background script to manipulate the contextmenu
    // TODO if element is not input or textarea or div/iframe/... but for example p it can be some data inside a parent div which is contenteditable

    let nodeName = elem.nodeName.toLowerCase();
    let editable = true;
    // console.log("Showing menu for nodeName ", nodeName);

    if (nodeName !== 'input' && nodeName !== 'textarea') {
        // try to find find editable parent (for example we might have clicked on html content inside editable parent div)
        let prev = elem;
        while (elem && !((_isContentEditable(elem) && _isDisplayed(elem)) || _isDesignModeOn(elem))) {
            prev = elem;
            elem = elem.parentNode;
        }
        if (!elem) {
            elem = prev;
        }
        nodeName = elem.nodeName.toLowerCase();
        editable = ((_isContentEditable(elem) && _isDisplayed(elem)) || _isDesignModeOn(elem));
    }
    const fieldName = (elem.name) ? elem.name : ((elem.id) ? elem.id : "");
    let host
    if (elem.ownerDocument) {
        host = _getHost(elem.ownerDocument.location);
    } else {
        host = _getHost(elem.location);
    }

    browser.runtime.sendMessage( {
        eventType: 12345,
        nodeName: nodeName,
        fieldName: fieldName,
        host: host,
        editable: editable
    });
}

function addAllHandlers(aDocument) {
    if (aDocument && 'about:blank' !== aDocument.URL) {
        // console.log('addAllHandlers::document readystate: ' + aDocument.readyState + ' ' + aDocument.URL);
        aDocument.addEventListener('contextmenu', onContextMenuShow);

        aDocument.querySelector("html").addEventListener("keyup", onContentChanged);
        addHandler(aDocument, "form", "submit", onFormSubmit);
        addHandler(aDocument, "input", "change", onContentChanged);
        addHandler(aDocument, "input,textarea", "paste", onContentChanged);
        addBodyObserver(aDocument);
    }
}

addAllHandlers(document);

document.querySelectorAll("iframe").forEach( (iframe) => {
    // console.log('Existing iframe was added ' + iframe.className);
    const iframeDocument = iframe.contentDocument;
    addAllHandlers(iframeDocument);
});