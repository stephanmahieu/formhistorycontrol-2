'use strict';


browser.tabs.onActivated.addListener(handleActivated);

function handleActivated(activeInfo) {
    console.log("Tab " + activeInfo.tabId + " was activated");
    // TODO pre-populate restore EditorField menu with submenu-items from db
    // maybe use sendMessage to get data from collectFormData.js, also update submenu-items on each editorfield db update
}


function onMenuCreated() {
  if (browser.runtime.lastError) {
    console.error(`Error: ${browser.runtime.lastError}`);
  } else {
    console.log("MenuItem created successfully");
  }
}


/*
Create the Tools context menu items.
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
Create the context menu items.
*/
console.log('The max no of menu-items is: ' + browser.menus.ACTION_MENU_TOP_LEVEL_LIMIT);
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
    id: "separator-1",
    type: "separator",
    contexts: ["page","editable"]
}, onMenuCreated);

browser.menus.create({
    id: "restoreEditorField",
    title: browser.i18n.getMessage("contextMenuItemRestoreEditorField"),
    contexts: ["editable"],
    icons: {
        "16": "/theme/icons/menu/16/refresh.png",
        "32": "/theme/icons/menu/32/refresh.png"
    }
}, onMenuCreated);

browser.menus.create({
    id: "separator-2",
    type: "separator",
    contexts: ["editable"]
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
    id: "separator-3",
    type: "separator",
    contexts: ["page","editable"]
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
    id: "separator-4",
    type: "separator",
    contexts: ["page","editable"]
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
    // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/sendMessage
    //console.log('Sending a message to tab ' + tabId);
    browser.tabs.sendMessage(tabId, {
        action: "showformfields",
        targetTabId: tabId
    });
}

function fillformfields(tabId, action) {
    // send without checking response
    // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/sendMessage
    //console.log('Sending a message to tab ' + tabId);
    browser.tabs.sendMessage(tabId, {
        action: action,
        targetTabId: tabId
    });
}


/**
 * Menu item click event listener, perform action given the ID of the menu item that was clicked.
 */
browser.menus.onClicked.addListener(function(info, tab) {
    switch (info.menuItemId) {
        case "manage":
        case "manageTools":
            console.log("Manage history from context menu clicked...");
            WindowUtil.createOrFocusWindow(FHC_WINDOW_MANAGE);
            break;

        case "options":
        case "optionsTools":
            console.log("Options from context menu clicked...");
            WindowUtil.createOrFocusWindow(FHC_WINDOW_OPTIONS);
            break;

        case "restoreEditorField":
            // TODO implement restoreEditorField (need to pre-populate with submenu-items)
            // populate with the last 5 updated/inserted items + last 5 items from the current domain, need to do this after each tab/focus change
            WindowUtil.notify("Not implemented yet!");
            break;

        case "clearFields":
        case "fillMostRecent":
        case "fillMostUsed":
            fillformfields(tab.id, info.menuItemId);
            break;

        case "showformfields":
            showformfields(tab.id);
            break;
    }
});
