/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

browser.runtime.onMessage.addListener(fhcEvent => {
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 998:
            case 999:
                // console.log('received a ' + fhcEvent.eventType + ' event, unhide close button.');
                document.querySelector("#buttonClose").style.display = "inline";
                break;
            case 888:
                if (fhcEvent.interfaceThemeChanged) {
                    // options have changed, reload
                    OptionsUtil.getInterfaceTheme().then(res => {
                        ThemeUtil.switchTheme(res);
                    });
                }
                if (fhcEvent.domainFilterChanged) {
                    // option can be changed from pageaction
                    let gettingItem = browser.storage.local.get({
                        prefDomainList: []
                    });
                    gettingItem.then(res => {
                        setListOptions("#domainlist", res.prefDomainList);
                        document.querySelector("#domainListItem").value = "";
                        currentOptions.prefDomainList = res.prefDomainList;
                    });
                }
                break;
            case 666:
                browser.windows.getCurrent({populate: false, windowTypes: ["popup"]}).then((window)=>{
                    WindowUtil.closePopupByID(window.id);
                });
                break;
        }
    }
});

document.addEventListener("DOMContentLoaded", function() {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    addStylesheetThemesToSelect();
    addMultilineSaveOptionsToSelect();

    restoreOptions();
    document.querySelector("form").addEventListener("submit", saveOptions);

    document.querySelectorAll('.optionLink').forEach(link => {
        link.addEventListener("click", selectOptionSection);
    });

    document.querySelector("#themeSelect").addEventListener("change", themeSelectionChanged);
    document.querySelector("#overrideAutocomplete").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#dateformatSelect").addEventListener("change", checkPropertiesChanged);

    document.querySelector("#versionAgeSelect").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#versionLengthSelect").addEventListener("change", checkPropertiesChanged);

    document.querySelectorAll('input[name=radiogroupDomainlist]').forEach(radio => {
        radio.addEventListener("change", checkPropertiesChanged);
        radio.addEventListener("change", domainlistRadioChanged);
    });

    document.querySelector('#domainlist').addEventListener("change", domainlistChanged);
    document.querySelector('#domainListItem').addEventListener("keyup", domainlistInputChanged);

    document.querySelector('#fieldlist').addEventListener("change", fieldlistChanged);
    document.querySelector('#fieldListItem').addEventListener("keyup", fieldlistInputChanged);

    document.querySelectorAll('.domainbutton').forEach(btn => {btn.addEventListener("click", listButtonClicked)});

    document.querySelector("#autocleanup").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#keepdayshistory").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#btnCleanupNow").addEventListener("click", cleanupNow);

    document.querySelector("#buttonClose").addEventListener("click", closeThisPopup);
    document.addEventListener("keyup", onKeyClicked);

    // if this is a large window, options have been opened from outside the app, in that case show all options at once
    if (document.body.clientHeight > 600) {
        // unkide fieldsets
        document.querySelectorAll('.sub-fieldset').forEach(fldset => {
            fldset.style.display = "block";
        });
        // hide option links
        document.querySelectorAll('.optionLink').forEach(lnk => {
            lnk.style.display = "none";
        });
    }

    // check if database is accessible
    // !! opening database in a popup script behaves differently across current/beta/nightly versions,
    // !! also db is usually opened from a background script so maybe activate (much) later
    // WindowUtil.isDatabaseAccessible()
});

function closeThisPopup(event) {
    event.preventDefault();
    // TODO check for changes and ask confirmation?
    WindowUtil.closeThisPopup();
}

