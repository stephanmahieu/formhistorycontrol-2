/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

//import {DateUtil} from '../common/DateUtil.js';

'use strict';

browser.runtime.onMessage.addListener(fhcEvent=>{
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 808:
                // restore this window to default size and position
                browser.windows.getCurrent({populate: false}).then((window)=>{
                    WindowUtil.restoreToDefault(window.id, FHC_WINDOW_ENTRYVW);
                });
                break;
            case 888:
                if (fhcEvent.interfaceThemeChanged) {
                    // options have changed, reload
                    OptionsUtil.getInterfaceTheme().then(res => {
                        ThemeUtil.switchTheme(res);
                    });
                }
                break;
            case 666:
                browser.windows.getCurrent({populate: false}).then((window)=>{
                    WindowUtil.closePopupByID(window.id);
                });
                break;
        }
    }
});

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    populateView();
    document.getElementById("buttonClose").addEventListener("click", WindowUtil.closeThisPopup);
    document.getElementById("buttonCancel").addEventListener("click", WindowUtil.closeThisPopup);
    document.getElementById("buttonOkay").addEventListener("click", onOkayButton);

    document.getElementById("typeSelect").addEventListener("change", showHideFields);
    document.getElementById("url").addEventListener("keyup", updateHostvalue);

    document.getElementById("html-view").addEventListener("click", toggleHTMLView);
    document.getElementById("text-view").addEventListener("click", toggleTextView);
    document.getElementById("md-view").addEventListener("click", toggleMarkdownView);
    document.getElementById("wiki-view").addEventListener("click", toggleWikiView);

    document.getElementById("textWrapOverlayLabel").addEventListener("click", toggleTextWrap);

    // context menu
    document.querySelector("body").addEventListener("contextmenu", showContextMenu);
    document.querySelector("body").addEventListener("click", hideContextMenu);
    document.querySelectorAll(".context-menu-item").forEach(menuItem => {menuItem.addEventListener("click", onContextMenuItemClicked)});

    // key handler
    document.addEventListener("keyup", onKeyClicked);

    // initially hide all previews
    document.querySelectorAll('.viewOverlay ').forEach(view => {
        view.style.display = "none";
    });
    document.querySelectorAll('.viewOverlayLabel ').forEach(lbl => {
        lbl.style.display = "none";
    });

    // no event available for window move, check periodically
    setInterval(function() {WindowUtil.checkAndSaveCurrentWindowPosition(FHC_WINDOW_ENTRYVW);}, 5*1000);
});

let resizeTimer;
window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        // resizing has stopped
        WindowUtil.saveWindowPrefs(FHC_WINDOW_ENTRYVW);
    }, 250);
});

function hideContextMenu(event) {
    WindowUtil.hideContextMenu(event);
}

function showContextMenu(event) {
    WindowUtil.showContextMenu(event, 'body');
}

function onContextMenuItemClicked(event) {
    switch(event.target.id) {
        case 'copy2clipboardText-ctx':
            copyToClipboardText();
            break;

        case 'copy2clipboardAll-ctx':
            copyToClipboardAll();
            break;
    }
}

function onTextInputDoubleClicked(event) {
    // parent td element was clicked, get the text input value
    const inputElm = event.currentTarget.querySelector('input');
    if (inputElm.value) {
        MiscUtil.copyTextToClipboard(inputElm.value);
        WindowUtil.showModalInformation({titleId:'dialogInformationTitle', msgId:'informClipboardValueCopied'});
    }
}

function onTextareaInputDoubleClicked(event) {
    // parent td element was clicked, get the textarea input value
    const inputElm = event.currentTarget.querySelector('textarea');
    if (inputElm.value) {
        MiscUtil.copyTextToClipboard(inputElm.value);
        WindowUtil.showModalInformation({titleId:'dialogInformationTitle', msgId:'informClipboardValueCopied'});
    }
}

