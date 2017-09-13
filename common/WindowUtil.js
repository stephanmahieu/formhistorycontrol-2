
const FHC_WINDOW_MANAGE  = { path:"popup/popup-big.html",     width:1000, height:500, type:"popup", currentId: -1 };
const FHC_WINDOW_OPTIONS = { path:"options/options.html",     width: 400, height:300, type:"popup", currentId: -1 };
const FHC_WINDOW_ABOUT   = { path:"about/about.html",         width: 600, height:300, type:"popup", currentId: -1 };
const FHC_WINDOW_IMPORT  = { path:"importexport/import.html", width: 400, height:300, type:"popup", currentId: -1 };
const FHC_WINDOW_EXPORT  = { path:"importexport/export.html", width: 400, height:300, type:"popup", currentId: -1 };
const FHC_WINDOW_ENTRYVW = { path:"entryview/entryview.html", width: 400, height:300, type:"popup", currentId: -1 };

class WindowUtil {

    /**
     * Show a notification message.
     * @param message
     */
    static notify(message) {
        let title = browser.i18n.getMessage("notificationTitle");
        let content = browser.i18n.getMessage("notificationContent", message);
        browser.notifications.create({
            "type": "basic",
            "iconUrl": browser.extension.getURL("icons/fhc-48.png"),
            "title": title,
            "message": content
        });
    }


    static createOrFocusWindow(fhcWindowObject) {
        let allWindows = browser.windows.getAll();
        allWindows.then((windows) => {
            let curWindow;
            for (let item of windows) {
                if (item.id === fhcWindowObject.currentId) {
                    curWindow = item;
                }
            }
            curWindow ? this.focusPopupWindow(curWindow) : this.createNewPopupWindow(fhcWindowObject);
        });
    }

    static focusPopupWindow(curWindow) {
        let newState = curWindow.state;
        if (newState === "minimized" || newState === "docked" ) {
            newState = "normal;";
        }
        browser.windows.update(curWindow.id, {focused: true, state: newState, drawAttention: true});
    }

    static createNewPopupWindow(fhcWindowObject) {
        let popupURL = browser.extension.getURL(fhcWindowObject.path);
        let creating = browser.windows.create({
            url: popupURL,
            type: fhcWindowObject.type,
            height: fhcWindowObject.height,
            width: fhcWindowObject.width
        });
        creating.then(
            (windowInfo) => {
                console.log(`Created window: ${windowInfo.id} (${fhcWindowObject.path})`);
                fhcWindowObject.currentId = windowInfo.id;
            },
            (error) => {
                console.error(`Error: ${error}`);
            }
        );
    }

    static closeThisPopup() {
        let getting = browser.windows.getCurrent({populate: false, windowTypes: ["popup"]});
        getting.then((window) => {
            let removing = browser.windows.remove(window.id);
            removing.onRemoved = function() {
                console.log("Window removed");
            };
            removing.onError = function() {
                console.error("Window remove error", this.error);
            }
        });
    }

    // snippet:
    // // add a listener once in order to close this popup if it loses focus
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
