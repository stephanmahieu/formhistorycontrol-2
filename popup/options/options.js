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
            case 999:
                document.querySelector("#buttonClose").style.display = "inline";
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

    restoreOptions();
    document.querySelector("form").addEventListener("submit", saveOptions);
    document.querySelector("#themeSelect").addEventListener("change", themeSelectionChanged);
    document.querySelector("#overrideAutocomplete").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#dateformatSelect").addEventListener("change", checkPropertiesChanged);

    document.querySelector("#buttonClose").addEventListener("click", WindowUtil.closeThisPopup);
    document.addEventListener("keyup", onKeyClicked);
});

let currentOptions;
function restoreOptions() {
    let gettingItem = browser.storage.local.get({
        prefInterfaceTheme      : "default",
        prefOverrideAutocomplete: true,
        prefDateFormat          : "automatic"
    });
    gettingItem.then(res => {
        //console.log('checkbox value got from storage is [' + res.prefOverrideAutocomplete + ']');
        document.querySelector('#themeSelect').value = res.prefInterfaceTheme;
        document.querySelector("#overrideAutocomplete").checked = res.prefOverrideAutocomplete;
        document.querySelector("#dateformatSelect").value = res.prefDateFormat;

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
        interfaceThemeChanged: (currentOptions.prefInterfaceTheme !== newOptions.prefInterfaceTheme),
        overrideAutocompleteChanged: (currentOptions.prefOverrideAutocomplete !== newOptions.prefOverrideAutocomplete),
        dateFormatChanged: (currentOptions.prefDateFormat !== newOptions.prefDateFormat)
    };

    // inform popups
    browser.runtime.sendMessage(notifyMsg);

    // inform all content scripts (all tabs)
    browser.tabs.query({status: "complete"}).then(tabs => {
        tabs.forEach(tab => {
            browser.tabs.sendMessage(tab.id, notifyMsg);
        });
    });

    currentOptions = Object.assign({}, newOptions);
    checkPropertiesChanged();
}

function getNewOptions() {
    return {
        prefInterfaceTheme      : document.querySelector("#themeSelect").value,
        prefOverrideAutocomplete: document.querySelector("#overrideAutocomplete").checked,
        prefDateFormat          : document.querySelector("#dateformatSelect").value,
    };
}

function checkPropertiesChanged() {
    // enable apply button only if properties have changed
    let changed = false;
    const newOptions = getNewOptions();
    Object.entries(newOptions).forEach(([key, value]) => {
        if (currentOptions[key] !== value) {
            changed = true;
        }
    });

    const applyBtnElm = document.querySelector("#buttonApply");
    if (changed) {
        applyBtnElm.removeAttribute("disabled");
    } else {
        applyBtnElm.setAttribute("disabled", "true");
    }
}

function addStylesheetThemesToSelect() {
    // discover the installed alternate stylesheets and create a list
    let themeList = new Set();
    document.querySelectorAll('link[rel="alternate stylesheet"]').forEach( (elem) => {
        if (elem.title) {
            themeList.add(elem.title);
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