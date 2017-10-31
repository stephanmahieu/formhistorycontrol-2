'use strict';

browser.tabs.onActivated.addListener(handleActivated);

// initially set the EditorFieldRestoreMenu for the current active tab
updateEditorFieldRestoreMenuForActiveTab();

function handleActivated(activeInfo) {
    // console.log("Tab " + activeInfo.tabId + " was activated");
    // create submenu-items for multiline restore
    updateEditorFieldRestoreMenu(activeInfo.tabId);
}

function updateEditorFieldRestoreMenuForActiveTab() {
    browser.tabs.query({active: true}).then(tabInfo=>{
        if (tabInfo.length === 1) {
            // console.log('Init: updateEditorFieldRestoreMenu for tabId ' + tabInfo[0].id);
            updateEditorFieldRestoreMenu(tabInfo[0].id);
        }
    });
}


const MAX_LENGTH_EDITFIELD_ITEM = 35;
const editorFieldsMenuItemsIds = [];

function updateEditorFieldRestoreMenu(tabId) {
    browser.tabs.get(tabId).then(tabInfo => {
        if (tabInfo.status === 'loading') {
            // console.log('TabId ' + tabId + ' not completely loaded yet, retry getting tabInfo in 1 sec...');
            setTimeout(()=>{ updateEditorFieldRestoreMenu(tabId); }, 1000);
        } else {
            const hostname = getHostnameFromUrlString(tabInfo.url);
            // console.log('TabId ' + tabId + ' was activated and has url: ' + tabInfo.url + '  (' + hostname + ')');

            removeCurrentMenuItems(editorFieldsMenuItemsIds)
            .then(() => {
                return getEditorFieldsByHostname(hostname, 10);
            }).then(hostnameItemsArray => {
                hostnameItemsArray.forEach(item => {editorFieldsMenuItemsIds.push(item);});
            }).then(()=>{
                return getEditorFieldsByLastused(hostname, 10);
            }).then(lastusedItemsArray => {
                lastusedItemsArray.forEach(item => {editorFieldsMenuItemsIds.push(item);});
            }).then(()=>{
                // editorFieldsMenuItemsIds.forEach(item => { console.log('- ' + item.type + ' ' + item.pKey + '  ' + item.value); });
                return addNewMenuItems(editorFieldsMenuItemsIds);
            });
        }
    });
}

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
    return browser.menus.create({
        id:       id,
        parentId: "restoreEditorField",
        title:    title,
        contexts: ["all"],
        enabled:  enabled,
        icons:    icons
    }, onMenuCreated);
}

function createSubmenuSeparator(id) {
    return browser.menus.create({
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
            promisesArray.push(browser.menus.remove("editfldMoreSeparator"));
            promisesArray.push(browser.menus.remove("editfldMore"));
        }

        while (menuItemsIds.length > 0) {
            let item = menuItemsIds.pop();
            if (item.type === 'hostname' && !hostnameMenuDeleted) {
                hostnameMenuDeleted = true;
                promisesArray.push(browser.menus.remove("editfld" + item.type));
            } else if (item.type === 'lastused' && !lastusedMenuDeleted) {
                lastusedMenuDeleted = true;
                promisesArray.push(browser.menus.remove("editfld" + item.type));
            }
            promisesArray.push(browser.menus.remove("editfld" + item.pKey));
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
            if (cursor && result.length < maxItems) {
                let fhcEntry = cursor.value;
                let primaryKey = cursor.primaryKey;
                // console.log("Entry matching hostname [" + cursor.key + "] primaryKey:[" + primaryKey + "] name:[" + fhcEntry.name + "] type:[" + fhcEntry.type + "}");

                if (fhcEntry.type !== 'input') {
                    result.push({
                        type: 'hostname',
                        pKey: primaryKey,
                        last: fhcEntry.last,
                        name: fhcEntry.name,
                        value: removeTagsAndShorten(fhcEntry.value)
                    });
                }
                cursor.continue();
            }
            else {
                // no more items sort by name and date
                result.sort((a,b)=> {
                    if (a.name === b.name) return a.last - b.last;
                    let nameA = a.name.toLowerCase();
                    let nameB = b.name.toLowerCase();
                    return (nameA === nameB) ? 0 : ((nameA < nameB) ? -1 : 1);
                });
                resolve(result);
            }
        };
        req.onerror = ()=>{
            reject(this.error);
        };
    });
}

function getEditorFieldsByLastused(hostname, maxItems) {
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
                        result.push({
                            type: 'lastused',
                            pKey: primaryKey,
                            name: fhcEntry.name,
                            last: fhcEntry.last,
                            value:value
                        });
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
    let str = value.replace(/<\/?[^>]+(>|$)/g, "").replace(/[\t\r\n]+/g,' ').replace('&nbsp;',' ').replace(/[^\x20-\x7E]/g, '').replace(/\s\s+/g, ' ').trim();
    if (str.length > MAX_LENGTH_EDITFIELD_ITEM) {
        str = str.substring(0, MAX_LENGTH_EDITFIELD_ITEM-3) + '...';
    }
    return str;
}

