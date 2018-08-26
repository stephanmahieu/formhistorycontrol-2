/*
 * Copyright (c) 2018. Stephan Mahieu
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

    static getMultilineThresholds() {
        const defaultValue = {age: 10, length: 500};
        return new Promise((resolve, reject) => {
            browser.storage.local.get({prefMultilineThresholds: defaultValue}).then(
                result => {
                    resolve(result.prefMultilineThresholds);
                },
                () => {
                    resolve(defaultValue);
                }
            );
        });
    }

    static getCleanupPrefs() {
        return new Promise((resolve, reject) => {
            browser.storage.local.get({
                prefAutomaticCleanup: CleanupConst.DEFAULT_DO_CLEANUP,
                prefKeepDaysHistory : CleanupConst.DEFAULT_DAYS_TO_KEEP
            }).then(
                result => {
                    resolve(result);
                },
                () => {
                    resolve(result);
                }
            );
        });
    }

    static getFilterPrefs() {
        return new Promise((resolve, reject) => {
            browser.storage.local.get({
                prefDomainFilter: 'all',
                prefDomainList  : [],
                prefFieldList   : []
            }).then(
                result => {
                    resolve(result);
                },
                () => {
                    resolve(result);
                }
            );
        });
    }

    static isDomainfilterActive(filterPrefs) {
        return 'all' === filterPrefs.prefDomainFilter;
    }

    static isDomainBlocked(domain, filterPrefs) {
        switch (filterPrefs.prefDomainFilter) {
            case 'all':
                return false;

            case 'blacklist':
                return filterPrefs.prefDomainList.includes(domain);

            case 'whitelist':
                return !filterPrefs.prefDomainList.includes(domain);

            default:
                console.warn('Unimplemented domainfilter ' + filterPrefs.prefDomainFilter);
                return false;
        }
    }

    static isTextFieldBlocked(fieldname, filterPrefs) {
        return filterPrefs.prefFieldList.length > 0 && filterPrefs.prefFieldList.includes(fieldname);
    }

}
