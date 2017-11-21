/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

const FHC_WINDOW_MANAGE  = { path:"popup/tableview/popup-big.html", width:1000, height:500, type:"popup", currentId: -1 };
const FHC_WINDOW_OPTIONS = { path:"popup/options/options.html",     width: 450, height:330, type:"popup", currentId: -1 };
const FHC_WINDOW_ABOUT   = { path:"popup/about/about.html",         width: 600, height:300, type:"popup", currentId: -1 };
const FHC_WINDOW_IMPORT  = { path:"popup/importexport/import.html", width: 350, height:250, type:"popup", currentId: -1 };
const FHC_WINDOW_EXPORT  = { path:"popup/importexport/export.html", width: 350, height:250, type:"popup", currentId: -1 };
const FHC_WINDOW_ENTRYVW = { path:"popup/entryview/entryview.html", width: 550, height:315, type:"popup", currentId: -1 };
const FHC_WINDOW_EDITRVW = { path:"popup/entryview/entryview.html", width: 550, height:415, type:"popup", currentId: -1 };

const FHC_WINDOW_HELP     = { path:"https://formhistory.blogspot.nl/2009/06/introduction-to-form-history-control.html", width: 990, height:900, type:"normal", currentId: -1 };
const FHC_WINDOW_RELNOTES = { path:"https://formhistory.blogspot.nl/2009/05/release-notes.html",                        width: 990, height:900, type:"normal", currentId: -1 };

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
        browser.windows.getAll().then((windows) => {
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
            // Send a notification to the options popup (via a background-script) that it should add a close-button.
            // The background script re-sends the message delayed (as 999) to give the popup time to finish loading.
            // We can not delay here because when the popup that triggered this event closes, the timed delay would be
            // cancelled ans no message would be sent.

            // console.log('sending an event intended for options.html popup');
            browser.runtime.sendMessage({
                eventType: 998
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
        return WindowUtil.showModalDialog(titleId, messageId, 'modal-information');
    }
    static showModalWarning(titleId, messageId) {
        return WindowUtil.showModalDialog(titleId, messageId, 'modal-warning');
    }
    static showModalError(titleId, messageId) {
        return WindowUtil.showModalDialog(titleId, messageId, 'modal-error');
    }
    static showModalYesNo(titleId, messageId) {
        return WindowUtil.showModalDialog(titleId, messageId, 'modal-question', 'YesNo');
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

        document.getElementById('context-menu-container').style.display = 'block';
        const menuRect = document.getElementById('context-menu-wrapper').getBoundingClientRect();

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

        const mnu = document.getElementById('context-menu-wrapper');
        mnu.style.top = y + "px";
        mnu.style.left = x + "px";

        // trigger the transition
        document.getElementById('context-menu-wrapper').classList.add('show');
    }

    static hideContextMenuOnClick(event) {
        // only close the context-menu if clicked outside
        if (!document.getElementById('context-menu-wrapper').contains(event.target)) {
            WindowUtil.hideContextMenu();
        }
    }

    static hideContextMenu() {
        document.getElementById('context-menu-wrapper').classList.remove('show');
        window.setTimeout(()=>{document.getElementById('context-menu-container').style.display = 'none';}, 800);
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
