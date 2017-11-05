/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

//import {DateUtil} from '../common/DateUtil.js';
//import {XmlUtil}  from '../common/XmlUtil.js';

'use strict';

browser.runtime.onMessage.addListener(fhcEvent=>{
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 888:
                // options have changed, reload
                OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});
                break;
            case 666:
                browser.windows.getCurrent({populate: false, windowTypes: ["popup"]}).then((window)=>{
                    WindowUtil.closePopupByID(window.id);
                });
                break;
        }
    }
});

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    // make sure the popup overlay is hidden
    document.getElementById('datetimeOverlay').style.display = 'none';

    populateView();
    document.getElementById("buttonClose").addEventListener("click", WindowUtil.closeThisPopup);
    document.getElementById("buttonCancel").addEventListener("click", WindowUtil.closeThisPopup);
    document.getElementById("buttonOkay").addEventListener("click", onOkayButton);

    document.getElementById("buttonTimeOkay").addEventListener("click", onDatetimeOkayButton);
    document.getElementById("buttonTimeCancel").addEventListener("click", onDatetimeAbort);
    document.getElementById("buttonTimeClose").addEventListener("click", onDatetimeAbort);
    document.getElementById("btnNowdate").addEventListener("click", onDatetimeNowdate);
    document.getElementById("btnErase").addEventListener("click", onDatetimeErase);

    document.getElementById("typeSelect").addEventListener("change", showHideFields);
    document.getElementById("url").addEventListener("keyup", updateHostvalue);

    // tooltips
    document.getElementById("btnNowdate").setAttribute('title', browser.i18n.getMessage('tooltipNowDatetimeButton'));
    document.getElementById("btnErase").setAttribute('title', browser.i18n.getMessage('tooltipEraseDatetimeButton'));
});

function onOkayButton() {
    // validate
    let newName = document.getElementById('name').value;
    let newValue = document.getElementById('value').value;
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
                WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorMissingRequired');
                return;
            }
            if (!validateNumeric('used')) {
                WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorNotNumeric');
                return;
            }
            if (!validateDates()) {
                WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorLastBeforeFirst');
                return;
            }
            if (!validateURL('url')) {
                WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorInvalidURL');
                return;
            }
            setNewValuesToObjEntryData();
            storeEntry(1);
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
                    WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorMissingRequired');
                    return;
                }
                if (!validateNumeric('used')) {
                    WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorNotNumeric');
                    return;
                }
                if (!validateDates()) {
                    WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorLastBeforeFirst');
                    return;
                }
                if (!validateURL('url')) {
                    WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorInvalidURL');
                    return;
                }
                setNewValuesToObjEntryData();
                storeEntry(6);
            } else {
                if (!validateAtLeastOneField(['used','first','last'])) {
                    WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorAtLastOneField');
                    return;
                }
                if (!validateNumeric('used')) {
                    WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorNotNumeric');
                    return;
                }
                if (!validateDates()) {
                    WindowUtil.showModalWarning('dialogWarningTitle', 'validationErrorLastBeforeFirst');
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
        document.getElementById('value').value = objEntryData.value;
        document.getElementById('typeSelect').value = objEntryData.type;
        document.getElementById('used').value = objEntryData.used;
        document.getElementById('first').value = DateUtil.dateToDateString(new Date(objEntryData.first));
        document.getElementById('first').setAttribute('data-time', objEntryData.first);
        document.getElementById('last').value = DateUtil.dateToDateString(new Date(objEntryData.last));
        document.getElementById('last').setAttribute('data-time', objEntryData.last);
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
        document.getElementById('first').value = DateUtil.dateToDateString(new Date(objEntryData.first));
        document.getElementById('first').setAttribute('data-time', objEntryData.first);
        document.getElementById('last').value = DateUtil.dateToDateString(new Date(objEntryData.last));
        document.getElementById('last').setAttribute('data-time', objEntryData.last);
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
        document.getElementById('first').addEventListener('focus', showModalDatetimeDialog);
        document.getElementById('last').addEventListener('focus', showModalDatetimeDialog);
        populateDatetimeSelect();

        document.getElementById('url').removeAttribute('disabled');
    }

    showHideFields();

    if (objEntryData.doWhat !== "view") {
        document.getElementById('buttonClose').style.display = 'none';
        document.getElementById('buttonOkay').style.display = 'block';
        document.getElementById('buttonCancel').style.display = 'block';
    }
}

