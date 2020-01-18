/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

class MiscUtil {

    static getHostnameFromUrlString(url) {
        if (url.trim() === '') {
            return '';
        }
        if (url.toLowerCase().startsWith('file:')) {
            return 'localhost';
        }
        const link = document.createElement('a');
        link.setAttribute('href', url);
        return link.hostname;
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