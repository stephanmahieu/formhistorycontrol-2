/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

browser.runtime.onMessage.addListener( (fhcEvent)=> {
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 999:
                document.querySelector("#buttonClose").style.display = "inline";
                break;
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

document.addEventListener("DOMContentLoaded", function() {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    addStylesheetThemesToSelect();

    restoreOptions();
    document.querySelector("form").addEventListener("submit", saveOptions);
    document.querySelector("#themeSelect").addEventListener("change", themeSelectionChanged);
    document.querySelector("#buttonClose").addEventListener("click", WindowUtil.closeThisPopup);
});


function saveOptions(e) {
    //console.log('checkbox value is [' + document.querySelector("#overrideAutocomplete").checked + ']');
    browser.storage.local.set({
        prefInterfaceTheme      : document.querySelector("#themeSelect").value,
        prefOverrideAutocomplete: document.querySelector("#overrideAutocomplete").checked,
        prefDateFormat          : document.querySelector("#dateformatSelect").value,
    });
    e.preventDefault();

    // inform popups
    browser.runtime.sendMessage({
        eventType: 888
    });

    // inform all content scripts (all tabs)
    browser.tabs.query({status: "complete"}).then(tabs => {
        tabs.forEach(tab => {
            browser.tabs.sendMessage(tab.id, {
                eventType: 888
            });
        });
    });
}

function restoreOptions() {
    let gettingItem = browser.storage.local.get({
        prefInterfaceTheme      : "default",
        prefOverrideAutocomplete: true,
        prefDateFormat          : "automatic"
    });
    gettingItem.then((res) => {
        //console.log('checkbox value got from storage is [' + res.prefOverrideAutocomplete + ']');
        document.querySelector('#themeSelect').value = res.prefInterfaceTheme;
        document.querySelector("#overrideAutocomplete").checked = res.prefOverrideAutocomplete;
        document.querySelector("#dateformatSelect").value = res.prefDateFormat;
    });
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
}