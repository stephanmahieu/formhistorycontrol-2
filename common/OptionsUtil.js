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
                    resolve();
                }
            );
        });
    }

    static getFilterPrefs() {
        return new Promise((resolve, reject) => {
            browser.storage.local.get({
                prefDomainFilter: 'all',
                prefDomainList  : [],
                prefFieldList   : [],
                prefRetainType  : 'all',
                prefSaveInIncognitoMode: false
            }).then(
                result => {
                    resolve(result);
                },
                () => {
                    resolve();
                }
            );
        });
    }

    static getShortcutKeysPrefs() {
        return new Promise((resolve, reject) => {
            browser.storage.local.get({
                prefShortcutKeys: {
                    _execute_browser_action: OptionsUtil.getDefaultShortcutKey('_execute_browser_action'),
                    open_fhc               : OptionsUtil.getDefaultShortcutKey('open_fhc'),
                    toggle_display_fields  : OptionsUtil.getDefaultShortcutKey('toggle_display_fields'),
                    fill_recent            : OptionsUtil.getDefaultShortcutKey('fill_recent'),
                    fill_often             : OptionsUtil.getDefaultShortcutKey('fill_often'),
                    clear_filled           : OptionsUtil.getDefaultShortcutKey('clear_filled')
                }
            }).then(
                result => {
                    resolve(result);
                },
                () => {
                    resolve();
                }
            );
        });
    }

    static getShortcutKeysEnablePrefs() {
        return new Promise((resolve, reject) => {
            browser.storage.local.get({
                prefShortcutKeys: {
                    open_fhc_enable               : true,
                    toggle_display_fields_enable  : true,
                    fill_recent_enable            : true,
                    fill_often_enable             : true,
                    clear_filled_enable           : true
                }
            }).then(
                result => {
                    resolve(result);
                },
                () => {
                    resolve();
                }
            );
        });
    }

    static applyShortcutKeysPrefs() {
        if (!browser.commands.update) {
            return;
        }
        OptionsUtil.getShortcutKeysPrefs().then((prefs) => {

            // get all shortcut commands (max 4 for chrome)
            browser.commands.getAll().then( (commands) => (

                // for each command change the shortcut where preference differs from default
                commands.forEach(function(command) {
                    const prefShortcut = prefs.prefShortcutKeys[command.name];
                    if (prefShortcut !== command.shortcut) {
                        browser.commands.update({
                            name: command.name,
                            shortcut: prefShortcut
                        });
                    }
                })
            ));
        });
    }

    static getDefaultShortcutKey(commandName) {
        // defaults must be equal to the defaults in manifest.json
        switch(commandName) {
            case '_execute_browser_action': return 'Alt+Shift+P';
            case 'open_fhc':                return 'Alt+Shift+F';
            case 'toggle_display_fields':   return 'Alt+Shift+D';
            case 'fill_recent':             return 'Alt+Shift+R';
            case 'fill_often':              return 'Alt+Shift+O';
            case 'clear_filled':            return 'Alt+Shift+C';
        }
    }

    static isDomainfilterActive(filterPrefs) {
        return 'all' !== filterPrefs.prefDomainFilter;
    }

    static isDomainBlocked(domain, filterPrefs) {
        if (!domain) {
            // internal browser windows like about: have no domain, add-ons can not access these
            return true;
        }

        switch (filterPrefs.prefDomainFilter) {
            case 'all':
                return false;

            case 'blacklist':
                return OptionsUtil._wildcardListMatch(domain, filterPrefs.prefDomainList);

            case 'whitelist':
                return !OptionsUtil._wildcardListMatch(domain, filterPrefs.prefDomainList);

            default:
                console.warn('Unimplemented domainfilter ' + filterPrefs.prefDomainFilter);
                return false;
        }
    }

    static isTextFieldBlocked(domain, fieldname, filterPrefs) {
        return filterPrefs.prefFieldList.length > 0 && OptionsUtil._wildcardFieldMatch(domain, fieldname, filterPrefs.prefFieldList);
    }

    static doRetainSinglelineField(filterPrefs) {
        // not multi-line only
        return 'multi' !== filterPrefs.prefRetainType;
    }

    static doRetainMultilineField(filterPrefs) {
        // not single-line only
        return 'single' !== filterPrefs.prefRetainType;
    }

    static doSaveInIncognitoMode(filterPrefs) {
        return filterPrefs.prefSaveInIncognitoMode;
    }

    static initColPrefs(columnVisPrefs) {
        let newPrefs = [];
        if (Array.isArray(columnVisPrefs)) {
            newPrefs = Array.from(columnVisPrefs);
        }
        for (let i=newPrefs.length; i<=9; i++) {
            newPrefs.push(true);
        }
        return newPrefs;
    }

    static initColSmallPrefs(columnVisPrefs) {
        const newPrefs = OptionsUtil.initColPrefs(columnVisPrefs);
        if (Array.isArray(columnVisPrefs) && columnVisPrefs.length < 9) {
            // visibility not set previously, set default hidden columns
            newPrefs[4] = false;
            newPrefs[8] = false;
            newPrefs[9] = false;
        }
        return newPrefs;
    }

    /**
     * Check if field matches any field in the fieldList,
     * if field in fieldlist contains an optional domain also check against given fieldDomain.
     */
    static _wildcardFieldMatch(fieldDomain, fieldname, fieldList) {
        return fieldList.some( (fieldItem) => {
            let filterField = fieldItem;
            let domainMatch = true;
            if (fieldItem.includes(':')) {
                // check for domain match
                domainMatch = false;
                const parts = fieldItem.split(':');
                const filterDomain = parts[0];
                filterField = parts[1];
                domainMatch = OptionsUtil._wildcardMatch(fieldDomain, filterDomain);
            }
            if (domainMatch) {
                return OptionsUtil._wildcardMatch(fieldname, filterField);
            }
        });
    }

    /** check if value matches any item in the matchList, item may contain wildcards. */
    static _wildcardListMatch(value, matchList) {
        return matchList.some((matchItem) => OptionsUtil._wildcardMatch(value, matchItem));
    }

    /**
     * check if value matches the matchValue, matchValue may contain wildcards.
     *
     * Valid wildcards are:
     * - matchValue starting and/or ending with '*'
     * - matchValue is '<empty>' which only matches an empty value
     *
     */
    static _wildcardMatch(value, matchValue) {
        // console.log('Checking value [' + value + '] against matchValue [' + matchValue + ']');
        if (matchValue === '<empty>' && value === '') {
            return true;
        }
        const matchProp = OptionsUtil._getWildcardProps(matchValue);

        if (!matchProp.startsWithWildcard && !matchProp.endsWithWildcard) {
            // match exactly?
            return matchValue === value;
        }
        if (matchProp.startsWithWildcard && matchProp.endsWithWildcard) {
            // substring match?
            return value.includes(matchProp.valueClean);
        }
        if (matchProp.startsWithWildcard) {
            // matches end?
            return value.endsWith(matchProp.valueClean);
        }
        // matches begin?
        return value.startsWith(matchProp.valueClean);
    }

    static _getWildcardProps(matchValue) {
        const result = {
            startsWithWildcard: false,
            endsWithWildcard: false,
            valueClean: ''
        };

        let startIdx = 0;
        let endIdx = matchValue.length;

        if (matchValue.startsWith('*')) {
            result.startsWithWildcard = true;
            startIdx = 1;
        }
        if (matchValue.endsWith('*')) {
            result.endsWithWildcard = true;
            --endIdx;
        }
        result.valueClean = matchValue.substring(startIdx, endIdx);

        return result;
    }
}
