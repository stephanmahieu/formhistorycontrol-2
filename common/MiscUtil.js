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
}