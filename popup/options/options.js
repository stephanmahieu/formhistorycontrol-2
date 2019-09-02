/*
 * Copyright (c) 2018. Stephan Mahieu
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
                browser.windows.getCurrent({populate: false}).then((window)=>{
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
    addUpdateIntervalOptionsToSelect();
    addShortcutKeyOptions();

    restoreOptions();
    document.querySelector("form").addEventListener("submit", saveOptions);

    document.querySelector("#expertMode").addEventListener("change", showHideExpertPrefs);
    document.querySelector("#expertMode").addEventListener("change", checkPropertiesChanged);

    document.querySelectorAll('.optionLink').forEach(link => {
        link.addEventListener("click", selectOptionSection);
    });

    document.querySelector("#themeSelect").addEventListener("change", themeSelectionChanged);
    document.querySelector("#overrideAutocomplete").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#dateformatSelect").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#scrollAmountSelect").addEventListener("change", checkPropertiesChanged);

    document.querySelector("#versionAgeSelect").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#versionLengthSelect").addEventListener("change", checkPropertiesChanged);

    document.querySelector("#retainTypeSelect").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#retainTypeSelect").addEventListener("change", retainTypeChanged);
    document.querySelector("#updateIntervalSelect").addEventListener("change", checkPropertiesChanged);

    document.querySelector("#shortcutKeysModify").addEventListener("click", showShortkeyModifySelects);

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

    // if update shortcut commands is not supported (chrome), hide the shortcut edit button
    if (!browser.commands.update) {
        hideShortcutKeysModifyButton();
        showShortcutKeysModifyNotAllowedMessage();
    }

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
        prefExpertMode           : false,
        prefInterfaceTheme       : "default",
        prefUseCustomAutocomplete: false,
        prefMultilineThresholds  : {age: "10", length: "500"},
        prefRetainType           : "all",
        prefUpdateInterval       : "5000",
        prefDateFormat           : "automatic",
        prefScrollAmount         : "auto",
        prefShortcutKeys         : {
            // defaults here must be equal to the defaults in manifest.json
            _execute_browser_action: OptionsUtil.getDefaultShortcutKey('_execute_browser_action'),
            open_fhc               : OptionsUtil.getDefaultShortcutKey('open_fhc'),
            toggle_display_fields  : OptionsUtil.getDefaultShortcutKey('toggle_display_fields'),
            fill_recent            : OptionsUtil.getDefaultShortcutKey('fill_recent'),
            fill_often             : OptionsUtil.getDefaultShortcutKey('fill_often'),
            clear_filled           : OptionsUtil.getDefaultShortcutKey('clear_filled')
        },
        prefDomainFilter         : "all",
        prefDomainList           : [],
        prefFieldList            : [],
        prefAutomaticCleanup     : CleanupConst.DEFAULT_DO_CLEANUP,
        prefKeepDaysHistory      : CleanupConst.DEFAULT_DAYS_TO_KEEP
    });
    gettingItem.then(res => {
        //console.log('checkbox value got from storage is [' + res.prefUseCustomAutocomplete + ']');
        document.querySelector('#expertMode').checked = res.prefExpertMode;
        document.querySelector('#themeSelect').value = res.prefInterfaceTheme;
        document.querySelector("#overrideAutocomplete").checked = res.prefUseCustomAutocomplete;
        document.querySelector('#versionAgeSelect').value = res.prefMultilineThresholds.age;
        document.querySelector('#versionLengthSelect').value = res.prefMultilineThresholds.length;
        document.querySelector('#retainTypeSelect').value = res.prefRetainType;
        document.querySelector('#updateIntervalSelect').value = res.prefUpdateInterval;
        document.querySelector("#dateformatSelect").value = res.prefDateFormat;
        document.querySelector("#scrollAmountSelect").value = res.prefScrollAmount;
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
        retainTypeChanged();
        showHideExpertPrefs();

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
        retainTypeChanged:           (currentOptions.prefRetainType !== newOptions.prefRetainType),
        updateIntervalChanged:       (currentOptions.prefUpdateInterval !== newOptions.prefUpdateInterval),
        dateFormatChanged:           (currentOptions.prefDateFormat !== newOptions.prefDateFormat),
        scrollAmountChanged:         (currentOptions.prefScrollAmount !== newOptions.prefScrollAmount),
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

    // activate the new shortcut keys
    OptionsUtil.applyShortcutKeysPrefs();

    currentOptions = Object.assign({}, newOptions);
    checkPropertiesChanged();
}

function getNewOptions() {
    return {
        prefExpertMode           : document.querySelector("#expertMode").checked,
        prefInterfaceTheme       : document.querySelector("#themeSelect").value,
        prefUseCustomAutocomplete: document.querySelector("#overrideAutocomplete").checked,
        prefMultilineThresholds  : {age   : document.querySelector("#versionAgeSelect").value,
                                    length: document.querySelector("#versionLengthSelect").value},
        prefRetainType           : document.querySelector("#retainTypeSelect").value,
        prefUpdateInterval       : document.querySelector("#updateIntervalSelect").value,
        prefDateFormat           : document.querySelector("#dateformatSelect").value,
        prefScrollAmount         : document.querySelector("#scrollAmountSelect").value,
        prefShortcutKeys         : getAllShortcutKeyValues(),
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

function retainTypeChanged() {
    const retainType = document.querySelector("#retainTypeSelect").value;

    const selAge = document.querySelector("#versionAgeSelect");
    const selAgeLbl = document.querySelector("#versionAgeSelectLabel");
    const selLen = document.querySelector("#versionLengthSelect");
    const selLenLbl = document.querySelector("#versionLengthSelectLabel");

    if (retainType === 'single') {
        // disable multiline options
        selAgeLbl.classList.add("disabled");
        selAge.setAttribute("disabled", "true");
        selLenLbl.classList.add("disabled");
        selLen.setAttribute("disabled", "true");
    } else {
        selAgeLbl.classList.remove("disabled");
        selAge.removeAttribute("disabled");
        selLenLbl.classList.remove("disabled");
        selLen.removeAttribute("disabled");
    }
}

function showHideExpertPrefs() {
    const expertModeChecked = document.querySelector("#expertMode").checked;

    Array.from(document.getElementsByClassName('expert-pref')).forEach(elem => {
        if (expertModeChecked) {
            elem.style.display = 'unset';
        } else {
            elem.style.display = 'none';
        }
    });

    // check if the current selected category is still visible
    const oldLinkElm = document.querySelector(".optionLink.selected");
    if (oldLinkElm && oldLinkElm.offsetParent === null) {
        // unselect the now hidden fieldset
        const oldFieldsetId = "fld_" + oldLinkElm.id;
        const oldFldSet = document.querySelector("#" + oldFieldsetId);
        oldFldSet.style.display = "none";
        oldLinkElm.classList.remove("selected");

        // select the first visible fieldset
        document.querySelector('#display').classList.add('selected');
        document.querySelector('#fld_display').style.display = 'block';
    }
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

function shortcutKeySelectChanged(event) {
    // check validity change first, modifier 1 and 2 can not be the same
    const curSelect = event.target;
    const commandName = curSelect.getAttribute('data-cmd');

    const mod1 = document.getElementById('smod1_' + commandName).value;
    let   mod2 = document.getElementById('smod2_' + commandName).value;
    const key  = document.getElementById('skey_'  + commandName).value;

    // reset mod2 to empty if set equal to mod1
    if (mod1 === mod2) {
        document.getElementById('smod2_' + commandName).value = '';
    }

    // TODO check for duplicate shortcuts?

    updateShortcutKeyTextLabel(commandName, mod1, mod2, key);

    checkPropertiesChanged();
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