let currentOptions;
function restoreOptions() {
    let gettingItem = browser.storage.local.get({
        prefInterfaceTheme       : "default",
        prefUseCustomAutocomplete: false,
        prefMultilineThresholds  : {age: "10", length: "500"},
        prefDateFormat           : "automatic",
        prefDomainFilter         : "all",
        prefDomainList           : [],
        prefFieldList            : [],
        prefAutomaticCleanup     : CleanupConst.DEFAULT_DO_CLEANUP,
        prefKeepDaysHistory      : CleanupConst.DEFAULT_DAYS_TO_KEEP
    });
    gettingItem.then(res => {
        //console.log('checkbox value got from storage is [' + res.prefUseCustomAutocomplete + ']');
        document.querySelector('#themeSelect').value = res.prefInterfaceTheme;
        document.querySelector("#overrideAutocomplete").checked = res.prefUseCustomAutocomplete;
        document.querySelector('#versionAgeSelect').value = res.prefMultilineThresholds.age;
        document.querySelector('#versionLengthSelect').value = res.prefMultilineThresholds.length;
        document.querySelector("#dateformatSelect").value = res.prefDateFormat;
        document.querySelector("#autocleanup").checked = res.prefAutomaticCleanup;
        document.querySelector("#keepdayshistory").value = res.prefKeepDaysHistory;

        checkRadioDomainByValue(res.prefDomainFilter);

        setListOptions("#domainlist", res.prefDomainList);
        document.querySelector("#domainListItem").value = "";

        setListOptions("#fieldlist", res.prefFieldList);
        document.querySelector("#fieldListItem").value = "";

        domainlistRadioChanged();
        domainlistChanged();
        fieldlistChanged();

        currentOptions = Object.assign({}, res);
        checkPropertiesChanged();
    });
}

function saveOptions(e) {
    //console.log('checkbox value is [' + document.querySelector("#overrideAutocomplete").checked + ']');
    const newOptions = getNewOptions();

    browser.storage.local.set(newOptions);
    e.preventDefault();

    const notifyMsg = {
        eventType: 888,
        interfaceThemeChanged:       (currentOptions.prefInterfaceTheme !== newOptions.prefInterfaceTheme),
        overrideAutocompleteChanged: (currentOptions.prefUseCustomAutocomplete !== newOptions.prefUseCustomAutocomplete),
        multilineThresholdsChanged:  (currentOptions.prefMultilineThresholds.age !== newOptions.prefMultilineThresholds.age
                                   || currentOptions.prefMultilineThresholds.length !== newOptions.prefMultilineThresholds.length),
        dateFormatChanged:           (currentOptions.prefDateFormat !== newOptions.prefDateFormat),
        domainFilterChanged:         (currentOptions.prefDomainFilter !== newOptions.prefDomainFilter || !arrayContentEquals(currentOptions.prefDomainList, newOptions.prefDomainList)),
        fieldFilterChanged:          !arrayContentEquals(currentOptions.prefFieldList, newOptions.prefFieldList)
    };

    // inform popups
    browser.runtime.sendMessage(notifyMsg);

    // inform all content scripts (all tabs)
    browser.tabs.query({status: "complete"}).then(tabs => {
        tabs.forEach(tab => {
            browser.tabs.sendMessage(tab.id, notifyMsg).then(null, null);
        });
    });

    currentOptions = Object.assign({}, newOptions);
    checkPropertiesChanged();
}

function getNewOptions() {
    return {
        prefInterfaceTheme       : document.querySelector("#themeSelect").value,
        prefUseCustomAutocomplete: document.querySelector("#overrideAutocomplete").checked,
        prefMultilineThresholds  : {age   : document.querySelector("#versionAgeSelect").value,
                                    length: document.querySelector("#versionLengthSelect").value},
        prefDateFormat           : document.querySelector("#dateformatSelect").value,
        prefDomainFilter         : getCheckedRadioDomainValue(),
        prefDomainList           : getList("#domainlist"),
        prefFieldList            : getList("#fieldlist"),
        prefAutomaticCleanup     : document.querySelector("#autocleanup").checked,
        prefKeepDaysHistory      : document.querySelector("#keepdayshistory").value
    };
}

