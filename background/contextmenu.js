/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */
'use strict';

/**
 * Caveat:
 * does not detect switching/focusing window, with multiple windows each window has an active tab and the
 * context menu will reflect only the state of the last activated (switched) tab on that particular window.
 */

const IS_FIREFOX = typeof browser.runtime.getBrowserInfo === 'function';
console.log("IS_FIREFOX = " + IS_FIREFOX);

browser.tabs.onActivated.addListener(handleActivated);

// initially set the EditorFieldRestoreMenu for the current active tab
setTimeout(()=>{ updateEditorFieldRestoreMenuForActiveTab(); }, 1500);

// create the comtext menus
initBrowserMenus();


function updateEditorFieldRestoreMenuForActiveTab() {
    browser.tabs.query({active: true}).then(tabInfo=>{
        if (tabInfo.length > 0) {
            tabInfo.forEach(tab => {
                updateEditorFieldRestoreMenu(tab.url);
            });
        }
    });
}

function handleActivated(activeInfo) {
    // console.log("Tab " + activeInfo.tabId + " was activated");
    // create submenu-items for multiline restore
    updateEditorFieldRestoreMenuOnTabActivation(activeInfo.tabId);
}

function updateEditorFieldRestoreMenuOnTabActivation(tabId, attempt = 1) {
    browser.tabs.get(tabId).then(tabInfo => {
        if (tabInfo.status === 'loading' || ('about:blank' === tabInfo.url && attempt<=10)) {
            setTimeout(() => {
                updateEditorFieldRestoreMenuOnTabActivation(tabId, ++attempt);
            }, 500);
        } else {
            // console.log('TabId ' + tabId+ ' was activated and has url: ' + tabInfo.url);
            updateEditorFieldRestoreMenu(tabInfo.url);
        }
    });
}

const MAX_LENGTH_EDITFIELD_ITEM = 35;
const editorFieldsMenuItemsIds = [];

function updateEditorFieldRestoreMenu(url) {
    if (url.includes('moz-extension://')) {
        // skip popup windows
        return;
    }
    const hostname = MiscUtil.getHostnameFromUrlString(url);

    removeCurrentMenuItems(editorFieldsMenuItemsIds)
    .then(() => {
        return getEditorFieldsByHostname(hostname, 10);
    }).then(hostnameItemsArray => {
        hostnameItemsArray.forEach(item => {editorFieldsMenuItemsIds.push(item);});
        return hostnameItemsArray;
    }).then(hostnameItemsArray => {
        return getEditorFieldsByLastused(hostname, 10, hostnameItemsArray);
    }).then(lastusedItemsArray => {
        lastusedItemsArray.forEach(item => {editorFieldsMenuItemsIds.push(item);});
    }).then(()=>{
        // editorFieldsMenuItemsIds.forEach(item => { console.log('- ' + item.type + ' ' + item.pKey + '  ' + item.value); });
        return addNewMenuItems(editorFieldsMenuItemsIds);
    });
}

// function updateEditorFieldRestoreMenu(tabId) {
//     browser.tabs.get(tabId).then(tabInfo => {
//         if (tabInfo.status === 'loading') {
//             // console.log('TabId ' + tabId + ' not completely loaded yet, retry getting tabInfo in 1 sec...');
//             setTimeout(()=>{ updateEditorFieldRestoreMenu(tabId); }, 1000);
//         } else {
//             const hostname = MiscUtil.getHostnameFromUrlString(tabInfo.url);
//             // console.log('TabId ' + tabId + ' was activated and has url: ' + tabInfo.url + '  (' + hostname + ')');
//
//             removeCurrentMenuItems(editorFieldsMenuItemsIds)
//             .then(() => {
//                 return getEditorFieldsByHostname(hostname, 10);
//             }).then(hostnameItemsArray => {
//                 hostnameItemsArray.forEach(item => {editorFieldsMenuItemsIds.push(item);});
//                 return hostnameItemsArray;
//             }).then(hostnameItemsArray => {
//                 return getEditorFieldsByLastused(hostname, 10, hostnameItemsArray);
//             }).then(lastusedItemsArray => {
//                 lastusedItemsArray.forEach(item => {editorFieldsMenuItemsIds.push(item);});
//             }).then(()=>{
//                 // editorFieldsMenuItemsIds.forEach(item => { console.log('- ' + item.type + ' ' + item.pKey + '  ' + item.value); });
//                 return addNewMenuItems(editorFieldsMenuItemsIds);
//             });
//         }
//     });
// }

