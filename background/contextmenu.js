function onMenuCreated(n) {
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


/**
 * Show a notification message.
 * @param message
 */
function notify(message) {
    var title = browser.i18n.getMessage("notificationTitle");
    var content = browser.i18n.getMessage("notificationContent", message);
    browser.notifications.create({
        "type": "basic",
        "iconUrl": browser.extension.getURL("icons/fhc-48.png"),
        "title": title,
        "message": content
    });
}



function showformfields(tabId) {
    // send without checking response
    // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/sendMessage
    console.log('Sending a message to tab ' + tabId);
    browser.tabs.sendMessage(tabId, {
        action: "showformfields"
    });
}




const WIN_OPTIONS_URL = "options/options.html";
const WIN_MANAGE_URL  = "popup/popup-big.html";

var currentIdWindowManageFHC;
var currentIdWindowOptionsFHC;

function onPopupManageCreated(windowInfo) {
    console.log(`Created window: ${windowInfo.id}`);
    currentIdWindowManageFHC = windowInfo.id;
}
function onPopupOptionsCreated(windowInfo) {
    console.log(`Created window: ${windowInfo.id}`);
    currentIdWindowOptionsFHC = windowInfo.id;
}
function onPopupError(error) {
    console.error(`Error: ${error}`);
}

function getCurrentWindowId(path) {
    switch (path) {
        case WIN_MANAGE_URL:
            return currentIdWindowManageFHC;
        case WIN_OPTIONS_URL:
            return currentIdWindowOptionsFHC;
        default:
            console.error("Programmer error: No global currentIdWindow variable defined for path: " + path);
    }
}

function createOrFocusWindow(path) {
    var currentWindowId = getCurrentWindowId(path);
    var allWindows = browser.windows.getAll();
    allWindows.then((windows) => {
        var curWindow = null;
        for (var item of windows) {
            if (item.id === currentWindowId) {
                curWindow = item;
            }
        }
        curWindow ? focusPopupWindow(curWindow) : createNewPopupWindow(path);
    });
}

function createNewPopupWindow(path) {
    var popupURL = browser.extension.getURL(path);
    var creating = browser.windows.create({
        url: popupURL,
        type: "popup",
        height: 500,
        width: 1000
    });
    switch (path) {
        case WIN_MANAGE_URL:
            creating.then(onPopupManageCreated, onPopupError);
            break;
        case WIN_OPTIONS_URL:
            creating.then(onPopupOptionsCreated, onPopupError);
            break;
        default:
            console.error("Programmer error: No onPoupupCreated method defined for path: " + path);
    }
}

function focusPopupWindow(curWindow) {
    var newState = curWindow.state;
    if (newState === "minimized" || newState === "docked" ) {
        newState = "normal;";
    }
    browser.windows.update(curWindow.id, {focused: true, state: newState, drawAttention: true});
}


/**
 * Menu item click event listener, perform action given the ID of the menu item that was clicked.
 */
browser.contextMenus.onClicked.addListener(function(info, tab) {
    switch (info.menuItemId) {
        case "manage":
            console.log("Manage history from context menu clicked...");
            createOrFocusWindow(WIN_MANAGE_URL);
            break;

        case "options":
            console.log("Options from context menu clicked...");
            createOrFocusWindow(WIN_OPTIONS_URL);
            break;

        case "restoreEditorField":
        case "fillMostRecent":
        case "fillMostUsed":
        case "clearFields":
            notify("Not implemented yet!");
            break;

        case "showformfields":
            showformfields(tab.id);
            break;
    }
});