function onKeyClicked(event) {
    const keyCode = event.code;

    if (keyCode === 'Escape') {
        if (WindowUtil.isModalDialogActive()) {
            WindowUtil.doCancelModalDialog();
        } else if (isPreviewActive('html')) {
            togglePreviewCheckbox('html');
        } else if (isPreviewActive('text')) {
            togglePreviewCheckbox('text');
        } else if (isPreviewActive('md')) {
            togglePreviewCheckbox('md');
        } else {
            WindowUtil.closeThisPopup();
        }
    }

    // Ctrl+C Copy all
    if (!event.altKey && event.ctrlKey && !event.shiftKey && keyCode === 'KeyC') {
        if (!window.getSelection()) {
            event.preventDefault();
            copyToClipboardAll();
        }
    }

    // Shift+Ctrl+C Copy without formatting
    if (!event.altKey && event.ctrlKey && event.shiftKey && keyCode === 'KeyC') {
        event.preventDefault();
        copyToClipboardText();
    }
}

function copyToClipboardText() {
    const input = getInputElement();
    const cleanContent = WindowUtil.htmlToReadableText(input.value);
    MiscUtil.copyTextToClipboard(cleanContent);
}

function copyToClipboardAll() {
    const input = getInputElement();
    MiscUtil.copyTextToClipboard(input.value);
}

function getInputElement() {
    const type = document.getElementById("typeSelect").value;
    const inputId = (type === 'input') ? 'value' : 'multiline-value';
    return document.getElementById(inputId);
}

function onOkayButton() {
    // validate
    let newType = document.getElementById('typeSelect').value;

    switch (objEntryData.doWhat) {
        case 'add':
            // fields non-empty
            const checkFields = ['name','typeSelect','used','first','last'];
            let valueFieldId = newType==='input' ? 'value' : 'multiline-value';
            checkFields.push(valueFieldId);
            if (newType !== 'input') {
                checkFields.push('url');
            }
            if (!validateRequiredFields(checkFields)) {
                WindowUtil.showModalWarning({titleId:'dialogWarningTitle', msgId:'validationErrorMissingRequired'});
                return;
            }
            if (!validateNumeric('used')) {
                WindowUtil.showModalWarning({titleId:'dialogWarningTitle', msgId:'validationErrorNotNumeric'});
                return;
            }
            if (!validateDates()) {
                WindowUtil.showModalWarning({titleId:'dialogWarningTitle', msgId:'validationErrorLastBeforeFirst'});
                return;
            }
            if (newType !== 'input' && !validateURL('url')) {
                WindowUtil.showModalWarning({titleId:'dialogWarningTitle', msgId:'validationErrorInvalidURL'});
                return;
            }
            setNewValuesToObjEntryData();
            storeEntry(11);
            WindowUtil.closeThisPopup();
            break;

        case 'edit':
            if (!objEntryData.isMultiple) {
                // fields non-empty
                const checkFields = ['name','typeSelect','used','first','last'];
                let valueFieldId = newType==='input' ? 'value' : 'multiline-value';
                checkFields.push(valueFieldId);
                if (newType !== 'input') {
                    checkFields.push('url');
                }
                if (!validateRequiredFields(checkFields)) {
                    WindowUtil.showModalWarning({titleId:'dialogWarningTitle', msgId:'validationErrorMissingRequired'});
                    return;
                }
                if (!validateNumeric('used')) {
                    WindowUtil.showModalWarning({titleId:'dialogWarningTitle', msgId:'validationErrorNotNumeric'});
                    return;
                }
                if (!validateDates()) {
                    WindowUtil.showModalWarning({titleId:'dialogWarningTitle', msgId:'validationErrorLastBeforeFirst'});
                    return;
                }
                if (newType !== 'input' && !validateURL('url')) {
                    WindowUtil.showModalWarning({titleId:'dialogWarningTitle', msgId:'validationErrorInvalidURL'});
                    return;
                }
                setNewValuesToObjEntryData();
                storeEntry(6);
            } else {
                if (!validateAtLeastOneField(['used','first','last'])) {
                    WindowUtil.showModalWarning({titleId:'dialogWarningTitle', msgId:'validationErrorAtLastOneField'});
                    return;
                }
                if (!validateNumeric('used')) {
                    WindowUtil.showModalWarning({titleId:'dialogWarningTitle', msgId:'validationErrorNotNumeric'});
                    return;
                }
                if (!validateDates()) {
                    WindowUtil.showModalWarning({titleId:'dialogWarningTitle', msgId:'validationErrorLastBeforeFirst'});
                    return;
                }
                setNewValuesToObjEntryData();
                storeModifiedEntries();
            }
            WindowUtil.closeThisPopup();
            break;
    }
}

