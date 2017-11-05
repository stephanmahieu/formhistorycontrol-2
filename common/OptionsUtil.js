/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

class OptionsUtil {

    static getInterfaceTheme() {
        const defaultValue = "default";
        return new Promise((resolve, reject) => {
            browser.storage.local.get({prefInterfaceTheme: defaultValue}).then(
                result => {
                    resolve(result.prefInterfaceTheme);
                },
                () => {
                    resolve(defaultValue);
                }
            );
        });
    }

    static getDateFormat() {
        const defaultValue = "automatic";
        return new Promise((resolve, reject) => {
            browser.storage.local.get({prefDateFormat: defaultValue}).then(
                result => {
                    resolve(result.prefDateFormat);
                },
                () => {
                    resolve(defaultValue);
                }
            );
        });
    }
}
