/*
 * Copyright (c) 2023. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */
'use strict';

const IS_FIREFOX = typeof browser.runtime.getBrowserInfo === 'function';
const IS_SAFARI = navigator.userAgent.includes("Safari");
console.log("IS_FIREFOX=" + IS_FIREFOX + " IS_SAFARI=" + IS_SAFARI);

browser.runtime.onMessage.addListener(receiveContextEvents);
// MF3 browser.runtime.onInstalled.addListener(receiveContextEvents);

function receiveContextEvents(fhcEvent, sender, sendResponse) {
    if (fhcEvent.eventType && fhcEvent.eventType === 888 && fhcEvent.contextmenuAvailChanged) {
        // remove the context menu and rebuild from scratch
        const promisesArray = [];
        while (CONTEXT_FIELDS_MENUITEM_IDS.length > 0) {
            let itemId = CONTEXT_FIELDS_MENUITEM_IDS.pop();
            promisesArray.push(browserMenusRemove(itemId));
        }
        Promise.all(promisesArray).then(()=>{
            browser.storage.local.get({
                prefContextmenuAvail: "page"
            }).then(res => {
                _initContextMenu(res.prefContextmenuAvail);
                _initBrowserActionSubmenu();
            });
        });
    }
    else if (fhcEvent.eventType && fhcEvent.eventType === 12345) {
        console.log('handling contextmenu shown...');
        const nodeName = fhcEvent.nodeName;
        const fieldName = fhcEvent.fieldName;
        const hostname = fhcEvent.host;

        removeCurrentMenuItems(EDITOR_FIELDS_MENUITEM_IDS, TEXT_FIELDS_MENUITEM_IDS)
        .then(() => {
            if (nodeName !== 'input') {
                return getEditorFieldsByHostname(hostname, 10);
            }
            return [];
        }).then(hostnameItemsArray => {
            hostnameItemsArray.forEach(item => {EDITOR_FIELDS_MENUITEM_IDS.push(item);});
            return hostnameItemsArray;
        }).then(hostnameItemsArray => {
            if (nodeName !== 'input') {
                return getEditorFieldsByLastused(hostname, 10, hostnameItemsArray);
            }
            return [];
        }).then(lastusedItemsArray => {
            lastusedItemsArray.forEach(item => {EDITOR_FIELDS_MENUITEM_IDS.push(item);});
        }).then(() => {
            if (nodeName === 'input') {
                return getTextFieldsByLastused(10);
            }
            return [];
        }).then(lastusedTextItemsArray => {
            lastusedTextItemsArray.forEach(item => {TEXT_FIELDS_MENUITEM_IDS.push(item);});
        }).then(()=>{
            // editorFieldsMenuItemsIds.forEach(item => { console.log('- ' + item.type + ' ' + item.pKey + '  ' + item.value); });
            return addNewMenuItems(EDITOR_FIELDS_MENUITEM_IDS, TEXT_FIELDS_MENUITEM_IDS);
        }).then(()=>{
            if (IS_FIREFOX) {
                browser.menus.update('restoreEditorField', {"enabled": (nodeName !== 'input')});
                browser.menus.update('restoreTextField', {"enabled": (nodeName === 'input')});
                browser.menus.refresh();
            } else {
                chrome.contextMenus.update('restoreEditorField', {"enabled": (nodeName !== 'input')});
                chrome.contextMenus.update('restoreTextField', {"enabled": (nodeName === 'input')});
                chrome.contextMenus.refresh();
            }
        });
    }
}

// create the context menus
initBrowserMenus();

// set the preferred shortcut keys and add a shortcutKey listener
initShortcutKeys();
browser.commands.onCommand.addListener(handleShortcutKeys);

const MAX_LENGTH_EDITFIELD_ITEM = 35;
const EDITOR_FIELDS_MENUITEM_IDS = [];
const TEXT_FIELDS_MENUITEM_IDS = [];
let contextAnonMenuItemNo = 10000;
const CONTEXT_FIELDS_MENUITEM_IDS = [];