function populateView() {
    // console.log("Populating view using local storage");
    let gettingData = browser.storage.local.get("entryObject");
    gettingData.then(onDataRetrieved, onDataRetrieveError);
}

let objEntryData;
function onDataRetrieved(data) {
    // console.log("Data retrieved", data);

    let removingData = browser.storage.local.remove("entryObject");
    removingData.then(onDataRemoved, onDataRemoveError);

    objEntryData = {
        doWhat: data.entryObject.doWhat,
        multiKeys: data.entryObject.multiKeys,
        primaryKey: data.entryObject.primaryKey,
        name: data.entryObject.name,
        value: data.entryObject.value,
        type: data.entryObject.type,
        used: data.entryObject.used,
        first: data.entryObject.first,
        last: data.entryObject.last,
        url: data.entryObject.url,
        host: data.entryObject.host,
        isMultiple: (data.entryObject.multiKeys.length > 1)
    };

    document.getElementById('operationInfo').innerText = getOperationInfo(objEntryData.doWhat, objEntryData.isMultiple);

    if (objEntryData.doWhat === "view" || (objEntryData.doWhat === "edit" && !objEntryData.isMultiple)) {
        document.getElementById('name').value = objEntryData.name;
        document.getElementById('typeSelect').value = objEntryData.type;
        document.getElementById('used').value = objEntryData.used;
        document.getElementById('first').value = DateUtil.toISOdateString(objEntryData.first);
        document.getElementById('last').value = DateUtil.toISOdateString(objEntryData.last);

        if (objEntryData.type === 'input') {
            document.getElementById('value').value = objEntryData.value;
        } else {
            document.getElementById('url').value = objEntryData.url;
            document.getElementById('host').value = objEntryData.host;
            document.getElementById('multiline-value').value = objEntryData.value;
        }
    }
    if (objEntryData.doWhat === "add") {
        // populate with defaults
        objEntryData.used = 1;
        objEntryData.first = objEntryData.last = DateUtil.getCurrentDate();
        document.getElementById('used').value = '1';
        document.getElementById('first').value = DateUtil.toISOdateString(objEntryData.first);
        document.getElementById('last').value = DateUtil.toISOdateString(objEntryData.last);
    }

    if (objEntryData.doWhat === "edit" || objEntryData.doWhat === "add") {
        // enable fields
        if (!objEntryData.isMultiple) {
            document.getElementById('name').removeAttribute('disabled');
            document.getElementById('value').removeAttribute('disabled');
            document.getElementById('multiline-value').removeAttribute('disabled');
            document.getElementById('typeSelect').removeAttribute('disabled');
        }

        document.getElementById('used').removeAttribute('disabled');
        document.getElementById('first').removeAttribute('disabled');
        document.getElementById('last').removeAttribute('disabled');
        document.querySelectorAll(".dateTimeEdit").forEach(dte => {
            dte.style.display = 'inline-block';
            dte.addEventListener("click", showModalDatetimeDialog)
        });

        document.getElementById('url').removeAttribute('disabled');
    }

    showHideFields();

    if (objEntryData.doWhat !== "view") {
        document.getElementById('buttonClose').style.display = 'none';
        document.getElementById('buttonOkay').style.display = 'block';
        document.getElementById('buttonCancel').style.display = 'block';
    }
    else {
        // double click handler input fields (copy content to clipboard)
        document.querySelectorAll("input[type=text],input[type=datetime-local]").forEach(textInput => {
            textInput.parentElement.addEventListener("dblclick", onTextInputDoubleClicked)
        });
        document.querySelectorAll("textarea").forEach(textInput => {
            textInput.parentElement.addEventListener("dblclick", onTextareaInputDoubleClicked)
        });
        // show info: double-click is available
        document.querySelectorAll(".infoFieldCopy").forEach(infoElm => {
            infoElm.style.display = 'inline-block'
        });
    }
}