function addNewMenuItems(menuItemsIds) {
    return new Promise((resolve, reject) => {

        const promisesArray = [];
        let hostnameMenuAdded = false;
        let lastusedMenuAdded = false;

        menuItemsIds.forEach(item => {
            if ((item.type === 'hostname' && !hostnameMenuAdded) || (item.type === 'lastused' && !lastusedMenuAdded)) {
                let title;
                if (item.type === 'hostname') {
                    hostnameMenuAdded = true;
                    title = browser.i18n.getMessage('contextMenuItemRestoreEditorFieldSubmenuHostname');
                } else  { /* 'lastused' */
                    lastusedMenuAdded = true;
                    title = browser.i18n.getMessage('contextMenuItemRestoreEditorFieldSubmenuLastused');
                }
                promisesArray.push(
                    createSubmenuItem("editfld" + item.type, "--- " + title + ": ---", false)
                );
            }
            promisesArray.push(
                createSubmenuItem("editfld" + item.pKey, '[' + DateUtil.toDateStringShorter(item.last) + '] ' + item.value, true)
            );
        });

        if (menuItemsIds.length > 0) {
            promisesArray.push(
                createSubmenuSeparator("editfldMoreSeparator")
            );
            promisesArray.push(
                createSubmenuItem("editfldMore", browser.i18n.getMessage('contextMenuItemRestoreEditorFieldSubmenuMore'), true)
            );
        }

        Promise.all(promisesArray).then(
            () => { resolve(); },
            () => { reject();  }
        );
    });
}

function createSubmenuItem(id, title, enabled) {
    let icons;
    if (!enabled) {
        icons = undefined;
    } else if (id === 'editfldMore') {
        icons = {
            "16": "/theme/icons/fhc-16.png",
            "32": "/theme/icons/fhc-32.png"
        };
    } else {
        icons = {
            "16": "/theme/icons/menu/16/fillfields.png",
            "32": "/theme/icons/menu/32/fillfields.png"
        };
    }
    return browserMenusCreate({
        id:       id,
        parentId: "restoreEditorField",
        title:    title,
        contexts: ["all"],
        enabled:  enabled,
        icons:    icons
    }, onMenuCreated);
}

function createSubmenuSeparator(id) {
    return browserMenusCreate({
        id:       id,
        parentId: "restoreEditorField",
        type:     "separator",
        contexts: ["all"]
    }, onMenuCreated);
}

function removeCurrentMenuItems(menuItemsIds) {
    return new Promise((resolve, reject) => {

        const promisesArray = [];
        let hostnameMenuDeleted = false;
        let lastusedMenuDeleted = false;

        if (menuItemsIds.length > 0) {
            promisesArray.push(browserMenusRemove("editfldMoreSeparator"));
            promisesArray.push(browserMenusRemove("editfldMore"));
        }

        while (menuItemsIds.length > 0) {
            let item = menuItemsIds.pop();
            if (item.type === 'hostname' && !hostnameMenuDeleted) {
                hostnameMenuDeleted = true;
                promisesArray.push(browserMenusRemove("editfld" + item.type));
            } else if (item.type === 'lastused' && !lastusedMenuDeleted) {
                lastusedMenuDeleted = true;
                promisesArray.push(browserMenusRemove("editfld" + item.type));
            }
            promisesArray.push(browserMenusRemove("editfld" + item.pKey));
        }

        Promise.all(promisesArray).then(
            () => { resolve(); },
            () => { reject();  }
        );
    });
}