function updateHostvalue() {
    const urlValue = document.getElementById('url').value;
    const host = (urlValue) ? getHostnameFromUrlString(urlValue) : '';
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
    } else {
        if (document.getElementById('value').value !== '') {
            swapValues('value', 'multiline-value');
        }
        document.getElementById('value').style.display = 'none';
        document.getElementById('multiline-value').style.display = '';
        document.getElementById('urlRow').style.display = '';
        document.getElementById('hostRow').style.display = '';
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

function showModalDatetimeDialog(event) {
    let elemId = event.target.id;
    document.getElementById('modalTitle').setAttribute('data-which', elemId);
    let i18nTitle = (elemId === 'first') ? 'fieldFirstUsed' : 'fieldLastUsed';
    document.getElementById('modalTitle').firstChild.nodeValue = browser.i18n.getMessage(i18nTitle);

    let time = parseInt(document.getElementById(elemId).getAttribute('data-time'));
    let date;
    if (time) {
        date = new Date(time);
    } else {
        date = new Date();
    }
    setDatetimeDialog(date);

    document.getElementById('datetimeOverlay').style.display = 'block';
}

function onDatetimeAbort() {
    document.getElementById('datetimeOverlay').style.display = 'none';
}

function onDatetimeNowdate() {
    setDatetimeDialog(new Date());
}

function onDatetimeErase() {
    eraseDatetimeDialog();
}

function onDatetimeOkayButton() {
    let elemId = document.getElementById('modalTitle').getAttribute('data-which');

    let date = new Date();

    let year = document.getElementById('year').value;
    let month = document.getElementById('month').value;
    let day = document.getElementById('day').value;

    if (year && month && day) {
        date.setFullYear(document.getElementById('year').value);
        date.setMonth(document.getElementById('month').value - 1);
        date.setDate(document.getElementById('day').value);

        let hour = document.getElementById('hour').value;
        let minute = document.getElementById('minute').value;
        let seconds = document.getElementById('second').value;
        hour = 0 || hour;
        minute = 0 || minute;
        seconds = 0 || seconds;
        date.setHours(hour);
        date.setMinutes(minute);
        date.setSeconds(seconds);

        document.getElementById(elemId).value = DateUtil.dateToDateString(date);
        document.getElementById(elemId).setAttribute('data-time', ''+date.getTime());
    } else {
        date = null;
        document.getElementById(elemId).value = '';
        document.getElementById(elemId).setAttribute('data-time', '');
    }

    document.getElementById('datetimeOverlay').style.display = 'none';
}

function setDatetimeDialog(date) {
    document.getElementById('year').value = date.getFullYear();
    document.getElementById('month').value = leftpadZero(date.getMonth()+1,2);
    document.getElementById('day').value = leftpadZero(date.getDate(),2);
    document.getElementById('hour').value = leftpadZero(date.getHours(),2);
    document.getElementById('minute').value = leftpadZero(date.getMinutes(),2);
    document.getElementById('second').value = leftpadZero(date.getSeconds(),2);
}

function eraseDatetimeDialog() {
    document.getElementById('year').value = '';
    document.getElementById('month').value = '';
    document.getElementById('day').value = '';
    document.getElementById('hour').value = '';
    document.getElementById('minute').value = '';
    document.getElementById('second').value = '';
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
    let first = parseInt(document.getElementById('first').getAttribute('data-time'));
    let last = parseInt(document.getElementById('last').getAttribute('data-time'));
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

function populateDatetimeSelect() {
    populateSelect('month', 1, 12);
    populateSelect('day', 1, 31);
}

function populateSelect(target, min, max){
    const select = document.getElementById(target);

    let optEmpty = document.createElement('option');
    optEmpty.value = '';
    optEmpty.innerText = '-';
    select.appendChild(optEmpty);

    for (let i = min; i<=max; i++) {
        let opt = document.createElement('option');
        let val = leftpadZero(i,2);
        opt.value = val;
        opt.innerText = val;
        select.appendChild(opt);
    }
}
function leftpadZero(aValue, maxLength) {
    let result = "" + aValue;
    while (result.length < maxLength) {
        result = "0" + result;
    }
    return result;
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
    let host = '';
    if (document.getElementById('typeSelect').value === 'input') {
       value = document.getElementById('value').value;
    } else {
        value = document.getElementById('multiline-value').value;
        url = document.getElementById('url').value;
    }
    url = url === '' ? undefined : url;
    host = (url) ? getHostnameFromUrlString(url) : undefined;
    let used = (document.getElementById('used').value !== '') ? parseInt(document.getElementById('used').value) : undefined;
    let first = (document.getElementById('first').value !== '') ? parseInt(document.getElementById('first').getAttribute('data-time')) : undefined;
    let last = (document.getElementById('last').value !== '') ? parseInt(document.getElementById('last').getAttribute('data-time')) : undefined;

    objEntryData.name = document.getElementById('name').value;
    objEntryData.value = value;
    objEntryData.type = document.getElementById('typeSelect').value;
    objEntryData.used = used;
    objEntryData.first = first;
    objEntryData.last = last;
    objEntryData.host = host;
    objEntryData.url = url;
}

function getHostnameFromUrlString(url) {
    if (url.trim() === '') {
        return '';
    }
    if (url.toLowerCase().startsWith('file:')) {
        return 'localhost';
    }
    const link = document.createElement('a');
    link.setAttribute('href', url.trim());
    return link.hostname;
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