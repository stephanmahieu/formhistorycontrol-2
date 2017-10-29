
const FHC_WINDOW_MANAGE  = { path:"popup/tableview/popup-big.html", width:1000, height:500, type:"popup", currentId: -1 };
const FHC_WINDOW_OPTIONS = { path:"popup/options/options.html",     width: 400, height:300, type:"popup", currentId: -1 };
const FHC_WINDOW_ABOUT   = { path:"popup/about/about.html",         width: 600, height:300, type:"popup", currentId: -1 };
const FHC_WINDOW_IMPORT  = { path:"popup/importexport/import.html", width: 310, height:250, type:"popup", currentId: -1 };
const FHC_WINDOW_EXPORT  = { path:"popup/importexport/export.html", width: 310, height:250, type:"popup", currentId: -1 };
const FHC_WINDOW_ENTRYVW = { path:"popup/entryview/entryview.html", width: 400, height:300, type:"popup", currentId: -1 };
const FHC_WINDOW_EDITRVW = { path:"popup/entryview/entryview.html", width: 500, height:400, type:"popup", currentId: -1 };

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
            "iconUrl": browser.extension.getURL("theme/icons/fhc-48.png"),
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
                // console.log(`Created window: ${windowInfo.id} (${fhcWindowObject.path})`);
                fhcWindowObject.currentId = windowInfo.id;
                this.optionsCloseButton(fhcWindowObject);
            },
            (error) => {
                console.error(`Error: ${error}`);
            }
        );
    }

    static optionsCloseButton(fhcWindowObject) {
        if (fhcWindowObject.path.includes('options.html')) {
            // send a notification to this window so it knows it has been invoked from the app and must add a close-button
            // console.log('sending an event intended for options.html popup');
            browser.runtime.sendMessage({
                eventType: 999
            });
        }
    }

    static closeThisPopup() {
        let getting = browser.windows.getCurrent({populate: false, windowTypes: ["popup"]});
        getting.then((window) => {
            let removing = browser.windows.remove(window.id);
            removing.onRemoved = function() {
                // console.log("Window removed");
            };
            removing.onError = function() {
                console.error("Window remove error", this.error);
            }
        });
    }

    static closePopupByID(windowID) {
        let allWindows = browser.windows.getAll();
        let foundID = null;
        allWindows.then((windows) => {
            for (let item of windows) {
                if (item.id === windowID) {
                    let removing = browser.windows.remove(windowID);
                    removing.onRemoved = function() {
                        // console.log("Window removed");
                    };
                    removing.onError = function() {
                        console.error("Window remove error", this.error);
                    }
                }
            }
            if (foundID) {
                browser.windows.remove(window.id);
            }
        });
    }

    static showModalInformation(titleId, messageId) {
        WindowUtil.showModalDialog(titleId, messageId, 'modal-information');
    }
    static showModalWarning(titleId, messageId) {
        WindowUtil.showModalDialog(titleId, messageId, 'modal-warning');
    }
    static showModalError(titleId, messageId) {
        WindowUtil.showModalDialog(titleId, messageId, 'modal-error');
    }
    static showModalYesNo(titleId, messageId) {
        WindowUtil.showModalDialog(titleId, messageId, 'modal-question', 'YesNo');
    }

    static showModalDialog(titleId, messageId, iconClass, buttons) {
        const dlgTitle = document.createElement('span');
        dlgTitle.classList.add('modal-title');
        dlgTitle.appendChild(document.createTextNode(browser.i18n.getMessage(titleId)));

        const dlgClose = document.createElement('span');
        dlgClose.classList.add('modal-close', 'modal-button');

        const dlgHeader = document.createElement('div');
        dlgHeader.classList.add('modal-header');
        dlgHeader.appendChild(dlgTitle);
        dlgHeader.appendChild(dlgClose);

        const dlgIcon = document.createElement('div');
        dlgIcon.classList.add('modal-icon', iconClass);

        const dlgText = document.createElement('div');
        dlgText.classList.add('modal-message');
        dlgText.appendChild(document.createTextNode(browser.i18n.getMessage(messageId)));

        const dlgContent = document.createElement('div');
        dlgContent.classList.add('modal-content');
        dlgContent.appendChild(dlgHeader);
        dlgContent.appendChild(dlgIcon);
        dlgContent.appendChild(dlgText);

        const dialog = document.createElement('div');
        dialog.classList.add('modal');
        dialog.appendChild(dlgContent);

        if (buttons) {
            const dlgButtons = document.createElement('div');
            dlgButtons.classList.add('modal-buttons');
            if (~buttons.toLowerCase().indexOf('no')) {
                dlgButtons.appendChild(WindowUtil._createDialogButton('buttonNo', 'modal-no'));
            }
            if (~buttons.toLowerCase().indexOf('cancel')) {
                dlgButtons.appendChild(WindowUtil._createDialogButton('buttonCancel', 'modal-cancel'));
            }
            if (~buttons.toLowerCase().indexOf('yes')) {
                dlgButtons.appendChild(WindowUtil._createDialogButton('buttonYes', 'modal-yes'));
            }
            if (~buttons.toLowerCase().indexOf('okay')) {
                dlgButtons.appendChild(WindowUtil._createDialogButton('buttonOkay', 'modal-ok'));
            }
            dlgContent.appendChild(dlgButtons);
        }

        document.body.appendChild(dialog);
        if (!buttons) {
            dlgClose.addEventListener('click', WindowUtil.removeModalDialog);
            dialog.addEventListener('click', WindowUtil.removeModalDialog);
        } else  {
            return new Promise(function(resolve, reject) {
                Array.from(document.getElementsByClassName('modal-button')).forEach(elem => {
                    elem.addEventListener('click', event => {
                        let isYes = event.target.classList.contains('modal-yes');
                        let isOkay = event.target.classList.contains('modal-ok');
                        WindowUtil.removeModalDialog();
                        if (isYes || isOkay) {
                            resolve(isYes?'yes':'ok');
                        } else {
                            reject('modal dialog: user cancelled');
                        }
                    });
                });
            });
        }
    }

    static removeModalDialog() {
        const dialog = document.getElementsByClassName('modal').item(0);
        dialog.removeEventListener('click', WindowUtil.removeModalDialog);
        document.body.removeChild(dialog);
    }

    static _createDialogButton(i18nNameId, classname) {
        const dlgButton = document.createElement('button');
        dlgButton.appendChild(document.createTextNode(browser.i18n.getMessage(i18nNameId)));
        dlgButton.classList.add(classname, 'modal-button');
        return dlgButton;
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