function addNewMenuItems(menuItemsIds, menuTextItemIds) {
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
                    createSubmenuItem("editfld" + item.type, "restoreEditorField", "--- " + title + ": ---", false)
                );
            }
            promisesArray.push(
                createSubmenuItem("editfld" + item.pKey, "restoreEditorField", '[' + DateUtil.toDateStringShorter(item.last) + '] ' + item.value, true)
            );
        });
        if (menuItemsIds.length > 0) {
            promisesArray.push(
                createSubmenuSeparator("editfldMoreSeparator", "restoreEditorField")
            );
            promisesArray.push(
                createSubmenuItem("editfldMore", "restoreEditorField", browser.i18n.getMessage('contextMenuItemRestoreEditorFieldSubmenuMore'), true)
            );
        }

        menuTextItemIds.forEach(item => {
            promisesArray.push(
                createSubmenuItem("textfld" + item.pKey, "restoreTextField", '[' + DateUtil.toDateStringShorter(item.last) + '] ' + item.value, true)
            );
        });
        if (menuTextItemIds.length > 0) {
            promisesArray.push(
                createSubmenuItem("textfldMore", "restoreTextField", browser.i18n.getMessage('contextMenuItemRestoreEditorFieldSubmenuMore'), true)
            );
        }

        Promise.all(promisesArray).then(
            () => { resolve(); },
            () => { reject();  }
        );
    });
}

function createSubmenuItem(id, parentId, title, enabled) {
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
        parentId: parentId,
        title:    title,
        contexts: ["all"],
        enabled:  enabled,
        icons:    icons
    }, onMenuCreated);
}

function createSubmenuSeparator(id, parentId) {
    return browserMenusCreate({
        id:       id,
        parentId: parentId,
        type:     "separator",
        contexts: ["all"]
    }, onMenuCreated);
}