function selectOptionSection(event) {
    let currentLinkElm = event.currentTarget;
    let openFieldsetId = "fld_" + currentLinkElm.id;

    // hide old fieldset
    let oldLinkElm = document.querySelector(".optionLink.selected");
    let oldFieldsetId = "fld_" + oldLinkElm.id;
    let oldFldSet = document.querySelector("#" + oldFieldsetId);
    oldFldSet.style.display = "none";
    oldLinkElm.classList.remove("selected");

    // show new fieldset
    let newFldSet = document.querySelector("#" + openFieldsetId);
    newFldSet.style.display = "block";

    // set link to selected
    currentLinkElm.classList.add("selected");
}

function domainlistRadioChanged() {
    const radioAllowAllChecked = document.querySelector("#radioDomainlistAll").checked;

    const domainlistElm = document.querySelector("#domainlist");
    const domainListInputElm = document.querySelector("#domainListItem");
    const btnAdd = document.querySelector("#listAdd");
    const btnMod = document.querySelector("#listModify");
    const btnDel = document.querySelector("#listDelete");

    if (radioAllowAllChecked) {
        domainlistElm.setAttribute("disabled", "true");
        domainListInputElm.setAttribute("disabled", "true");
        btnAdd.setAttribute("disabled", "true");
        btnMod.setAttribute("disabled", "true");
        btnDel.setAttribute("disabled", "true");

        domainlistElm.value = -1;
        domainListInputElm.value = "";
    } else {
        domainlistElm.removeAttribute("disabled");
        domainListInputElm.removeAttribute("disabled");
    }
}

function checkRadioDomainByValue(radioButtonValue) {
    switch(radioButtonValue) {
        case "all":
            document.querySelector("#radioDomainlistAll").checked = true;
            break;
        case "blacklist":
            document.querySelector("#radioDomainlistBlacklist").checked = true;
            break;
        case "whitelist":
            document.querySelector("#radioDomainlistWhitelist").checked = true;
            break;
    }
}

function getCheckedRadioDomainValue() {
    let checkedRadioValue = 'all';
    document.querySelectorAll('input[name=radiogroupDomainlist]').forEach(radio => {
        if (radio.checked) {
            checkedRadioValue = radio.value;
        }
    });
    return checkedRadioValue;
}

function getList(selectId) {
    const options = document.querySelector(selectId).options;

    let domainlist = [];
    for(let i = 0; i < options.length; i++) {
        domainlist.push(options[i].textContent);
    }
    domainlist.sort();
    return domainlist;
}

function setListOptions(selectId, lstOptions) {
    const lstSelect = document.querySelector(selectId);

    // empty list before adding new items
    for(let i = lstSelect.options.length-1; i>=0 ; i--) {
        lstSelect.remove(i);
    }

    for(let i = 0; i < lstOptions.length; i++) {
        let newoption = document.createElement("option");
        newoption.textContent = lstOptions[i];
        lstSelect.options.add(newoption);
    }
}


function domainlistChanged() {
    copySelectedItemToInput("#domainlist", "#domainListItem");
    setListButtonsState("#domainlist", "#domainListItem", "#listAdd", "#listModify", "#listDelete");
}

function domainlistInputChanged() {
    setListButtonsState("#domainlist", "#domainListItem", "#listAdd", "#listModify", "#listDelete");
}

function fieldlistChanged() {
    copySelectedItemToInput("#fieldlist", "#fieldListItem");
    setListButtonsState("#fieldlist", "#fieldListItem", "#fieldAdd", "#fieldModify", "#fieldDelete");
}

function fieldlistInputChanged() {
    setListButtonsState("#fieldlist", "#fieldListItem", "#fieldAdd", "#fieldModify", "#fieldDelete");
}

