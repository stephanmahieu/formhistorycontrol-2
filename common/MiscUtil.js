/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

class MiscUtil {

    static getHostnameFromUrlString(urlString) {
        if (urlString.trim() === '') {
            return '';
        }
        if (urlString.toLowerCase().startsWith('file:')) {
            return 'localhost';
        }
        const url = new URL(urlString);
        return url.hostname;
    }

    static copyTextToClipboard(value) {
        browser.permissions.contains({permissions: ["clipboardWrite"]}).then(result => {
            if (result) {
                window.navigator.clipboard.writeText(value).then(function() {
                    // console.log('clipboard successfully set');
                }, function() {
                    console.error('clipboard write failed!');
                });
            } else {
                console.error('Permission clipboardWrite not available!');
            }
        });
    }
}