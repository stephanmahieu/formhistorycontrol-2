/*
 * Copyright (c) 2023. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

browser.tabs.onActivated.addListener(handleTabActivated);
browser.tabs.onUpdated.addListener(handleTabUpdated);
browser.windows.onFocusChanged.addListener(handleWindowFocusChanged);

browser.runtime.onMessage.addListener(receiveIconEvents);

const debounceFunc = (fn, time) => {
    let timeout;
    return function() {
        const functionCall = () => fn.apply(this, arguments);
        clearTimeout(timeout);
        timeout = setTimeout(functionCall, time);
    }
};

// initially update icon for the active tab
setTimeout(()=>{ updateIconForActiveTab(); }, 1500);


const DEFAULT_PNG_ICON = "/theme/icons/fhc-nn.png";
const DEFAULT_SVG_ICON = "/theme/icons/fhc_icon.svg";
const DISABLED_PNG_ICON = "/theme/icons/state/fhc_icon_disabled_nn.png";
const DISABLED_SVG_ICON = "/theme/icons/state/fhc_icon_disabled.svg";
const ENABLED_PNG_ICON = "/theme/icons/state/fhc_icon_enabled_nn.png";
const ENABLED_SVG_ICON = "/theme/icons/state/fhc_icon_enabled.svg";


function receiveIconEvents(fhcEvent, sender, sendResponse) {
    if (fhcEvent.eventType && fhcEvent.eventType === 888 &&
          (fhcEvent.domainFilterChanged || fhcEvent.fieldFilterChanged || fhcEvent.retainTypeChanged || fhcEvent.overrideIncognitoChanged)) {
        // only for the active browsertab(s)
        updateIconForActiveTab();
    }
}

function updateIconForActiveTab() {
    browser.tabs.query({active: true}).then(tabInfo => {
        if (tabInfo.length > 0) {
            tabInfo.forEach(tab => {
                updateApplicationIcon(tab.windowId, tab.id, tab.url, tab.incognito);
            });
        }
    });
}

function updateApplicationIconForActiveTab() {
    browser.windows.getCurrent({populate: true}).then(tabInfo=>{
        // console.log('Active window is ' + tabInfo.id);
        if (tabInfo.tabs.length > 0) {
            tabInfo.tabs.forEach(tab => {
                if (tab.active) {
                    // console.log('Active tab is ' + tab.id);
                    debouncedUpdateApplicationIcon(tab.windowId, tab.id, tab.url, tab.incognito);
                }
            });
        }
    });
}

function handleWindowFocusChanged(windowId) {
    if (windowId > 0) {
        // console.log("### Window " + windowId + " now has the focus! ###");
        // updateApplicationIconOnTabActivation();
        updateApplicationIconForActiveTab();
    }
}

function handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        updateApplicationIconOnTabActivation(tab.windowId, tab.id);
    }
}

function handleTabActivated(activeInfo) {
    // set application icon
    updateApplicationIconOnTabActivation(activeInfo.windowId, activeInfo.tabId);

    // activates via manifest (page_action, show_matches)
    //browser.pageAction.show(activeInfo.tabId);
}

function updateApplicationIconOnTabActivation(windowId, tabId, attempt = 1) {
    browser.tabs.get(tabId).then(tabInfo => {
        if (tabInfo.status === 'loading' || ('about:blank' === tabInfo.url && attempt<=10)) {
            setTimeout(() => {
                updateApplicationIconOnTabActivation(windowId, tabId, ++attempt);
            }, 500);
        } else {
            debouncedUpdateApplicationIcon(tabInfo.windowId, tabInfo.id, tabInfo.url, tabInfo.incognito);
        }
    });
}

function updateApplicationIcon(windowId, tabId, url, incognito) {
    // skip popup windows
    if (url.includes('moz-extension://')) {
        // skip popup windows
        return;
    }

    // Only show pageaction when preference is set
    browser.storage.local.get({
        prefPageactionAvail: 'always'
    }).then(res => {
        if (res.prefPageactionAvail === 'always') {
            browser.pageAction.show(tabId);
        } else {
            browser.pageAction.hide(tabId);
        }
    });

    const host = MiscUtil.getHostnameFromUrlString(url);

    // reflect state in icon: disabled/enabled icon when domainfilter is active, normal icon otherwise
    OptionsUtil.getFilterPrefs().then(prefs => {
        if (incognito && !OptionsUtil.doSaveInIncognitoMode(prefs)) {
            setApplicationIcon(tabId, DISABLED_PNG_ICON, DISABLED_SVG_ICON);
        } else if (!OptionsUtil.isDomainfilterActive(prefs)) {
            setApplicationIcon(tabId, DEFAULT_PNG_ICON, DEFAULT_SVG_ICON);
        } else {
            if (OptionsUtil.isDomainBlocked(host, prefs)) {
                setApplicationIcon(tabId, DISABLED_PNG_ICON, DISABLED_SVG_ICON);
            } else {
                setApplicationIcon(tabId, ENABLED_PNG_ICON, ENABLED_SVG_ICON);
            }
        }
    });
}
let debouncedUpdateApplicationIcon = debounceFunc(updateApplicationIcon, 100);

function setApplicationIcon(tabId, fixedPath, scalablePath) {
    // MF3 browser.action.setIcon({
    browser.browserAction.setIcon({
        tabId: tabId,
        path: {
            16: fixedPath.replace('nn', '16'),
            32: fixedPath.replace('nn', '32'),
            48: fixedPath.replace('nn', '48'),
            64: fixedPath.replace('nn', '64'),
            65: scalablePath}
    });
}