function updateHostvalue() {
    const urlValue = document.getElementById('url').value;
    const host = (urlValue) ? MiscUtil.getHostnameFromUrlString(urlValue) : '';
    document.getElementById('host').value = host;
}

function showHideFields() {
    const type = document.getElementById("typeSelect").value;
    if (type === 'input') {
        document.getElementById('value').style.display = '';
        document.getElementById('multiline-value').style.display = 'none';
        document.getElementById('urlRow').style.display = 'none';
        document.getElementById('hostRow').style.display = 'none';
        if (document.getElementById('value').value === '') {
            swapValues('value', 'multiline-value');
        }
        document.getElementById('togglePreview').style.display = 'none';
    } else {
        if (document.getElementById('value').value !== '') {
            swapValues('value', 'multiline-value');
        }
        document.getElementById('value').style.display = 'none';
        document.getElementById('multiline-value').style.display = '';
        document.getElementById('urlRow').style.display = '';
        document.getElementById('hostRow').style.display = '';
        document.getElementById('togglePreview').style.display = '';
    }
}

function togglePreviewCheckbox(prefix) {
    document.getElementById(prefix + "-view").click();
}

function hidePreview(prefix) {
    if (isPreviewActive(prefix)) {
        const overlayLabel = document.getElementById(prefix + 'ViewOverlayLabel');
        const htmlOverlay = document.getElementById(prefix + 'ViewOverlay');
        const wrapLabel = document.getElementById('textWrapOverlayLabel');
        wrapLabel.style.display = overlayLabel.style.display = htmlOverlay.style.display = 'none';
        document.getElementById(prefix + "-view").checked = false;
        _removeChildren(htmlOverlay);
    }
}

function isPreviewActive(prefix) {
    return (document.getElementById(prefix + '-view').checked);
}

function toggleHTMLView(event) {
    hidePreview('text');
    hidePreview('md');
    hidePreview('wiki');
    const checkbox = event.target;
    const htmlOverlay = document.getElementById('htmlViewOverlay');
    const overlayLabel = document.getElementById('htmlViewOverlayLabel');
    const wrapLabel = document.getElementById('textWrapOverlayLabel');
    if (checkbox.checked) {
        // show HTML overlay
        _removeChildren(htmlOverlay);
        const value = document.getElementById('multiline-value').value;
        // use DOMPurify renderer (sanitized)
        htmlOverlay.appendChild(DOMPurify.sanitize(value, {RETURN_DOM_FRAGMENT: true, RETURN_DOM_IMPORT: true}));
        overlayLabel.style.display = htmlOverlay.style.display = '';
        wrapLabel.style.display = 'none';
    } else {
        // remove overlay
        overlayLabel.style.display = htmlOverlay.style.display = 'none';
        _removeChildren(htmlOverlay);
    }
}

function toggleTextView(event) {
    hidePreview('html');
    hidePreview('md');
    hidePreview('wiki');
    const checkbox = event.target;
    const textOverlay = document.getElementById('textViewOverlay');
    const overlayLabel = document.getElementById('textViewOverlayLabel');
    const wrapLabel = document.getElementById('textWrapOverlayLabel');
    if (checkbox.checked) {
        // show TEXT overlay
        _removeChildren(textOverlay);
        const value = document.getElementById('multiline-value').value;
        const preElement = document.createElement('pre');
        preElement.appendChild(document.createTextNode(value));
        textOverlay.appendChild(preElement);
        wrapLabel.style.display = overlayLabel.style.display = textOverlay.style.display = '';
        if (wrapLabel.classList.contains('wrap-active')) {
            preElement.classList.add('linewrap');
        }
    } else {
        // remove overlay
        wrapLabel.style.display = overlayLabel.style.display = textOverlay.style.display = 'none';
        _removeChildren(textOverlay);
    }
}

