/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

let currentTabInfo;
let currentDomain;

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    const gettingActiveTab = browser.tabs.query({active: true, currentWindow: true});
    const gettingPrefs = OptionsUtil.getFilterPrefs();

    Promise.all([gettingActiveTab, gettingPrefs]).then(values => {
        const tabs = values[0];
        const prefs = values[1];

        currentTabInfo = tabs[0];
        currentDomain = getHostnameFromUrlString(currentTabInfo.url);

        switch (prefs.prefDomainFilter) {
            case 'all':
                break;

            case 'blacklist':
                if (prefs.prefDomainList.includes(currentDomain)) {
                    document.getElementById("del-blacklist").style.display = 'block';
                } else {
                    document.getElementById("add-blacklist").style.display = 'block';
                }
                break;

            case 'whitelist':
                if (prefs.prefDomainList.includes(currentDomain)) {
                    document.getElementById("del-whitelist").style.display = 'block';
                } else {
                    document.getElementById("add-whitelist").style.display = 'block';
                }
                break;

            default:
                console.warn('Unimplemented domainfilter ' + prefs.prefDomainFilter);
                break;
        }
    });

    document.getElementById("manage-fhc").addEventListener("click", manageFhc);

    document.querySelectorAll('.add-list').forEach(item => {item.addEventListener("click", addDomainlist)});
    document.querySelectorAll('.del-list').forEach(item => {item.addEventListener("click", delDomainlist)});

    document.getElementById("show-fields").addEventListener("click", showformfields);
});


function manageFhc() {
    WindowUtil.createOrFocusWindow(FHC_WINDOW_MANAGE);
}

function addDomainlist() {
    OptionsUtil.getFilterPrefs().then(prefs => {
        prefs.prefDomainList.push(currentDomain);
        prefs.prefDomainList.sort();
        browser.storage.local.set(prefs).then(()=>{
            notifyDomainlistChange();
            window.close();
        });
    });
}

function delDomainlist() {
    OptionsUtil.getFilterPrefs().then(prefs => {
        prefs.prefDomainList = prefs.prefDomainList.filter(item => ![currentDomain].includes(item));
        browser.storage.local.set(prefs).then(()=>{
            notifyDomainlistChange();
            window.close();
        });
    });
}

function notifyDomainlistChange() {
    browser.runtime.sendMessage( {
        eventType: 888,
        domainFilterChanged: true
    });
}

function showformfields() {
    browser.tabs.sendMessage(currentTabInfo.id, {
        action: "showformfields",
        targetTabId: currentTabInfo.id
    });
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