function getHostnameFromUrlString(url) {
    if (url.toLowerCase().startsWith('file:')) {
        return 'localhost';
    }
    const link = document.createElement('a');
    link.setAttribute('href', url);
    return link.hostname;
}

function onMenuCreated() {
  if (browser.runtime.lastError) {
    console.error(`Error: ${browser.runtime.lastError}`);
  } else {
    //console.log("MenuItem created successfully");
  }
}


/*
 * Create the Tools context menu items.
 */
browser.menus.create({
    id: "FHCToolsParentMenu",
    title: browser.i18n.getMessage("extensionName"),
    contexts: ["tools_menu"],
    icons: {
        "16": "/theme/icons/fhc-16.png",
        "32": "/theme/icons/fhc-32.png"
    }
}, onMenuCreated);
browser.menus.create({
    id: "manageTools",
    parentId: "FHCToolsParentMenu",
    title: browser.i18n.getMessage("contextMenuItemManageHistory"),
    contexts: ["tools_menu"],
    icons: {
        "16": "/theme/icons/fhc-16.png",
        "32": "/theme/icons/fhc-32.png"
    }
}, onMenuCreated);
browser.menus.create({
    id: "optionsTools",
    parentId: "FHCToolsParentMenu",
    title: browser.i18n.getMessage("contextMenuItemOptions"),
    contexts: ["tools_menu"],
    icons: {
        "16": "/theme/icons/menu/16/preferences.png",
        "32": "/theme/icons/menu/32/preferences.png"
    }
}, onMenuCreated);


/*
 * Create the context menu items.
 */
// console.log('The max no of menu-items is: ' + browser.menus.ACTION_MENU_TOP_LEVEL_LIMIT);
browser.menus.create({
    id: "manage",
    title: browser.i18n.getMessage("contextMenuItemManageHistory"),
    contexts: ["all"],
    icons: {
        "16": "/theme/icons/fhc-16.png",
        "32": "/theme/icons/fhc-32.png"
    }
}, onMenuCreated);

browser.menus.create({
    type: "separator",
    contexts: ["page","editable","frame"]
}, onMenuCreated);

browser.menus.create({
    id: "restoreEditorField",
    title: browser.i18n.getMessage("contextMenuItemRestoreEditorField"),
    contexts: ["all"],
    icons: {
        "16": "/theme/icons/menu/16/refresh.png",
        "32": "/theme/icons/menu/32/refresh.png"
    }
}, onMenuCreated);

browser.menus.create({
    type: "separator",
    contexts: ["page","editable","frame"]
}, onMenuCreated);

browser.menus.create({
    id: "fillMostRecent",
    title: browser.i18n.getMessage("contextMenuItemFillMostRecent"),
    contexts: ["all"],
    icons: {
        "16": "/theme/icons/menu/16/fillfields.png",
        "32": "/theme/icons/menu/32/fillfields.png"
    }
}, onMenuCreated);

browser.menus.create({
    id: "fillMostUsed",
    title: browser.i18n.getMessage("contextMenuItemFillMostUsed"),
    contexts: ["all"],
    icons: {
        "16": "/theme/icons/menu/16/fillfields.png",
        "32": "/theme/icons/menu/32/fillfields.png"
    }
}, onMenuCreated);

browser.menus.create({
    id: "clearFields",
    title: browser.i18n.getMessage("contextMenuItemClearFields"),
    contexts: ["all"],
    icons: {
        "16": "/theme/icons/menu/16/emptyfields.png",
        "32": "/theme/icons/menu/32/emptyfields.png"
    }
}, onMenuCreated);

browser.menus.create({
    type: "separator",
    contexts: ["page","editable","frame"]
}, onMenuCreated);

browser.menus.create({
    id: "showformfields",
    title: browser.i18n.getMessage("contextMenuItemShowformfields"),
    contexts: ["all"],
    icons: {
        "16": "/theme/icons/menu/16/showfields.png",
        "32": "/theme/icons/menu/32/showfields.png"
    }
}, onMenuCreated);

browser.menus.create({
    type: "separator",
    contexts: ["page","editable","frame"]
}, onMenuCreated);

browser.menus.create({
    id: "options",
    title: browser.i18n.getMessage("contextMenuItemOptions"),
    contexts: ["all"],
    icons: {
        "16": "/theme/icons/menu/16/preferences.png",
        "32": "/theme/icons/menu/32/preferences.png"
    }
}, onMenuCreated);




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
browser.menus.onClicked.addListener(function(info, tab) {
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
            showformfields(tab.id);
            break;

        case "editfldMore":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_MANAGE);
            break;

        default:
            if (info.menuItemId.startsWith('editfld')) {
                const pKey = info.menuItemId.replace('editfld','');
                //console.log('Restore editorfield request with pKey ' + pKey + ' from context menu for tabId ' + tab.id);
                getSingleElementByPrimaryKeyAndNotify(pKey, tab.id);
            }
    }
});
