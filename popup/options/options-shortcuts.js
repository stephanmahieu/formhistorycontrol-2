/*
 * Copyright (c) 2023. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

function addShortcutKeyOptions() {
    if (browser.runtime.getBrowserInfo) {
        browser.runtime.getBrowserInfo().then((browserInfo) => {
            let extendedModifiers = true;
            if ('Firefox'===browserInfo.name && browserInfo.version.split('.')[0] < 63) {
                extendedModifiers = false;
            }
            _addShortcutKeyOptions(extendedModifiers);
        });
    }
    else {
        _addShortcutKeyOptions(true);
    }
}

function _addShortcutKeyOptions(extendedModifiers) {
    const pane = document.getElementById('shortcut_pane');
    browser.commands.getAll().then( (commands) => (
        commands.forEach(function(command) {
            const keyContainer = _createShortcutKeyOption(command, extendedModifiers);
            if (keyContainer) {
                pane.appendChild(keyContainer);
            }
        })
    ));
}

// Key combinations must consist of two or three keys:
// - main modifier (mandatory, except for function keys) ["Ctrl", "Alt", "Command", "MacCtrl"]
// - secondary modifier (optional). ["Shift"] (for Firefox ≥ 63) ["Ctrl", "Alt", "Command" and "MacCtrl"] not used as the main modifier!
// - key (mandatory). [A-Z, 0-9, F1-F12, Comma, Period, Home, End, PageUp, PageDown, Space, Insert, Delete, Up, Down, Left, Right]
function _createShortcutKeyOption(command, extendedModifiers) {
    let keyRow = null;
    const keys = [];
    command.shortcut.split('+').forEach(item => keys.push(item.trim()));
    keyRow = document.createElement('div');
    const labelsContainer = document.createElement('div');
    labelsContainer.appendChild(_createKeyLabel(command));
    labelsContainer.appendChild(_createShortcutKeyLabel(keys, command.name));
    keyRow.appendChild(labelsContainer);
    return keyRow;
}

function _createKeyLabel(command) {
    const labelNode = document.createElement('span');
    labelNode.id = 'shlblname_' + command.name;
    labelNode.classList.add('shortcutkey-label');
    labelNode.appendChild(document.createTextNode(_shortcutCommandToContextMenuLabel(command.name)));
    return labelNode
}

function _createShortcutKeyLabel(keys, commandName) {
    const labelNode = document.createElement('span');
    labelNode.id = 'shlbl_' + commandName;
    labelNode.classList.add('shortcutkey-keys-label');
    labelNode.appendChild(document.createTextNode(_getShortcutKeysAsTranslatedString(keys)));
    return labelNode
}

function _getShortcutKeysAsTranslatedString(keys) {
    let shortcut = '';
    if (keys.length > 1) {
        shortcut = browser.i18n.getMessage(keys[0]) + '+' + _translateKey(keys[1]);
        if (keys.length > 2) {
            shortcut += '+' + _translateKey(keys[2]);
        }
    }
    return shortcut;
}

function _translateKey(key) {
    if (key.length > 1 && !key.startsWith('F')) {
        return browser.i18n.getMessage(key);
    }
    return key;
}

function _shortcutCommandToContextMenuLabel(commandName) {
    switch(commandName) {
        case "_execute_action":        return browser.i18n.getMessage("contextMenuItemManageHistory") + ' ' + browser.i18n.getMessage("optionsShortcutsSmallDialog");
        case "open_fhc":               return browser.i18n.getMessage("contextMenuItemManageHistory") + ' ' + browser.i18n.getMessage("optionsShortcutsMainDialog");
        case "toggle_display_fields":  return browser.i18n.getMessage("contextMenuItemShowformfields");
        case "fill_recent":            return browser.i18n.getMessage("contextMenuItemFillMostRecent");
        case "fill_often":             return browser.i18n.getMessage("contextMenuItemFillMostUsed");
        case "clear_filled":           return browser.i18n.getMessage("contextMenuItemClearFields");
    }
    return "-- Unknown command --";
}