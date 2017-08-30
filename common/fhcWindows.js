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


const WIN_OPTIONS_URL = "options/options.html";
const WIN_ABOUT_URL = "about/about.html";
const WIN_MANAGE_URL  = "popup/popup-big.html";

var currentIdWindowManageFHC;
var currentIdWindowOptionsFHC;
var currentIdWindowAboutFHC;

function onPopupManageCreated(windowInfo) {
    console.log(`Created window: ${windowInfo.id}`);
    currentIdWindowManageFHC = windowInfo.id;
}
function onPopupOptionsCreated(windowInfo) {
    console.log(`Created window: ${windowInfo.id}`);
    currentIdWindowOptionsFHC = windowInfo.id;
}
function onPopupAboutCreated(windowInfo) {
    console.log(`Created window: ${windowInfo.id}`);
    currentIdWindowAboutFHC = windowInfo.id;

    // add a listener once in order to close this popup if it loses focus
    // if (!currentIdWindowAboutFHC) {
    //     browser.windows.onFocusChanged.addListener((windowId) => {
    //         console.log("Newly focused window: " + windowId);
    //         if (currentIdWindowAboutFHC > 0 && windowId !== currentIdWindowAboutFHC) {
    //             // lost focus to another window
    //             browser.windows.remove(currentIdWindowAboutFHC);
    //             currentIdWindowAboutFHC = -1;
    //         }
    //     });
    // }

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
        case WIN_ABOUT_URL:
            return currentIdWindowAboutFHC;
        default:
            console.error("Programmer error: No global currentIdWindow variable defined for path: " + path);
    }
}

function createOrFocusWindow(path, width, height) {
    var currentWindowId = getCurrentWindowId(path);
    var allWindows = browser.windows.getAll();
    allWindows.then((windows) => {
        var curWindow = null;
        for (var item of windows) {
            if (item.id === currentWindowId) {
                curWindow = item;
            }
        }
        curWindow ? focusPopupWindow(curWindow) : createNewPopupWindow(path, width, height);
    });
}

function createNewPopupWindow(path, width, height) {
    var popupURL = browser.extension.getURL(path);
    var creating = browser.windows.create({
        url: popupURL,
        type: "popup",
        height: height,
        width: width
    });
    switch (path) {
        case WIN_MANAGE_URL:
            creating.then(onPopupManageCreated, onPopupError);
            break;
        case WIN_OPTIONS_URL:
            creating.then(onPopupOptionsCreated, onPopupError);
            break;
        case WIN_ABOUT_URL:
            creating.then(onPopupAboutCreated, onPopupError);
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
