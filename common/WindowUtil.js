/*
 * Copyright (c) 2023. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

const FHC_WINDOW_MANAGE  = { path:"popup/tableview/popup-big.html", width:1000, height:500, type:"popup", currentId: -1, pref: 'prefPosSizeTableview' };
const FHC_WINDOW_OPTIONS = { path:"popup/options/options.html",     width: 600, height:450, type:"popup", currentId: -1, pref: 'prefPosSizeOptions' };
const FHC_WINDOW_ABOUT   = { path:"popup/about/about.html",         width: 600, height:300, type:"popup", currentId: -1, pref: 'prefPosSizeAbout' };
const FHC_WINDOW_IMPORT  = { path:"popup/importexport/import.html", width: 350, height:250, type:"popup", currentId: -1, pref: 'prefPosSizeImport' };
const FHC_WINDOW_EXPORT  = { path:"popup/importexport/export.html", width: 350, height:250, type:"popup", currentId: -1, pref: 'prefPosSizeExport' };
const FHC_WINDOW_ENTRYVW = { path:"popup/entryview/entryview.html", width: 550, height:315, type:"popup", currentId: -1, pref: 'prefPosSizeEntryview' };
const FHC_WINDOW_EDITRVW = { path:"popup/entryview/entryview.html", width: 550, height:415, type:"popup", currentId: -1, pref: 'prefPosSizeEntryview' }; // same pref as entryvw

const FHC_WINDOW_HELP     = { path:"https://stephanmahieu.github.io/fhc-home/",                               width: 990, height:900, type:"normal", currentId: -1, tabId: -1 };
const FHC_WINDOW_RELNOTES = { path:"https://stephanmahieu.github.io/fhc-home/ReleaseNotes/fhc-releasenotes/", width: 990, height:900, type:"normal", currentId: -1, tabId: -1 };

const FHC_ALL_POPUPS = [FHC_WINDOW_MANAGE, FHC_WINDOW_OPTIONS, FHC_WINDOW_ABOUT, FHC_WINDOW_IMPORT, FHC_WINDOW_EXPORT, FHC_WINDOW_ENTRYVW, FHC_WINDOW_EDITRVW];

// these paths are shown in tabs in the same window
const TAB_GROUP = [FHC_WINDOW_HELP, FHC_WINDOW_RELNOTES];

class WindowUtil {

    static isDatabaseAccessible() {
        try {
            indexedDB.open(DbConst.DB_NAME, DbConst.DB_VERSION);
            return true
        } catch (ex) {
            console.error("Error opening database: " + ex.name + ": " + ex.message + "\nEnabling cookies might resolve this.");
            WindowUtil.showModalError({titleId:'dialogErrorTitleDatabase', msgId:'databaseError', args:ex.name});
        }
        return false;
    }

    // /**
    //  * Show a notification message.
    //  * @param i18nTitleId
    //  * @param i18nMessageId
    //  * @param clearTimeout
    //  */
    // static notify(i18nTitleId, i18nMessageId, clearTimeout= 0) {
    //     browser.notifications.create({
    //         "type": "basic",
    //         "iconUrl": browser.extension.getURL("theme/icons/fhc-48.png"),
    //         "title": browser.i18n.getMessage(i18nTitleId),
    //         "message": browser.i18n.getMessage(i18nMessageId)
    //     }).then((notId) => {
    //         if (clearTimeout) {
    //             setTimeout(()=>{ browser.notifications.clear(notId); }, clearTimeout);
    //         }
    //     });
    // }


    static createOrFocusWindow(fhcWindowObject) {
        browser.windows.getAll({populate: true}).then((windows) => {
            let curWindow;
            for (let item of windows) {
                if (item.id === fhcWindowObject.currentId) {
                    curWindow = item;
                }
            }
            curWindow ? this.focusPopupWindow(curWindow, fhcWindowObject) : this.createNewPopupWindow(fhcWindowObject);
        });
    }

    static focusPopupWindow(curWindow, fhcWindowObject) {
        let newState = curWindow.state;
        if (newState === "minimized" || newState === "docked" ) {
            newState = "normal";
        }

        // are we using tabs?
        if ('tabId' in fhcWindowObject) {
            let tabExists = false;
            curWindow.tabs.forEach((tab) => {
                if (tab.id === fhcWindowObject.tabId) {
                    tabExists = true;
                }
            });

            if (tabExists) {
                // show existing tab
                browser.tabs.update(fhcWindowObject.tabId, {active: true});
            } else {
                // open url in a new tab
                browser.tabs.create({url: fhcWindowObject.path}).then((createdTabInfo) => {
                    fhcWindowObject.tabId = createdTabInfo.id;
                });
            }
        }

        // make sure the window is visible
        browser.windows.update(curWindow.id, {focused: true, state: newState, drawAttention: true});
    }

    static createNewPopupWindow(fhcWindowObject) {
        let popupURL = fhcWindowObject.path.startsWith('http') ? fhcWindowObject.path : browser.runtime.getURL(fhcWindowObject.path);
        WindowUtil._getWindowPrefs(fhcWindowObject).then((fhcWindowObject) => {
            browser.windows.create({
                url: popupURL,
                type: fhcWindowObject.type,
                height: fhcWindowObject.height,
                width: fhcWindowObject.width,
                left: fhcWindowObject.left,
                top: fhcWindowObject.top
            }).then(
                (windowInfo) => {
                    // console.log(`Created window: ${windowInfo.id} (${fhcWindowObject.path})`);
                    fhcWindowObject.currentId = windowInfo.id;

                    // Workaround for bug https://bugzilla.mozilla.org/show_bug.cgi?id=1271047
                    // - Panel window type is not opening on given position.
                    browser.windows.update(windowInfo.id, {
                        left: fhcWindowObject.left,
                        top: fhcWindowObject.top
                    });

                    if ('tabId' in fhcWindowObject) {
                        // only one tab in the newly created window
                        fhcWindowObject.tabId = windowInfo.tabs[0].id;

                        // set windowId for all (future) url's to be displayed as tabs in this window
                        TAB_GROUP.forEach((wObj) => {
                            wObj.currentId = windowInfo.id;
                        });
                    }

                    if (fhcWindowObject.path.includes('options.html')) {
                        setTimeout(()=>{ WindowUtil._optionsCloseButton(fhcWindowObject); }, 250);
                    }
                },
                (error) => {
                    console.error(`Error: ${error}`);
                }
            );
        });
    }

    /**
     * Restore the window identified by its windowID to its original size and default position. Position is relative to
     * the browser window.
     * @param windowID
     * @param fhcWindowObject
     */
    static restoreToDefault(windowID, fhcWindowObject) {
        browser.windows.getAll({populate: false, windowTypes: ['normal']}).then((windows) => {
            // try to find the browser window (assume smallest id represents the originating browser window)
            let browserWin = null;
            for (let item of windows) {
                if (!browserWin || item.id < browserWin.id) {
                    browserWin = item;
                }
            }
            browser.windows.update(windowID, {
                focused: true,
                left: (browserWin) ? browserWin.left+22 : 22,
                top: (browserWin) ? browserWin.top+22 : 22,
                width: fhcWindowObject.width,
                height: fhcWindowObject.height
            });
        });
    }

    static saveWindowPrefs(fhcWindowObject) {
        browser.storage.local.get({prefSaveWindowProperties: false}).then(pref => {
            if (pref.prefSaveWindowProperties) {
                const winPrefs = {
                    [fhcWindowObject.pref]: {
                        width: window.outerWidth,
                        height: window.outerHeight,
                        top: window.screenY,
                        left: window.screenX
                    }
                };
                browser.storage.local.set(winPrefs);
            }
        });
    }

    static _getWindowPrefs(fhcWindowObject) {
        return new Promise((resolve, reject) => {
            browser.storage.local.get({[fhcWindowObject.pref]: null, prefSaveWindowProperties: false}).then(
                pref => {
                    if (pref.prefSaveWindowProperties && pref[fhcWindowObject.pref]) {
                        // overwrite existing properties with the same key
                        // const fhcWindowObjectClone = Object.assign(fhcWindowObject, pref[fhcWindowObject.pref]);
                        const fhcWindowObjectClone = Object.create(fhcWindowObject);
                        fhcWindowObjectClone.top = pref[fhcWindowObject.pref].top;
                        fhcWindowObjectClone.left = pref[fhcWindowObject.pref].left;
                        fhcWindowObjectClone.width = pref[fhcWindowObject.pref].width;
                        fhcWindowObjectClone.height = pref[fhcWindowObject.pref].height;
                        resolve(fhcWindowObjectClone);
                    } else {
                        // no existing pref
                        resolve(fhcWindowObject);
                    }
                },
                () => {
                    resolve(fhcWindowObject);
                }
            );
        });
    }

    static checkAndSaveCurrentWindowPosition(fhcWindowObject) {
        // save current position when different from the stored position
        if (fhcWindowObject.pref === 'prefPosSizeOptions' && document.body.clientHeight > 600) {
            // do not remember size and position for options window opened from outside the add-on
            return;
        }
        browser.storage.local.get({[fhcWindowObject.pref]: null, prefSaveWindowProperties: false}).then(
            pref => {
                if (pref.prefSaveWindowProperties) {
                    if (pref[fhcWindowObject.pref]) {
                        // existing pref saved before
                        const curPref = pref[fhcWindowObject.pref];
                        if (window.screenY !== curPref.top || window.screenX !== curPref.left) {
                            // update existing pref with changed position
                            WindowUtil.saveWindowPrefs(fhcWindowObject);
                        }
                    } else {
                        // save new pref with current position
                        WindowUtil.saveWindowPrefs(fhcWindowObject);
                    }
                }
            }
        );
    }

    static removeAllSavedWindowPrefs() {
        return new Promise((resolve, reject) => {
            // remove all stored positions and sizes
            const keysToRemove = [];
            FHC_ALL_POPUPS.forEach(fhcWindowObject => {
                keysToRemove.push(fhcWindowObject.pref);
            });
            browser.storage.local.remove(keysToRemove).then(()=>{
                // notify popups to resize and reposition themselves
                browser.runtime.sendMessage({eventType: 808});
                resolve();
            }, (errorMsg)=>{
                reject(errorMsg);
            });
        });
    }

    static _optionsCloseButton(fhcWindowObject) {
        // console.log('_optionsCloseButton, path=' + fhcWindowObject.path);
        // Send a notification to the options popup (via a background-script) that it should add a close-button.
        // The background script re-sends the message delayed (as 999) to give the popup time to finish loading.
        // We can not delay here because when the popup that triggered this event closes, the timed delay would be
        // cancelled and no message would be sent.
        setTimeout(()=>{browser.runtime.sendMessage({eventType: 998});}, 100);
        setTimeout(()=>{browser.runtime.sendMessage({eventType: 998});}, 250);
        setTimeout(()=>{browser.runtime.sendMessage({eventType: 998});}, 500);
    }

    static closeThisPopup() {
        let getting = browser.windows.getCurrent({populate: false});
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

    static showModalInformation(messageObj) {
        return WindowUtil.showModalDialog(messageObj, 'modal-information');
    }
    static showModalWarning(messageObj) {
        return WindowUtil.showModalDialog(messageObj, 'modal-warning');
    }
    static showModalError(messageObj) {
        return WindowUtil.showModalDialog(messageObj, 'modal-error');
    }
    static showModalYesNo(messageObj) {
        return WindowUtil.showModalDialog(messageObj, 'modal-question', 'YesNo');
    }

    static showModalDialog(messageObj, iconClass, buttons) {
        const dlgTitle = document.createElement('span');
        dlgTitle.classList.add('modal-title');
        dlgTitle.appendChild(document.createTextNode(browser.i18n.getMessage(messageObj.titleId)));

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
        dlgText.appendChild(document.createTextNode(browser.i18n.getMessage(messageObj.msgId, messageObj.args)));

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
            document.addEventListener('keyup', WindowUtil.doCancelModalDialog);
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
        const dialogs = document.getElementsByClassName('modal');
        if (dialogs.length > 0 ) {
            const dialog = dialogs.item(0);
            dialog.removeEventListener('click', WindowUtil.removeModalDialog);
            document.removeEventListener('keyup', WindowUtil.doCancelModalDialog);
            document.body.removeChild(dialog);
        }
    }

    static _createDialogButton(i18nNameId, classname) {
        const dlgButton = document.createElement('button');
        dlgButton.appendChild(document.createTextNode(browser.i18n.getMessage(i18nNameId)));
        dlgButton.classList.add(classname, 'modal-button');
        return dlgButton;
    }

    static isModalDialogActive() {
        return (document.getElementsByClassName('modal').length > 0);
    }

    static doCancelModalDialog() {
        let closeElem;
        Array.from(document.getElementsByClassName('modal-button')).forEach(elem => {
            if (elem.classList.contains('modal-cancel') || elem.classList.contains('modal-no')) {
                elem.click();
            } else if (elem.classList.contains('modal-close')) {
                closeElem = elem;
            }
        });
        if (closeElem) {
            closeElem.click();
        }
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


    static showContextMenu(event, queryContainerElement) {
        event.preventDefault();

        // keep a margin between the edge of the menu and the window
        const edgeMargin = 10;

        const winRect = document.querySelector(queryContainerElement).getBoundingClientRect();
        const mnuWrapper = document.getElementById('context-menu-wrapper');

        document.getElementById('context-menu-container').style.display = 'block';
        const menuRect = mnuWrapper.getBoundingClientRect();

        // get the mouse position and apply an offset to get the mouse-pointer on the first item
        let x = Math.max(edgeMargin, event.pageX - 60);
        let y = Math.max(edgeMargin, event.pageY - 20);

        // check if we're near the right edge of the window
        if (x > winRect.width - (menuRect.width + edgeMargin)) {
            x = winRect.width - (menuRect.width + edgeMargin);
        }

        // check if we're near the bottom edge of the window
        if (y > winRect.height - (menuRect.height + edgeMargin)) {
            y = winRect.height - (menuRect.height + edgeMargin);
        }

        mnuWrapper.style.top = y + "px";
        mnuWrapper.style.left = x + "px";

        // trigger the transition
        mnuWrapper.classList.add('show');

        mnuWrapper.addEventListener("mouseleave", function hide() {
            mnuWrapper.removeEventListener("mouseleave", hide);
            WindowUtil.hideContextMenu();
        });
    }

    static hideContextMenuOnClick(event) {
        // only close the context-menu if clicked outside
        if (!document.getElementById('context-menu-wrapper').contains(event.target)) {
            WindowUtil.hideContextMenu();
        }
    }

    static hideContextMenu() {
        document.getElementById('context-menu-wrapper').classList.remove('show');
        window.setTimeout(()=>{document.getElementById('context-menu-container').style.display = 'none';}, 200);
    }

    static isContextMenuShown() {
        return document.getElementById('context-menu-wrapper').classList.contains('show');
    }

    /**
     * Convert HTML to a human readable text by stripping all tags but keeping the same look by adding breaks
     * and asterix's for lists.
     *
     * @param html
     * @returns {string}
     */
    static htmlToReadableText(html) {
        // replace titles (<h1>) and paragraph ends with 2 line breaks
        let text = html.replace(/\s*<\/((h\d)|p)\s*>\s*/ig, ' \n\n');

        // replace div blocks with line break
        text = text.replace(/\s*<(\/div)\b[^>]*>\s*/ig, '\n');

        // replace list items with line breaks and asterix's
        text = text.replace(/\s*<(li)\b[^>]*>\s*/ig, '\n * ');

        // replace line breaks
        text = text.replace(/<(br)\b[^>]*>/ig, '\n');

        // remove comments
        text = text.replace(/<!--[\s\S]*?-->/g, '');

        // remove inline style blocks
        text = text.replace(/((<style>)|(<style type=.+))((\s+)|(\S+)|(\r+)|(\n+))(.+)((\s+)|(\S+)|(\r+)|(\n+))(<\/style>)/g, '');

        // strip all remaining tags
        text = text.replace(/<(\/|\w)[^>]*>/g, ' ');

        // convert non breaking spaces
        text = text.replace(/&nbsp;/g, ' ');

        // compress whitespace
        text = text.replace(/[ \t\f\v]+/g, ' ');

        // limit to max 2 line breaks in a row
        text = text.replace(/\n\s*?\n(\s*?\n)*/g, '\n\n');

        // trim leading and trailing spaces
        text = text.replace(/^\s+/, '').replace(/\s+$/, '');

        return text;
    }
}
