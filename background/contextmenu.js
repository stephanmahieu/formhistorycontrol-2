'use strict';

function onMenuCreated() {
  if (browser.runtime.lastError) {
    console.error(`Error: ${browser.runtime.lastError}`);
  } else {
    console.log("MenuItem created successfully");
  }
}

/*
Create the context menu items.
*/
browser.contextMenus.create({
  id: "manage",
  title: browser.i18n.getMessage("contextMenuItemManageHistory"),
  contexts: ["all"]
}, onMenuCreated);

browser.contextMenus.create({
  id: "separator-1",
  type: "separator",
  contexts: ["all"]
}, onMenuCreated);

browser.contextMenus.create({
    id: "restoreEditorField",
    title: browser.i18n.getMessage("contextMenuItemRestoreEditorField"),
    contexts: ["all"]
}, onMenuCreated);

browser.contextMenus.create({
    id: "separator-2",
    type: "separator",
    contexts: ["all"]
}, onMenuCreated);

browser.contextMenus.create({
    id: "fillMostRecent",
    title: browser.i18n.getMessage("contextMenuItemFillMostRecent"),
    contexts: ["all"]
}, onMenuCreated);

browser.contextMenus.create({
    id: "fillMostUsed",
    title: browser.i18n.getMessage("contextMenuItemFillMostUsed"),
    contexts: ["all"]
}, onMenuCreated);

browser.contextMenus.create({
    id: "clearFields",
    title: browser.i18n.getMessage("contextMenuItemClearFields"),
    contexts: ["all"]
}, onMenuCreated);

browser.contextMenus.create({
    id: "separator-3",
    type: "separator",
    contexts: ["all"]
}, onMenuCreated);

browser.contextMenus.create({
    id: "showformfields",
    title: browser.i18n.getMessage("contextMenuItemShowformfields"),
    contexts: ["all"]
}, onMenuCreated);

browser.contextMenus.create({
    id: "separator-4",
    type: "separator",
    contexts: ["all"]
}, onMenuCreated);

browser.contextMenus.create({
    id: "options",
    title: browser.i18n.getMessage("contextMenuItemOptions"),
    contexts: ["all"]
}, onMenuCreated);




function showformfields(tabId) {
    // send without checking response
    // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/sendMessage
    console.log('Sending a message to tab ' + tabId);
    browser.tabs.sendMessage(tabId, {
        action: "showformfields",
        targetTabId: tabId
    });
}

function fillformfields(tabId, action) {
    // send without checking response
    // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/sendMessage
    console.log('Sending a message to tab ' + tabId);
    browser.tabs.sendMessage(tabId, {
        action: action,
        targetTabId: tabId
    });
}


/**
 * Menu item click event listener, perform action given the ID of the menu item that was clicked.
 */
browser.contextMenus.onClicked.addListener(function(info, tab) {
    switch (info.menuItemId) {
        case "manage":
            console.log("Manage history from context menu clicked...");
            WindowUtil.createOrFocusWindow(FHC_WINDOW_MANAGE);
            break;

        case "options":
            console.log("Options from context menu clicked...");
            WindowUtil.createOrFocusWindow(FHC_WINDOW_OPTIONS);
            break;

        case "restoreEditorField":
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
