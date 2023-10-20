/*
 * Copyright (c) 2021. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

browser.runtime.onMessage.addListener(fhcEvent=>{
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 808:
                // restore this window to default size and position
                browser.windows.getCurrent({populate: false}).then((window)=>{
                    WindowUtil.restoreToDefault(window.id, FHC_WINDOW_PASSW);
                });
                break;
            case 888:
                if (fhcEvent.interfaceThemeChanged) {
                    // options have changed, reload
                    OptionsUtil.getInterfaceTheme().then(res => {
                        ThemeUtil.switchTheme(res);
                    });
                }
                break;
            case 666:
                browser.windows.getCurrent({populate: false}).then((window)=>{
                    WindowUtil.closePopupByID(window.id);
                });
                break;
        }
    }
});


document.addEventListener("DOMContentLoaded", function(/*event*/) {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    document.getElementById("buttonCancel").addEventListener("click", WindowUtil.closeThisPopup);
    document.getElementById("buttonOkay").addEventListener("click", onOkayButton);

    // no event available for window move, check periodically
    setInterval(function() {WindowUtil.checkAndSaveCurrentWindowPosition(FHC_WINDOW_ENTRYVW);}, 5*1000);
});

let resizeTimer;
window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        // resizing has stopped
        WindowUtil.saveWindowPrefs(FHC_WINDOW_PASSW);
    }, 250);
});

function onOkayButton() {
    // TODO implement password entered

    WindowUtil.closeThisPopup();
}