function listButtonClicked(event) {
    event.preventDefault();
    let idButton = event.target.id;
    switch (idButton) {
        case "listAdd":
            addListItem("#domainlist", "#domainListItem");
            domainlistChanged();
            break;
        case "listModify":
            modifyListItem("#domainlist", "#domainListItem");
            domainlistChanged();
            break;
        case "listDelete":
            deleteSelectedItem("#domainlist", "#domainListItem");
            domainlistChanged();
            break;

        case "fieldAdd":
            addListItem("#fieldlist", "#fieldListItem");
            fieldlistChanged();
            break;
        case "fieldModify":
            modifyListItem("#fieldlist", "#fieldListItem");
            fieldlistChanged();
            break;
        case "fieldDelete":
            deleteSelectedItem("#fieldlist", "#fieldListItem");
            fieldlistChanged();
            break;
    }
    checkPropertiesChanged();
}


function addListItem(selectId, inputId) {
    const lstSelect = document.querySelector(selectId);
    const inputValue = document.querySelector(inputId).value;

    if (!listItemExist(lstSelect, inputValue)) {
        let newoption = document.createElement("option");
        newoption.textContent = inputValue;
        lstSelect.options.add(newoption);
        lstSelect.selectedIndex = lstSelect.options.length - 1;
    }
}

function modifyListItem(selectId, inputId) {
    const lstSelect = document.querySelector(selectId);
    const inputElm = document.querySelector(inputId);

    lstSelect.options[lstSelect.selectedIndex].textContent = inputElm.value;
}

function deleteSelectedItem(selectId, inputId) {
    const lstSelect = document.querySelector(selectId);
    const inputElm = document.querySelector(inputId);

    let idx = lstSelect.selectedIndex;
    if (idx >= 0) {
        lstSelect.remove(lstSelect.selectedIndex);
        if (lstSelect.options.length > 0) {
            if (idx < lstSelect.options.length-1) {
                lstSelect.selectedIndex = idx;
            } else {
                lstSelect.selectedIndex  = lstSelect.options.length-1;
            }
        } else {
            // list became empty
            inputElm.value = "";
        }
    }
}

function copySelectedItemToInput(selectId, inputId) {
    const lstSelect = document.querySelector(selectId);
    const inputElm = document.querySelector(inputId);

    let elements = lstSelect.options;
    for(let i = 0; i < elements.length; i++) {
        if (elements[i].selected) {
            inputElm.value = elements[i].value;
        }
    }
    inputElm.focus();
}

function setListButtonsState(selectId, inputId, btnAddId, btnModId, btnDelId) {
    const btnAdd = document.querySelector(btnAddId);
    const btnMod = document.querySelector(btnModId);
    const btnDel = document.querySelector(btnDelId);

    const lstSelect = document.querySelector(selectId);
    const inputValue = document.querySelector(inputId).value;

    if (lstSelect.selectedIndex < 0 || !inputValue) {
        if (inputValue) {
            btnAdd.removeAttribute("disabled");
        } else {
            btnAdd.setAttribute("disabled", "true");
        }
        btnMod.setAttribute("disabled", "true");
        btnDel.setAttribute("disabled", "true");
    } else {
        if (listItemExist(lstSelect, inputValue)) {
            btnAdd.setAttribute("disabled", "true");
            btnMod.setAttribute("disabled", "true");
            btnDel.removeAttribute("disabled");
        } else {
            btnAdd.removeAttribute("disabled");
            btnMod.removeAttribute("disabled");
            btnDel.setAttribute("disabled", "true");
        }
    }
}

function listItemExist(selectElm, optionValue) {
    const options = selectElm.options;
    let exist = false;
    for(let i = 0; i < options.length; i++) {
        if (options[i].textContent === optionValue) {
            exist = true;
        }
    }
    return exist;
}


function checkPropertiesChanged() {
    // enable apply button only if properties have changed
    let changed = false;
    const newOptions = getNewOptions();
    Object.entries(newOptions).forEach(([key, newValue]) => {
        let oldValue = currentOptions[key];
        if (Array.isArray(oldValue)) {
            if (!arrayContentEquals(oldValue, newValue)) {
                changed = true;
            }
        }
        else if (typeof oldValue === 'object') {
            // assuming both object have the same keys
            Object.entries(oldValue).forEach(([subKey, oldSubValue]) => {
                if (oldSubValue !== newValue[subKey]) {
                    changed = true;
                }
            });
        }
        else {
            if (oldValue !== newValue) {
                changed = true;
            }
        }
    });

    const applyBtnElm = document.querySelector("#buttonApply");
    if (changed) {
        applyBtnElm.removeAttribute("disabled");
    } else {
        applyBtnElm.setAttribute("disabled", "true");
    }
}