function toggleTextWrap(event) {
    const preElement = document.querySelector('#textViewOverlay > pre');
    const wrapLabel = document.getElementById('textWrapOverlayLabel');
    if (preElement.classList.contains('linewrap')) {
        preElement.classList.remove('linewrap');
        wrapLabel.classList.remove('wrap-active');
    } else {
        preElement.classList.add('linewrap');
        wrapLabel.classList.add('wrap-active');
    }
}

function toggleMarkdownView(event) {
    hidePreview('html');
    hidePreview('text');
    hidePreview('wiki');
    const checkbox = event.target;
    const mdOverlay = document.getElementById('mdViewOverlay');
    const overlayLabel = document.getElementById('mdViewOverlayLabel');
    const wrapLabel = document.getElementById('textWrapOverlayLabel');
    if (checkbox.checked) {
        // show Markdown overlay
        _removeChildren(mdOverlay);
        // use marked renderer (sanitize: true)
        marked.use({
            gfm: true,
            breaks: true
        });
        const value = marked.parse(document.getElementById('multiline-value').value);
        mdOverlay.appendChild(DOMPurify.sanitize(value, {RETURN_DOM_FRAGMENT: true, RETURN_DOM_IMPORT: true}));
        overlayLabel.style.display = mdOverlay.style.display = '';
        wrapLabel.style.display = 'none';
    } else {
        // remove overlay
        overlayLabel.style.display = mdOverlay.style.display = 'none';
        _removeChildren(mdOverlay);
    }
}

function toggleWikiView(event) {
    hidePreview('html');
    hidePreview('text');
    hidePreview('md');
    const checkbox = event.target;
    const wikiOverlay = document.getElementById('wikiViewOverlay');
    const overlayLabel = document.getElementById('wikiViewOverlayLabel');
    const wrapLabel = document.getElementById('textWrapOverlayLabel');
    if (checkbox.checked) {
        // show Markdown overlay
        _removeChildren(wikiOverlay);
        // use wiki renderer
        const value = wiky.process(document.getElementById('multiline-value').value);
        wikiOverlay.appendChild(DOMPurify.sanitize(value, {RETURN_DOM_FRAGMENT: true, RETURN_DOM_IMPORT: true}));
        overlayLabel.style.display = wikiOverlay.style.display = '';
        wrapLabel.style.display = 'none';
    } else {
        // remove overlay
        overlayLabel.style.display = wikiOverlay.style.display = 'none';
        _removeChildren(wikiOverlay);
    }
}

function _removeChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function swapValues(elmIdA, elmIdB) {
    const tmpValA = document.getElementById(elmIdA).value;
    document.getElementById(elmIdA).value = document.getElementById(elmIdB).value;
    document.getElementById(elmIdB).value = tmpValA;
}

function getOperationInfo(doWhat, multiple) {
    let operationInfoId = '';
    switch (doWhat) {
        case 'view':
            operationInfoId = 'operationViewField';
            break;
        case 'add':
            operationInfoId = 'operationAddField';
            break;
        case 'edit':
            operationInfoId = multiple ? 'operationEditMultipleFields' : 'operationEditOneField';
            break;
    }
    return operationInfoId ? browser.i18n.getMessage(operationInfoId) : '';
}

function validateRequiredFields(fieldIds) {
    let isOkay = true;
    fieldIds.forEach(id => {
        let elem = document.getElementById(id);
        if (!elem.value) {
            elem.classList.add('invalid-value');
            isOkay = false;
        } else {
            elem.classList.remove('invalid-value');
        }
    });
    return isOkay;
}

function validateAtLeastOneField(fieldIds) {
    let isOkay = false;
    fieldIds.forEach(id => {
        if (document.getElementById(id).value) {
            isOkay = true;
        }
    });
    return isOkay;
}

function validateNumeric(fieldId) {
    const value = document.getElementById(fieldId).value;
    if (value && isNaN(value)) {
        document.getElementById(fieldId).classList.add('invalid-value');
        return false;
    }
    return true;
}

