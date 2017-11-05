/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

class ThemeUtil {

    static switchTheme(themeTitle) {
        // disable other alternate stylesheets
        document.querySelectorAll('[rel="alternate stylesheet"]').forEach( (elem) => {
            if (themeTitle !==  elem.title) {
                elem.disabled = true;
            }
        });

        // enable alternate stylesheets
        document.querySelectorAll('[rel="alternate stylesheet"]').forEach( (elem) => {
            if (themeTitle ===  elem.title) {
                elem.disabled = false;
            }
        });
    }
}