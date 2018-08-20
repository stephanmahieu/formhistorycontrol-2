/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

class ThemeUtil {

    static switchTheme(themeTitle) {
        // disable other alternate stylesheets
        document.querySelectorAll('link.alternate_stylesheet[data-title]').forEach( (elem) => {
            let elemTitle = elem.getAttribute("data-title");
            if (themeTitle !== elemTitle) {
                elem.disabled = true;
            }
        });

        // enable alternate stylesheets
        document.querySelectorAll('link.alternate_stylesheet[data-title]').forEach( (elem) => {
            let elemTitle = elem.getAttribute("data-title");
            if (themeTitle === elemTitle) {
                elem.disabled = false;
            }
        });
    }
}