function validateURL(fieldId) {
    const urlValue = document.getElementById(fieldId).value;
    if (urlValue.toLowerCase().startsWith('file:')) {
        return true;
    }
    const urlRegex = new RegExp(REGEX_WEB_URL,"i");
    if (!urlRegex.test(urlValue)) {
        document.getElementById(fieldId).classList.add('invalid-value');
        return false;
    }
    return true;
}

function validateDates() {
    let isOkay = true;
    // last >= first
    let first = DateUtil.fromISOdateString(document.getElementById('first').value);
    let last = DateUtil.fromISOdateString(document.getElementById('last').value);
    if (first && last && last < first) {
        document.getElementById('last').classList.add('invalid-value');
        isOkay = false;
    }
    return isOkay;
}


function onDataRemoved() {
    // console.log('Data removed');
}
function onDataRetrieveError(error) {
    console.error(`Error retrieving data from local storage: ${error}`);
}
function onDataRemoveError(error) {
    console.warn(`Error removing data from local storage: ${error}`);
}


/**
 * Send entry to the background handler for adding or changing into the datastore.
 */
function storeEntry(eventType) {
    browser.runtime.sendMessage({
        eventType : eventType,
        primaryKey: objEntryData.primaryKey,
        type      : objEntryData.type,
        name      : objEntryData.name,
        value     : JSON.stringify(objEntryData.value),
        host      : objEntryData.host,
        url       : objEntryData.url,
        pagetitle : "",
        used      : objEntryData.used,
        first     : objEntryData.first,
        last      : objEntryData.last,
        id        : ''
    });
}

function storeModifiedEntries() {
    browser.runtime.sendMessage({
        eventType: 5,
        multiKeys: objEntryData.multiKeys,
        used     : objEntryData.used,
        first    : objEntryData.first,
        last     : objEntryData.last
    });
}

function setNewValuesToObjEntryData() {
    let value;
    let url = '';
    if (document.getElementById('typeSelect').value === 'input') {
       value = document.getElementById('value').value;
    } else {
        value = document.getElementById('multiline-value').value;
        url = document.getElementById('url').value;
    }
    let host = (url) ? MiscUtil.getHostnameFromUrlString(url) : '';
    let used = (document.getElementById('used').value !== '') ? parseInt(document.getElementById('used').value) : undefined;
    let first = (document.getElementById('first').value !== '') ?  DateUtil.fromISOdateString(document.getElementById('first').value) : undefined;
    let last = (document.getElementById('last').value !== '') ?  DateUtil.fromISOdateString(document.getElementById('last').value) : undefined;

    objEntryData.name = document.getElementById('name').value;
    objEntryData.value = value;
    objEntryData.type = document.getElementById('typeSelect').value;
    objEntryData.used = used;
    objEntryData.first = first;
    objEntryData.last = last;
    objEntryData.host = host;
    objEntryData.url = url;
}

/**
 * Regular Expression for URL validation
 *
 * Author: Diego Perini
 * Updated: 2010/12/05
 * License: MIT
 *
 * Copyright (c) 2010-2013 Diego Perini (http://www.iport.it)
*/
const REGEX_WEB_URL = new RegExp(
    "^" +
    // protocol identifier
    "(?:(?:https?|ftp)://)" +
    // user:pass authentication
    "(?:\\S+(?::\\S*)?@)?" +
    "(?:" +
    // IP address exclusion
    // private & local networks
    "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
    "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
    "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
    // IP address dotted notation octets
    // excludes loopback network 0.0.0.0
    // excludes reserved space >= 224.0.0.0
    // excludes network & broacast addresses
    // (first & last IP address of each class)
    "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
    "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
    "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
    "|" +
    // host name
    "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
    // domain name
    "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
    // TLD identifier
    "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
    // TLD may end with dot
    "\\.?" +
    ")" +
    // port number
    "(?::\\d{2,5})?" +
    // resource path
    "(?:[/?#]\\S*)?" +
    "$", "i"
);