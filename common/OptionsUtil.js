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
                    resolve(result);
                }
            );
        });
    }

    static applyShortcutKeysPrefs() {
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
