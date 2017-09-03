'use strict';

let eventQueue = [];

browser.runtime.onMessage.addListener(receiveEvents);

function receiveEvents(fhcActionEvent) {
    if (fhcActionEvent.action) {
        switch (fhcActionEvent.action) {

            case "fillMostRecent":
            case "fillMostUsed":
            case "clearFields":
                console.log("Received action event " + fhcActionEvent.action);
                _fillformfields(fhcActionEvent.action, fhcActionEvent.targetTabId);
                break;

            case "formfieldValueResponse":
                console.log("Received action event " + fhcActionEvent.action);
                _findFieldAndSetValue(fhcActionEvent);
                break;
        }
    }
}

//----------------------------------------------------------------------------
// fill formfields response handling methods
//----------------------------------------------------------------------------

function _findFieldAndSetValue(fhcEvent) {
    let field = null;
    [].forEach.call( document.querySelectorAll("input,textarea"), function(elem) {
        if (_isTextInputSubtype(elem.type) && _isDisplayed(elem)) {
            if (!field) {
                field = _ifMatchSetValue(elem, fhcEvent);
            }
        }
    });

    [].forEach.call( document.querySelectorAll("html,div,iframe,body"), function(elem) {
        if ((_isContentEditable(elem) && _isDisplayed(elem)) || _isDesignModeOn(elem)) {
            if (!field) {
                field = _ifMatchSetValue(elem, fhcEvent);
            }
        }
    });
}

function _ifMatchSetValue(node, fhcEvent) {
    let type = node.nodeName.toLowerCase();
    //let location = node.ownerDocument.location;
    //let pagetitle = node.ownerDocument.title;
    let formid = "";
    let id = (node.id) ? node.id : ((node.name) ? node.name : "");
    //let name = (node.name) ? node.name : ((node.id) ? node.id : "");

    switch(type) {
        case "textarea":
        case "input":
            // if id is empty, ditch it, it can never be used for restore
            if (id === "") return;
            formid = _getFormId(node);
            break;
        case "html":
        case "div":
        case "iframe":
            // noop
            break;
    }

    // TODO test if additional properties are equal???
    if (fhcEvent.type === type && fhcEvent.id === id) {

        // TODO only set a new value when the current value is empty?
        // we have found a match, set the new value
        switch(type) {
            case "textarea":
            case "input":
                // TODO is json stringified?
                node.value = fhcEvent.value;
                break;
            case "html":
            case "div":
            case "iframe":
                node.innerHTML = fhcEvent.value;
                break;
        }
        return node;
    }
    return null;
}


//----------------------------------------------------------------------------
// fill formfields request handling methods
//----------------------------------------------------------------------------

function _fillformfields(action, targetTabId) {
    [].forEach.call( document.querySelectorAll("input,textarea"), function(elem) {
        if (_isTextInputSubtype(elem.type) && _isDisplayed(elem)) {
            console.log("requesting content for elem-id: " + elem.id);
            _requestHistoricValue(elem, action, targetTabId);
        }
    });

    [].forEach.call( document.querySelectorAll("html,div,iframe,body"), function(elem) {
        if ((_isContentEditable(elem) && _isDisplayed(elem)) || _isDesignModeOn(elem)) {
            console.log("requesting content for elem-id: " + elem.id);
            _requestHistoricValue(elem, action, targetTabId);
        }
    });
}

function _requestHistoricValue(node, action, targetTabId) {
    let type = node.nodeName.toLowerCase();
    let location = node.ownerDocument.location;
    let pagetitle = node.ownerDocument.title;
    let formid = "";
    let id = (node.id) ? node.id : ((node.name) ? node.name : "");
    let name = (node.name) ? node.name : ((node.id) ? node.id : "");
    switch(type) {
        case "textarea":
        case "input":
            // if id is empty, ditch it, it can never be used for restore
            if (id === "") return;
            formid = _getFormId(node);
            break;
        case "html":
        case "div":
        case "iframe":
            // noop
            break;
    }

    let dataRetrievalEvent = _createHistoricValueRetrievalEvent(name, type, id, formid, location, pagetitle, action, targetTabId);
    browser.runtime.sendMessage(dataRetrievalEvent);
}

function _createHistoricValueRetrievalEvent(name, type, id, formid, location, pagetitle, action, targetTabId) {
    return {
        eventType:   3,
        node:        null,
        type:        type,
        id:          id,
        name:        name,
        formid:      formid,
        url:         location.href,
        host:        _getHost(location),
        pagetitle:   pagetitle,
        value:       null,
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
    if (theContent.length > 0)  {
        event.value = JSON.stringify(theContent);
        event.node = null;

        //console.log("Send content-event for " + event.id + " to background-script: " + event.content);
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
                        eventType: 2,
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
                        eventType: 2,
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
                                eventType: 2,
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

        for (let i=0; i < allFormElements.length; i++) {
            // send immediately because submitting will reload the page and the background-connection will be lost
            _processFormElementEvent(allFormElements[i]);
        }
    }
    //console.log("collectFormData::onFormSubmit done.");
}

function onContentChanged(event) {
    let t = event.originalTarget;
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
        let e = doc.activeElement;
        if (("on" === doc.designMode) || _isContentEditable(e)) {
            //console.log("content is editable");
            _contentChangedHandler("body" === n ? "iframe" : "div", e);
        }
    }
}

function _contentChangedHandler(type, node) {
    let location = node.ownerDocument.location;
    let pagetitle = node.ownerDocument.title;
    let formid = "";
    let id = (node.id) ? node.id : ((node.name) ? node.name : "");
    let name = (node.name) ? node.name : ((node.id) ? node.id : "");
    switch(type) {
        case "textarea":
        case "input":
             // if id is empty, ditch it, it can never be used for restore
             if (id === "") return;
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

function _isTextInputSubtype(type) {
    // exclude "password", never save those!
    // also exclude number, range and color
    // and exclude the not fully supported: date, datetime-local, month, time, week
    return ("text" === type || "search" === type || "tel" === type || "url" === type || "email" === type);
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
 * @return {boolean} wether content is editable "true" or not "false"
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



// function addiframeEventListeners(aDocument) {
//     var iframes = aDocument.querySelectorAll('iframe');
//     for (var i = 0; i < iframes.length; i++) {
//         var iframeDocument = iframes[i].contentDocument;
//         if (iframeDocument) {
//             console.log("Add EventListener to iframe with id: " + iframes[i].id);
//             iframeDocument.addEventListener("keyup", onContentChanged);
//
//             // handle embedded iframes
//             //iframeDocument.addEventListener("DOMContentLoaded", function() {
//             //    addiframeEventListeners(iframeDocument);
//             //});
//         }
//     }
// }


function addHandler(selector, eventType, aFunction) {
    [].forEach.call( document.querySelectorAll(selector), function(elem) {
        //console.log("adding " + eventType + " handler to " + selector + "-event for elem-id: " + elem.id);
        elem.addEventListener(eventType, aFunction);
    });
}

document.querySelector("html").addEventListener("keyup", onContentChanged);
addHandler("form", "submit", onFormSubmit);
addHandler("input", "change", onContentChanged);
addHandler("input,textarea", "paste", onContentChanged);

setInterval(processEventQueue, 5000);