function getEditorFieldsByHostname(hostname, maxItems) {
    return new Promise((resolve, reject) => {
        let result = [];

        if (!hostname) {
            resolve(result);
        }

        let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readonly");
        let index = objStore.index(DbConst.DB_TEXT_IDX_HOST);
        let singleKeyRange = IDBKeyRange.only(hostname);
        let req = index.openCursor(singleKeyRange);
        req.onsuccess = evt => {
            let cursor = evt.target.result;
            if (cursor) {
                let fhcEntry = cursor.value;
                let primaryKey = cursor.primaryKey;
                // console.log("Entry matching hostname [" + cursor.key + "] primaryKey:[" + primaryKey + "] name:[" + fhcEntry.name + "] type:[" + fhcEntry.type + "}");

                if (fhcEntry.type !== 'input') {
                    let value = removeTagsAndShorten(fhcEntry.value);
                    if (value) {
                        result.push({
                            type: 'hostname',
                            pKey: primaryKey,
                            last: fhcEntry.last,
                            name: fhcEntry.name,
                            value: value
                        });
                    }
                }
                cursor.continue();
            }
            else {
                // no more items sort by name and date
                result.sort((a,b)=> {
                    if (a.last !== b.last) {
                        return b.last - a.last;
                    }
                    return (a.name.localeCompare(b.name));
                });
                if (result.length > maxItems) {
                    result = result.slice(0, maxItems);
                }
                resolve(result);
            }
        };
        req.onerror = ()=>{
            reject(this.error);
        };
    });
}

function getEditorFieldsByLastused(hostname, maxItems, excludeItems) {
    return new Promise((resolve, reject) => {
        let result = [];

        let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readonly");
        let index = objStore.index(DbConst.DB_TEXT_IDX_LAST);
        let req = index.openCursor(null, "prev");
        req.onsuccess = evt => {
            let cursor = evt.target.result;
            if (cursor && result.length < maxItems) {
                let fhcEntry = cursor.value;
                let primaryKey = cursor.primaryKey;
                // console.log("Entry most recent [" + cursor.key + "] primaryKey:[" + primaryKey + "] name:[" + fhcEntry.name + "] type:[" + fhcEntry.type + "}");

                if (fhcEntry.type !== 'input' && fhcEntry.host !== hostname) {
                    let value = removeTagsAndShorten(fhcEntry.value);
                    if (value) {
                        let item = {
                            type: 'lastused',
                            pKey: primaryKey,
                            last: fhcEntry.last,
                            name: fhcEntry.name,
                            value: value
                        };
                        if (!excludeItems.some(elem => {return elem.pKey === item.pKey})) {
                            result.push(item);
                        }
                    }
                }
                cursor.continue();
            }
            else {
                // no more items
                resolve(result);
            }
        };
        req.onerror = ()=>{
            reject(this.error);
        };
    });
}

function removeTagsAndShorten(value) {
    // remove tags, replace newlines/tabs with spaces, remove non-printable chars, replace consecutive spaces with one space
    let str = value.replace(/<\/?[^>]+(>|$)/g, "").replace(/[\t\r\n]+/g,' ').replace('&nbsp;',' ').replace(/\s\s+/g, ' ').trim();
    if (str.length > MAX_LENGTH_EDITFIELD_ITEM) {
        str = str.substring(0, MAX_LENGTH_EDITFIELD_ITEM-3) + '...';
    }
    return str;
}

function onMenuCreated() {
  if (browser.runtime.lastError) {
    console.error(`Error: ${browser.runtime.lastError}`);
  } else {
    //console.log("MenuItem created successfully");
  }
}


