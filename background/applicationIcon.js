/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

/**
 * Caveat:
 * will set the same application icon in all open windows but state will reflect only the last activated tab
 * because switching (focusing) window is not detected.
 */

browser.tabs.onActivated.addListener(handleTabActivated);
browser.runtime.onMessage.addListener(receiveIconEvents);

// initially update icon for the active tab
setTimeout(()=>{ updateIconForActiveTab(); }, 1500);


const DISABLED_PNG_ICON = "/theme/icons/state/fhc_icon_disabled_nn.png";
const DISABLED_SVG_ICON = "/theme/icons/state/fhc_icon_disabled.svg";
const ENABLED_PNG_ICON = "/theme/icons/state/fhc_icon_enabled_nn.png";
const ENABLED_SVG_ICON = "/theme/icons/state/fhc_icon_enabled.svg";


function receiveIconEvents(fhcEvent, sender, sendResponse) {
    if (fhcEvent.eventType && fhcEvent.eventType === 888 && fhcEvent.domainFilterChanged) {
        // only for the active browsertab(s)
        updateIconForActiveTab();
    }
}

function updateIconForActiveTab() {
    browser.tabs.query({active: true}).then(tabInfo => {
        if (tabInfo.length > 0) {
            tabInfo.forEach(tab => {
                updateApplicationIcon(tab.url);
            });
        }
    });
}

function handleTabActivated(activeInfo) {
    // set application icon
    updateApplicationIconOnTabActivation(activeInfo.tabId);

    // activates via manifest (page_action, show_matches)
    //browser.pageAction.show(activeInfo.tabId);
}

function updateApplicationIconOnTabActivation(tabId, attempt = 1) {
    browser.tabs.get(tabId).then(tabInfo => {
        if (tabInfo.status === 'loading' || ('about:blank' === tabInfo.url && attempt<=10)) {
            setTimeout(() => {
                updateApplicationIconOnTabActivation(tabId, ++attempt);
            }, 500);
        } else {
            updateApplicationIcon(tabInfo.url);
        }
    });
}

function updateApplicationIcon(url) {
    // skip popup windows
    if (!url.includes('moz-extension://')) {
        // reflect state in icon: disabled/enabled icon when domainfilter is active, normal icon otherwise

        OptionsUtil.getFilterPrefs().then(prefs => {
            if (OptionsUtil.isDomainfilterActive(prefs)) {
                setApplicationIcon("/theme/icons/fhc-nn.png", "/theme/icons/fhc_icon.svg");
            } else {
                const host = MiscUtil.getHostnameFromUrlString(url);
                if (OptionsUtil.isDomainBlocked(host, prefs)) {
                    setApplicationIcon(DISABLED_PNG_ICON, DISABLED_SVG_ICON);
                } else {
                    setApplicationIcon(ENABLED_PNG_ICON, ENABLED_SVG_ICON);
                }
            }
        });
    }
}

function setApplicationIcon(fixedPath, scalablePath) {
    browser.browserAction.setIcon({path: {
            16: fixedPath.replace('nn', '16'),
            32: fixedPath.replace('nn', '32'),
            48: fixedPath.replace('nn', '48'),
            64: fixedPath.replace('nn', '64'),
            65: scalablePath
        }}
    );
}