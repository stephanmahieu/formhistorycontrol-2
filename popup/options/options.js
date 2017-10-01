'use strict';

browser.runtime.onMessage.addListener( (fhcEvent)=> {
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 999:
                document.querySelector("#buttonClose").style.display = "inline";
                break;
            case 888:
                // options have changed, reload
                OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res.interfaceTheme);});
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
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res.interfaceTheme);});

    addStylesheetThemesToSelect();

    restoreOptions();
    document.querySelector("form").addEventListener("submit", saveOptions);
    document.querySelector("#themeSelect").addEventListener("change", themeSelectionChanged);
    document.querySelector("#buttonClose").addEventListener("click", WindowUtil.closeThisPopup);
});


function saveOptions(e) {
    browser.storage.local.set({
        interfaceTheme : document.querySelector("#themeSelect").value,
        testvalue      : document.querySelector("#myUserPref").value
    });
    e.preventDefault();

    browser.runtime.sendMessage({
        eventType: 888
    });
}

function restoreOptions() {
    let gettingItem = browser.storage.local.get({
        interfaceTheme: "default",
        testvalue: "<empty>"
    });
    gettingItem.then((res) => {
        document.querySelector('#themeSelect').value = res.interfaceTheme;
        document.querySelector("#myUserPref").value = res.testvalue;
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

function themeSelectionChanged(event) {
    // theme selection changed, apply directly to this window to preview the theme
    const selectedTheme = document.querySelector("#themeSelect").value;
    ThemeUtil.switchTheme(selectedTheme === 'default' ? '' : selectedTheme);
}