function removeCurrentMenuItems(menuItemsIds, menuItemsTextIds) {
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

        if (menuItemsTextIds.length > 0) {
            promisesArray.push(browserMenusRemove("textfldMore"));
        }
        while (menuItemsTextIds.length > 0) {
            let item = menuItemsTextIds.pop();
            promisesArray.push(browserMenusRemove("textfld" + item.pKey));
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

function getTextFieldsByLastused(maxItems) {
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

                if (fhcEntry.type == 'input') {
                    let value = removeTagsAndShorten(fhcEntry.value);
                    if (value) {
                        let item = {
                            type: 'txt_lastused',
                            pKey: primaryKey,
                            last: fhcEntry.last,
                            name: fhcEntry.name,
                            value: value
                        };
                        result.push(item);
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
    const gettingPref = browser.storage.local.get({
        prefContextmenuAvail: "page"
    });
    gettingPref.then(res => {
        const contextmenuAvail = res.prefContextmenuAvail;
        _initToolsMenu();
        _initContextMenu(contextmenuAvail);
        _initBrowserActionSubmenu();
    });
}

function _initToolsMenu() {
    /*
     * Create the Tools context menu items.
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
}

function _initContextMenu(contextmenuAvail) {
    /*
     * Create the right-click context menu.
     * Hide the menu separators for the browser-action, we may only show 6 items
     * including the separators.
     */
    const contextAll = ["browser_action", "page_action"];
    const contextPage = [];
    const contextAllButPageAction = ["browser_action"];
    const contextFillTextField = [];
    // MF3 const contextAll = ["action", "page"];
    // MF3 const contextPage = [];
    // MF3 const contextAllButPageAction = ["action"];
    // MF3 const contextFillTextField = [];

    // Empty the array
    CONTEXT_FIELDS_MENUITEM_IDS.splice(0, CONTEXT_FIELDS_MENUITEM_IDS.length);

    if (contextmenuAvail === 'page') {
        // show context menu always
        contextAll.push("page", "frame", "editable");
        contextPage.push("page");
        contextAllButPageAction.push("page", "frame", "editable");
        contextFillTextField.push("editable");
    } else if (contextmenuAvail === 'editfields') {
        // show context menu on editfields only
        contextAll.push("frame", "editable");
        contextFillTextField.push("editable");
    } else {
        // show context menu never
    }

    browserContextMenusCreate({
        id: "manage",
        title: browser.i18n.getMessage("contextMenuItemManageHistory"),
        contexts: contextAll,
        icons: {
            "16": "/theme/icons/fhc-16.png",
            "32": "/theme/icons/fhc-32.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        type: "separator",
        contexts: contextPage
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "restoreEditorField",
        title: browser.i18n.getMessage("contextMenuItemRestoreEditorField"),
        contexts: contextAll,
        icons: {
            "16": "/theme/icons/menu/16/refresh.png",
            "32": "/theme/icons/menu/32/refresh.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "restoreTextField",
        title: "Herstel tekst veld", // browser.i18n.getMessage("contextMenuItemRestoreTextField"),
        contexts: contextFillTextField,
        icons: {
            "16": "/theme/icons/menu/16/refresh.png",
            "32": "/theme/icons/menu/32/refresh.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        type: "separator",
        contexts: contextPage
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "fillMostRecent",
        title: browser.i18n.getMessage("contextMenuItemFillMostRecent"),
        contexts: contextAll,
        icons: {
            "16": "/theme/icons/menu/16/fillfields.png",
            "32": "/theme/icons/menu/32/fillfields.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "fillMostUsed",
        title: browser.i18n.getMessage("contextMenuItemFillMostUsed"),
        contexts: contextAll,
        icons: {
            "16": "/theme/icons/menu/16/fillfields.png",
            "32": "/theme/icons/menu/32/fillfields.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "clearFields",
        title: browser.i18n.getMessage("contextMenuItemClearFields"),
        contexts: contextAllButPageAction, // everywhere but page_action where max was 5 items (now 6)
        icons: {
            "16": "/theme/icons/menu/16/emptyfields.png",
            "32": "/theme/icons/menu/32/emptyfields.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        type: "separator",
        contexts: contextPage
    }, onMenuCreated);
    /*
     * Remainder only for page_action (max 6 are shown for browser-action).
     */
    browserContextMenusCreate({
        id: "showformfields",
        title: browser.i18n.getMessage("contextMenuItemShowformfields"),
        contexts: contextPage,
        icons: {
            "16": "/theme/icons/menu/16/showfields.png",
            "32": "/theme/icons/menu/32/showfields.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        type: "separator",
        contexts: contextPage
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "submenuInfo",
        title: browser.i18n.getMessage("menuItemInfoSubmenu"),
        contexts: contextPage,
        icons: {
            "16": "/theme/icons/menu/16/submenu.png",
            "32": "/theme/icons/menu/32/submenu.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "helpoverview",
        parentId: "submenuInfo",
        title: browser.i18n.getMessage("menuItemHelpOverview"),
        contexts: contextPage,
        icons: {
            "16": "/theme/icons/menu/16/help.png",
            "32": "/theme/icons/menu/32/help.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "releasenotes",
        parentId: "submenuInfo",
        title: browser.i18n.getMessage("menuItemHelpReleasenotes"),
        contexts: contextPage,
        icons: {
            "16": "/theme/icons/menu/16/releasenotes.png",
            "32": "/theme/icons/menu/32/releasenotes.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "about",
        parentId: "submenuInfo",
        title: browser.i18n.getMessage("menuItemHelpAbout"),
        contexts: contextPage,
        icons: {
            "16": "/theme/icons/menu/16/about.png",
            "32": "/theme/icons/menu/32/about.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        type: "separator",
        contexts: contextPage
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "preferences",
        title: browser.i18n.getMessage("contextMenuItemOptions"),
        contexts: contextPage,
        icons: {
            "16": "/theme/icons/menu/16/preferences.png",
            "32": "/theme/icons/menu/32/preferences.png"
        }
    }, onMenuCreated);
}

function _initBrowserActionSubmenu() {
    /*
     * Browser-action (right-click on icon in menu-bar) may only show 6 items,
     * Page-action (right-click on icon in address-bar) may only show 5 items,
     * put remainder in a submenu (browser.menus.ACTION_MENU_TOP_LEVEL_LIMIT)
     */
    browserContextMenusCreate({
        id: "submenuExtra",
        title: browser.i18n.getMessage("contextMenuItemRestoreEditorFieldSubmenuMore"),
        contexts: ["browser_action", "page_action"],
        // MF3 contexts: ["action", "page"],
        icons: {
            "16": "/theme/icons/menu/16/submenu.png",
            "32": "/theme/icons/menu/32/submenu.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "clearFieldsPA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("contextMenuItemClearFields"),
        contexts: ["page_action"],  // show only for page_action here
        // MF3 contexts: ["page"],  // show only for page_action here
        icons: {
            "16": "/theme/icons/menu/16/emptyfields.png",
            "32": "/theme/icons/menu/32/emptyfields.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        parentId: "submenuExtra",
        type: "separator",
        contexts: ["page_action"]
        // MF3 contexts: ["page"]
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "showformfieldsBA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("contextMenuItemShowformfields"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/showfields.png",
            "32": "/theme/icons/menu/32/showfields.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        parentId: "submenuExtra",
        type: "separator",
        contexts: ["all"]
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "helpoverviewBA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("menuItemHelpOverview"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/help.png",
            "32": "/theme/icons/menu/32/help.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "releasenotesBA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("menuItemHelpReleasenotes"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/releasenotes.png",
            "32": "/theme/icons/menu/32/releasenotes.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "aboutBA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("menuItemHelpAbout"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/about.png",
            "32": "/theme/icons/menu/32/about.png"
        }
    }, onMenuCreated);
    browserContextMenusCreate({
        parentId: "submenuExtra",
        type: "separator",
        contexts: ["all"]
    }, onMenuCreated);
    browserContextMenusCreate({
        id: "preferencesBA",
        parentId: "submenuExtra",
        title: browser.i18n.getMessage("contextMenuItemOptions"),
        contexts: ["all"],
        icons: {
            "16": "/theme/icons/menu/16/preferences.png",
            "32": "/theme/icons/menu/32/preferences.png"
        }
    }, onMenuCreated);
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
            } else if (info.menuItemId.startsWith('textfld')) {
                const pKey = info.menuItemId.replace('textfld','');
                //console.log('Restore textfield request with pKey ' + pKey + ' from context menu for tabId ' + tab.id);
                getSingleElementByPrimaryKeyAndNotify(pKey, tab.id);
            }
    }
});


/**
 * Cross browser (Firefox, Chrome) create menus.
 */
function browserMenusCreate(menuProperties, onMenuCreated) {
    if (menuProperties.contexts.length) {
        if (IS_FIREFOX) {
            return browser.menus.create(menuProperties, onMenuCreated);
        }
        else {
            // strip unsupported icons
            delete menuProperties['icons'];
            // skip unsupported "tools_menu" context
            if (menuProperties.contexts.includes("tools_menu")) {
                return null;
            }
            if (IS_SAFARI) {
                return browser.menus.create(menuProperties, onMenuCreated);
            }
            return chrome.contextMenus.create(menuProperties, onMenuCreated);
        }
    }
}

function browserContextMenusCreate(menuProperties, onMenuCreated) {
    if (!menuProperties.id) {
        menuProperties.id = 'noname' + (++contextAnonMenuItemNo);
    }
    CONTEXT_FIELDS_MENUITEM_IDS.push(menuProperties.id);
    browserMenusCreate(menuProperties, onMenuCreated);
}


/**
 * Cross browser (Firefox, Chrome) remove menu.
 */
function browserMenusRemove(menuItemId, onMenuRemoved) {
    if (IS_FIREFOX || IS_SAFARI) {
        return browser.menus.remove(menuItemId, onMenuRemoved);
    }
    return chrome.contextMenus.remove(menuItemId, onMenuRemoved);
}

/**
 * Cross browser (Firefox, Chrome) return onClicked handler.
 */
function getBrowserMenusOnClickedHandler() {
    if (IS_FIREFOX || IS_SAFARI) {
        return browser.menus.onClicked;
    }
    return chrome.contextMenus.onClicked;
}

function initShortcutKeys() {
    OptionsUtil.applyShortcutKeysPrefs();
}

function handleShortcutKeys(command) {
    // console.log("Command! " + command);
    OptionsUtil.getShortcutKeysEnablePrefs().then(res => {
        switch (command) {
            case "open_fhc":
                if (res.prefShortcutKeys['open_fhc_enable']) {
                    WindowUtil.createOrFocusWindow(FHC_WINDOW_MANAGE);
                }
                break;

            case "toggle_display_fields":
                if (res.prefShortcutKeys['toggle_display_fields_enable']) {
                    browser.tabs.query({active: true, currentWindow: true}).then(tabInfo => {
                        showformfields(tabInfo[0].id);
                    });
                }
                break;

            case "fill_recent":
                if (res.prefShortcutKeys['fill_recent_enable']) {
                    browser.tabs.query({active: true, currentWindow: true}).then(tabInfo => {
                        fillformfields(tabInfo[0].id, "fillMostRecent");
                    });
                }
                break;

            case "fill_often":
                if (res.prefShortcutKeys['fill_often_enable']) {
                    browser.tabs.query({active: true, currentWindow: true}).then(tabInfo => {
                        fillformfields(tabInfo[0].id, "fillMostUsed");
                    });
                }
                break;

            case "clear_filled":
                if (res.prefShortcutKeys['clear_filled_enable']) {
                    browser.tabs.query({active: true, currentWindow: true}).then(tabInfo => {
                        fillformfields(tabInfo[0].id, "clearFields");
                    });
                }
                break;
        }

    });
}