function arrayContentEquals(array1, array2) {
    if (array1.length === 0 && array2.length === 0) {
        return true;
    }
    if (array1.length !== array2.length) {
        return false;
    }
    let sameContent = true;
    array1.forEach(value => {
        if (!array2.includes(value)) {
            sameContent = false;
        }
    });
    return sameContent;
}

function addStylesheetThemesToSelect() {
    // discover the installed alternate stylesheets and create a list
    let themeList = new Set();
    document.querySelectorAll('link.alternate_stylesheet[data-title]').forEach( (elem) => {
        let elemTitle = elem.getAttribute("data-title");
        if (elemTitle) {
            themeList.add(elemTitle);
        }
    });

    // add the discovered themes as option to the theme select
    themeList.forEach((option)=>{
        const optionNode = document.createElement('option');
        optionNode.value = option;
        optionNode.appendChild(document.createTextNode(option));
        document.querySelector('#themeSelect').appendChild(optionNode);
    });
}

function addMultilineSaveOptionsToSelect() {
    const charactersText = browser.i18n.getMessage("optionsSaveNewVersionMultilineCharacters");
    ["10", "20", "50", "75", "100", "200", "500", "1000", "5000"].forEach((count)=>{
        const optionNode = document.createElement('option');
        optionNode.value = count;
        optionNode.appendChild(document.createTextNode(count + " " + charactersText));
        document.querySelector("#versionLengthSelect").appendChild(optionNode);
    });

    [   {val:       1, lbl: "1 "  + browser.i18n.getMessage("dateMinute")},
        {val:       2, lbl: "2 "  + browser.i18n.getMessage("dateMinutes")},
        {val:       5, lbl: "5 "  + browser.i18n.getMessage("dateMinutes")},
        {val:      10, lbl: "10 " + browser.i18n.getMessage("dateMinutes")},
        {val:      30, lbl: "30 " + browser.i18n.getMessage("dateMinutes")},
        {val:      60, lbl: "1 "  + browser.i18n.getMessage("dateHour")},
        {val:  2 * 60, lbl: "2 "  + browser.i18n.getMessage("dateHours")},
        {val:  6 * 60, lbl: "6 "  + browser.i18n.getMessage("dateHours")},
        {val: 12 * 60, lbl: "12 " + browser.i18n.getMessage("dateHours")},
        {val: 24 * 60, lbl: "1 "  + browser.i18n.getMessage("dateDay")}
    ].forEach((age)=>{
        const optionNode = document.createElement('option');
        optionNode.value = age.val;
        optionNode.appendChild(document.createTextNode(age.lbl));
        document.querySelector("#versionAgeSelect").appendChild(optionNode);
    });
}

function themeSelectionChanged(/*event*/) {
    // theme selection changed, apply directly to this window to preview the theme
    const selectedTheme = document.querySelector("#themeSelect").value;
    ThemeUtil.switchTheme(selectedTheme === 'default' ? '' : selectedTheme);
    checkPropertiesChanged();
}

function onKeyClicked(event) {
    const keyName = event.key;
    if (keyName === 'Escape') {
        WindowUtil.closeThisPopup();
    }
}

function cleanupNow(event) {
    event.preventDefault();
    browser.runtime.sendMessage({eventType: 800});

    // notify popup(s) that new data has been added so they can update their view
    // do not do that immediately because cleanup is performed asynchronously
    window.setTimeout(()=>{browser.runtime.sendMessage({eventType: 777});}, 800);
}