function initBrowserMenus() {
    /*
     * Create the Tools context menu items.
     *
     * ===============================(tools_menu)================================
     */
    browserMenusCreate({
        id: "FHCToolsParentMenu",
        title: browser.i18n.getMessage("extensionName"),
        contexts: ["tools_menu"],
        icons: {
            "16": "/theme/icons/fhc-16.png",
            "32": "/theme/icons/fhc-32.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        id: "manageTools",
        parentId: "FHCToolsParentMenu",
        title: browser.i18n.getMessage("contextMenuItemManageHistory"),
        contexts: ["tools_menu"],
        icons: {
            "16": "/theme/icons/fhc-16.png",
            "32": "/theme/icons/fhc-32.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        id: "optionsTools",
        parentId: "FHCToolsParentMenu",
        title: browser.i18n.getMessage("contextMenuItemOptions"),
        contexts: ["tools_menu"],
        icons: {
            "16": "/theme/icons/menu/16/preferences.png",
            "32": "/theme/icons/menu/32/preferences.png"
        }
    }, onMenuCreated);
    /* =============================(tools_menu end)============================== */


    /*
     * Create the right-click context menu.
     * Hide the menu separators for the browser-action, we may only show 6 items
     * including the separators.
     *
     * ==============================(context menu)===============================
     */
    browserMenusCreate({
        id: "manage",
        title: browser.i18n.getMessage("contextMenuItemManageHistory"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/fhc-16.png",
            "32": "/theme/icons/fhc-32.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        type: "separator",
        contexts: ["page","editable","frame"]
    }, onMenuCreated);
    browserMenusCreate({
        id: "restoreEditorField",
        title: browser.i18n.getMessage("contextMenuItemRestoreEditorField"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/refresh.png",
            "32": "/theme/icons/menu/32/refresh.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        type: "separator",
        contexts: ["page","editable","frame"]
    }, onMenuCreated);
    browserMenusCreate({
        id: "fillMostRecent",
        title: browser.i18n.getMessage("contextMenuItemFillMostRecent"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/fillfields.png",
            "32": "/theme/icons/menu/32/fillfields.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        id: "fillMostUsed",
        title: browser.i18n.getMessage("contextMenuItemFillMostUsed"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/fillfields.png",
            "32": "/theme/icons/menu/32/fillfields.png"
        }
    }, onMenuCreated);
// do not show this menu-item for page_action, only 5 items are shown
    browserMenusCreate({
        id: "clearFields",
        title: browser.i18n.getMessage("contextMenuItemClearFields"),
        contexts: ["page","editable","frame","browser_action"],
        icons: {
            "16": "/theme/icons/menu/16/emptyfields.png",
            "32": "/theme/icons/menu/32/emptyfields.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        type: "separator",
        contexts: ["page","editable","frame"]
    }, onMenuCreated);
    /*
     * Remainder only for page_action (max 6 are shown for browser-action).
     * ============================(context menu page)============================
     */
    browserMenusCreate({
        id: "showformfields",
        title: browser.i18n.getMessage("contextMenuItemShowformfields"),
        contexts: ["page","editable","frame"],
        icons: {
            "16": "/theme/icons/menu/16/showfields.png",
            "32": "/theme/icons/menu/32/showfields.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        type: "separator",
        contexts: ["page","editable","frame"]
    }, onMenuCreated);
    browserMenusCreate({
        id: "submenuInfo",
        title: browser.i18n.getMessage("menuItemInfoSubmenu"),
        contexts: ["page","editable","frame"],
        icons: {
            "16": "/theme/icons/menu/16/submenu.png",
            "32": "/theme/icons/menu/32/submenu.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        id: "helpoverview",
        parentId: "submenuInfo",
        title: browser.i18n.getMessage("menuItemHelpOverview"),
        contexts: ["page","editable","frame"],
        icons: {
            "16": "/theme/icons/menu/16/help.png",
            "32": "/theme/icons/menu/32/help.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        id: "releasenotes",
        parentId: "submenuInfo",
        title: browser.i18n.getMessage("menuItemHelpReleasenotes"),
        contexts: ["page","editable","frame"],
        icons: {
            "16": "/theme/icons/menu/16/releasenotes.png",
            "32": "/theme/icons/menu/32/releasenotes.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        id: "about",
        parentId: "submenuInfo",
        title: browser.i18n.getMessage("menuItemHelpAbout"),
        contexts: ["page","editable","frame"],
        icons: {
            "16": "/theme/icons/menu/16/about.png",
            "32": "/theme/icons/menu/32/about.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        type: "separator",
        contexts: ["page","editable","frame"]
    }, onMenuCreated);
    browserMenusCreate({
        id: "preferences",
        title: browser.i18n.getMessage("contextMenuItemOptions"),
        contexts: ["page","editable","frame"],
        icons: {
            "16": "/theme/icons/menu/16/preferences.png",
            "32": "/theme/icons/menu/32/preferences.png"
        }
    }, onMenuCreated);
    /* ==========================(context menu page end)========================== */

    /*
     * Browser-action (right-click on icon in menu-bar) may only show 6 items,
     * Page-action (right-click on icon in address-bar) may only show 5 items,
     * put remainder in a submenu (browser.menus.ACTION_MENU_TOP_LEVEL_LIMIT)
     *
     * =========================(browser_action submenu)==========================
     */
    browserMenusCreate({
        id: "submenuExtra",
        title: browser.i18n.getMessage("contextMenuItemRestoreEditorFieldSubmenuMore"),
        contexts: ["browser_action", "page_action"],
        icons: {
            "16": "/theme/icons/menu/16/submenu.png",
            "32": "/theme/icons/menu/32/submenu.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        id: "clearFieldsPA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("contextMenuItemClearFields"),
        contexts: ["page_action"],
        icons: {
            "16": "/theme/icons/menu/16/emptyfields.png",
            "32": "/theme/icons/menu/32/emptyfields.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        parentId: "submenuExtra",
        type: "separator",
        contexts: ["page_action"]
    }, onMenuCreated);
    browserMenusCreate({
        id: "showformfieldsBA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("contextMenuItemShowformfields"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/showfields.png",
            "32": "/theme/icons/menu/32/showfields.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        parentId: "submenuExtra",
        type: "separator",
        contexts: ["all"]
    }, onMenuCreated);
    browserMenusCreate({
        id: "helpoverviewBA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("menuItemHelpOverview"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/help.png",
            "32": "/theme/icons/menu/32/help.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        id: "releasenotesBA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("menuItemHelpReleasenotes"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/releasenotes.png",
            "32": "/theme/icons/menu/32/releasenotes.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        id: "aboutBA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("menuItemHelpAbout"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/about.png",
            "32": "/theme/icons/menu/32/about.png"
        }
    }, onMenuCreated);
    browserMenusCreate({
        parentId: "submenuExtra",
        type: "separator",
        contexts: ["all"]
    }, onMenuCreated);
    browserMenusCreate({
        id: "preferencesBA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("contextMenuItemOptions"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/preferences.png",
            "32": "/theme/icons/menu/32/preferences.png"
        }
    }, onMenuCreated);
    /* ===========================(browser_action end)============================ */
}



function showformfields(tabId) {
    // send without checking response
    //console.log('Sending a message to tab ' + tabId);
    browser.tabs.sendMessage(tabId, {
        action: "showformfields",
        targetTabId: tabId
    });
}

function fillformfields(tabId, action) {
    // send without checking response
    //console.log('Sending a message to tab ' + tabId);
    browser.tabs.sendMessage(tabId, {
        action: action,
        targetTabId: tabId
    });
}

function getSingleElementByPrimaryKeyAndNotify(primaryKey, tabId) {
    const reqOpen = indexedDB.open(DbConst.DB_NAME, DbConst.DB_VERSION);
    reqOpen.onerror = function (/*event*/) {
        console.error("Database open error", this.error);
    };
    reqOpen.onsuccess = function (event) {
        const pKey = (typeof primaryKey === 'string') ? parseInt(primaryKey) : primaryKey;

        const db = event.target.result;
        const objStore = db.transaction(DbConst.DB_STORE_TEXT, "readonly").objectStore(DbConst.DB_STORE_TEXT);
        const reqFind = objStore.get(pKey);
        reqFind.onsuccess = function(evt) {
            const fhcEntry = evt.target.result;
            if (fhcEntry) {
                //console.log("primaryKey " + primaryKey + " found in the object store.");
                //console.log("Sending a " + fhcEvent.action + " message to tab " + fhcEvent.targetTabId + " for fieldname " + fhcEvent.name + " id " + fhcEvent.id);
                const fhcEvent = {
                    action:   "formfieldValueResponseSingle",
                    id:       "",
                    name:     fhcEntry.name,
                    nodeName: fhcEntry.type,
                    value:    fhcEntry.value
                };
                browser.tabs.sendMessage(tabId, fhcEvent);
                // TODO Does this mean this value is used now and used-count and lastused-date should be updated?
            } else {
                console.log("did not find primary key " + primaryKey);
            }
        };
        reqFind.onerror = function(/*evt*/) {
            console.error("error getting primary key " + primaryKey, this.error);
        };
    }
}

/**
 * Menu item click event listener, perform action given the ID of the menu item that was clicked.
 */
getBrowserMenusOnClickedHandler().addListener(function(info, tab) {
    switch (info.menuItemId) {
        case "manage":
        case "manageTools":
            // console.log("Manage history from context menu clicked...");
            WindowUtil.createOrFocusWindow(FHC_WINDOW_MANAGE);
            break;

        case "options":
        case "optionsTools":
            // console.log("Options from context menu clicked...");
            WindowUtil.createOrFocusWindow(FHC_WINDOW_OPTIONS);
            break;

        case "restoreEditorField":
            // this is now a parent-menu
            // WindowUtil.notify("Not implemented yet!");
            break;

        case "clearFields":
        case "fillMostRecent":
        case "fillMostUsed":
            fillformfields(tab.id, info.menuItemId);
            break;

        case "showformfields":
        case "showformfieldsBA":
            showformfields(tab.id);
            break;

        case "editfldMore":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_MANAGE);
            break;

        case "preferences":
        case "preferencesBA":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_OPTIONS);
            break;

        case "about":
        case "aboutBA":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_ABOUT);
            break;

        case "helpoverview":
        case "helpoverviewBA":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_HELP);
            break;

        case "releasenotes":
        case "releasenotesBA":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_RELNOTES);
            break;

        default:
            if (info.menuItemId.startsWith('editfld')) {
                const pKey = info.menuItemId.replace('editfld','');
                //console.log('Restore editorfield request with pKey ' + pKey + ' from context menu for tabId ' + tab.id);
                getSingleElementByPrimaryKeyAndNotify(pKey, tab.id);
            }
    }
});


/**
 * Cross browser (Firefox, Chrome) create menus.
 */
function browserMenusCreate(menuProperties, onMenuCreated) {
    if (IS_FIREFOX) {
        return browser.menus.create(menuProperties, onMenuCreated);
    } else {
        // strip unsupported icons
        delete menuProperties['icons'];
        // skip unsupported "tools_menu" context
        if (menuProperties.contexts.includes("tools_menu")) {
            return null;
        }
        return chrome.contextMenus.create(menuProperties, onMenuCreated);
    }
}

/**
 * Cross browser (Firefox, Chrome) remove menu.
 */
function browserMenusRemove(menuItemId, onMenuRemoved) {
    if (IS_FIREFOX) {
        return browser.menus.remove(menuItemId, onMenuRemoved);
    }
    return chrome.contextMenus.remove(menuItemId, onMenuRemoved);
}

/**
 * Cross browser (Firefox, Chrome) return onClicked handler.
 */
function getBrowserMenusOnClickedHandler() {
    if (IS_FIREFOX) {
        return browser.menus.onClicked;
    }
    return chrome.contextMenus.onClicked;
}