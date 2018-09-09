/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

const DEFAULT_DEVELOPER_NAME = 'Stephan';
const DEFAULT_DEVELOPER_URL = 'https://stephanmahieu.github.io/fhc-home/';

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
                browser.windows.getCurrent({populate: false}).then((window)=>{
                    WindowUtil.closePopupByID(window.id);
                });
                break;
        }
    }
});

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    let manifest = browser.runtime.getManifest();
    document.title += " " + manifest.name;
    document.getElementById("app-name").textContent = manifest.name;
    document.getElementById("app-version").textContent = manifest.version;
    document.getElementById("app-description").textContent = manifest.description;

    const developerInfo = getDeveloperInfo(manifest);
    document.getElementById("app-developer-name").textContent = developerInfo.name;
    document.getElementById("app-developer-url").href = developerInfo.url;

    document.getElementById("app-developer-url").addEventListener("click", openDeveloperURL);

    // esc key handler
    document.addEventListener("keyup", onKeyClicked);
});


function getDeveloperInfo(manifest) {
    let developerName = DEFAULT_DEVELOPER_NAME;
    let developerUrl = DEFAULT_DEVELOPER_URL;

    if ('developer' in manifest) {
        developerName = manifest.developer.name;
        developerUrl = manifest.developer.url;
    }
    else if ('author' in manifest) {
        developerName = manifest.author;
    }
    return {
        name: developerName,
        url: developerUrl
    }
}

function openDeveloperURL() {
    let developerURL = getDeveloperInfo(browser.runtime.getManifest()).url;
    browser.windows.create({
        url: developerURL,
        type: "normal"
    });
}

function onKeyClicked(event) {
    const keyName = event.key;
    if (keyName === 'Escape') {
        WindowUtil.closeThisPopup();
    }
}