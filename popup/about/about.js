/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

browser.runtime.onMessage.addListener(fhcEvent=>{
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
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

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    let manifest = browser.runtime.getManifest();
    // document.title += " " + manifest.name;
    document.getElementById("app-name").textContent = manifest.name;
    document.getElementById("app-version").textContent = manifest.version;
    document.getElementById("app-description").textContent = manifest.description;
    document.getElementById("app-developer-name").textContent = manifest.developer.name;
    document.getElementById("app-developer-url").href = manifest.developer.url;
    // optional_permissions[]
    // permissions[]
    // web_accessible_resources[] -> folder/example.png
    //console.log("manifest is:" + manifest);

    document.getElementById("app-developer-url").addEventListener("click", openDeveloperURL);
});


function openDeveloperURL() {
    // console.log("Opening developer URL in new window...");
    let developerURL = browser.runtime.getManifest().developer.url;
    browser.windows.create({
        url: developerURL,
        type: "normal"
    });
}