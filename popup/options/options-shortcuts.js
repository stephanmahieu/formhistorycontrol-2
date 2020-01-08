/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

function showShortkeyModifySelects() {
    document.querySelectorAll('.shortcutkey-selects').forEach(
        sel => {sel.style.display = 'block';
        });
    hideShortcutKeysModifyButton();
}

function showShortkeySummary() {
    document.querySelectorAll('.shortcutkey-selects').forEach(
        sel => {sel.style.display = 'none';
        });
    showShortcutKeysModifyButton();
}

function hideShortcutKeysModifyButton() {
    document.getElementById('shortcutKeysModify').style.display = 'none';
    document.getElementById('shortcut_pane').style.height = '169px';
    document.getElementById('shortcutKeysSummary').style.display = 'block';
}

function showShortcutKeysModifyButton() {
    document.getElementById('shortcutKeysModify').style.display = 'block';
    document.getElementById('shortcut_pane').style.height = '140px';
    document.getElementById('shortcutKeysSummary').style.display = 'none';
}

function showShortcutKeysModifyNotAllowedMessage() {
    const msg = document.createElement('div');
    msg.id = 'shortcut_update_unsupported';
    msg.appendChild(document.createTextNode(browser.i18n.getMessage("optionsShortcutsUpdateNotSupported")));
    document.getElementById('shortcut_message').appendChild(msg);
}

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
    if (keys.length > 1) {
        keyRow = document.createElement('div');
        const labelsContainer = document.createElement('div');
        labelsContainer.appendChild(_createKeyLabel(command));
        labelsContainer.appendChild(_createShortcutKeyLabel(keys, command.name));
        keyRow.appendChild(labelsContainer);
        keyRow.appendChild(_createShortcutKeySelects(keys, command.name, extendedModifiers));
    }
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

function updateShortcutKeyTextLabel(commandName, mod1, mod2, key) {
    const keys = [];
    keys.push(mod1);
    if (mod2) {
        keys.push(mod2);
    }
    keys.push(key);
    document.getElementById('shlbl_' + commandName).textContent = _getShortcutKeysAsTranslatedString(keys);
}

function _getShortcutKeysAsTranslatedString(keys) {
    let shortcut = browser.i18n.getMessage(keys[0]) + '+' + _translateKey(keys[1]);
    if (keys.length > 2) {
        shortcut += '+' + _translateKey(keys[2]);
    }
    return shortcut;
}

function _translateKey(key) {
    if (key.length > 1 && !key.startsWith('F')) {
        return browser.i18n.getMessage(key);
    }
    return key;
}

function _createShortcutKeySelects(keys, commandName, extendedModifiers) {
    const modifier1 = keys[0];
    let modifier2;
    let key;
    if (keys.length === 2) {
        key = keys[1];
    } else {
        modifier2 = keys[1];
        key = keys[2];
    }

    const keySelects = document.createElement('div');
    keySelects.id = commandName;
    keySelects.style.display = 'none';
    keySelects.classList.add('shortcutkey-selects');
    if (commandName !== '_execute_browser_action') {
        keySelects.appendChild(_getEnableBox(commandName));
    }
    keySelects.appendChild(_getMainModifierSelect(commandName, modifier1));
    keySelects.appendChild(_createPlusNode());
    keySelects.appendChild(_getSecondModifierSelect(commandName, modifier2, extendedModifiers));
    keySelects.appendChild(_createPlusNode());
    keySelects.appendChild(_getKeySelect(commandName, key));
    return keySelects;
}

function _shortcutCommandToContextMenuLabel(commandName) {
    switch(commandName) {
        case "_execute_browser_action":return browser.i18n.getMessage("contextMenuItemManageHistory") + ' ' + browser.i18n.getMessage("optionsShortcutsSmallDialog");
        case "open_fhc":               return browser.i18n.getMessage("contextMenuItemManageHistory") + ' ' + browser.i18n.getMessage("optionsShortcutsMainDialog");
        case "toggle_display_fields":  return browser.i18n.getMessage("contextMenuItemShowformfields");
        case "fill_recent":            return browser.i18n.getMessage("contextMenuItemFillMostRecent");
        case "fill_often":             return browser.i18n.getMessage("contextMenuItemFillMostUsed");
        case "clear_filled":           return browser.i18n.getMessage("contextMenuItemClearFields");
    }
    return "-- Unknown command --";
}

function _getEnableBox(commandName) {
    const containerDiv = document.createElement('div');
    containerDiv.classList.add('shortcutkey-enable');
    const box = document.createElement('input');
    box.setAttribute('type', 'checkbox');
    box.setAttribute('data-cmd', commandName);
    box.id = "enable_" + commandName;
    box.checked = true;
    box.addEventListener("change", shortcutKeyEnableChanged);
    const label = document.createElement('label');
    label.setAttribute('for', "enable_" + commandName)
    label.appendChild(document.createElement('span'));
    containerDiv.appendChild(box);
    containerDiv.appendChild(label);
    return containerDiv;
}

function _getMainModifierSelect(commandName, selectedModifier) {
    const select = document.createElement('select');
    select.setAttribute('data-cmd', commandName);
    select.id = "smod1_" + commandName;
    select.addEventListener("change", shortcutKeySelectChanged);
    ["Ctrl", "Alt", "Command", "MacCtrl"].forEach((mainModifier)=>{
        select.appendChild(_createOptionNode(mainModifier, _translateKey(mainModifier)));
    });
    select.value = selectedModifier;
    return select;
}

function _getSecondModifierSelect(commandName, selectedModifier, extendedModifiers) {
    const select = document.createElement('select');
    select.id = "smod2_" + commandName;
    select.setAttribute('data-cmd', commandName);
    select.addEventListener("change", shortcutKeySelectChanged);
    ["", "Shift"].forEach((secModifier)=>{
        select.appendChild(_createOptionNode(secModifier, _translateKey(secModifier)));
    });

    // if Firefox ≥ 63
    if (extendedModifiers) {
        ["Ctrl", "Alt", "Command", "MacCtrl"].forEach((secModifier)=>{
            select.appendChild(_createOptionNode(secModifier, _translateKey(secModifier)));
        });
    }

    select.value = selectedModifier;
    return select;
}

function _getKeySelect(commandName, selectedKey) {
    const select = document.createElement('select');
    select.setAttribute('data-cmd', commandName);
    select.id = "skey_" + commandName;
    select.addEventListener("change", shortcutKeySelectChanged);
    for (let i=65; i<=90; i++) {
        select.appendChild(_createOptionNode(String.fromCharCode(i), String.fromCharCode(i)));
    }
    for (let i=0; i<=9; i++) {
        select.appendChild(_createOptionNode(i, i));
    }
    for (let i=1; i<=12; i++) {
        select.appendChild(_createOptionNode('F'+i, 'F'+i));
    }
    ["Comma", "Period", "Home", "End", "PageUp", "PageDown", "Space", "Insert", "Delete", "Up", "Down", "Left", "Right"].forEach((secModifier)=>{
        select.appendChild(_createOptionNode(secModifier, _translateKey(secModifier)));
    });
    select.value = selectedKey;
    return select;
}

function _createPlusNode() {
    const plusNode = document.createElement('span');
    plusNode.appendChild(document.createTextNode('+'));
    return plusNode
}

function _createOptionNode(value, label) {
    const optionNode = document.createElement('option');
    optionNode.value = value;
    optionNode.appendChild(document.createTextNode(label));
    return optionNode;
}

function getAllShortcutKeyValues() {
    return {
        _execute_browser_action     : _getShortcutKeyValue('_execute_browser_action'),
        open_fhc                    : _getShortcutKeyValue('open_fhc'),
        open_fhc_enable             : _getShortcutKeyEnable('open_fhc'),
        toggle_display_fields       : _getShortcutKeyValue('toggle_display_fields'),
        toggle_display_fields_enable: _getShortcutKeyEnable('toggle_display_fields'),
        fill_recent                 : _getShortcutKeyValue('fill_recent'),
        fill_recent_enable          : _getShortcutKeyEnable('fill_recent'),
        fill_often                  : _getShortcutKeyValue('fill_often'),
        fill_often_enable           : _getShortcutKeyEnable('fill_often'),
        clear_filled                : _getShortcutKeyValue('clear_filled'),
        clear_filled_enable         : _getShortcutKeyEnable('clear_filled')
    };
}

function _getShortcutKeyEnable(commandName) {
    if (!document.getElementById('enable_' + commandName)) {
        // missing (chrome allows max. 4 shortcuts)
        return false;
    }
    return document.getElementById('enable_' + commandName).checked;
}

function _getShortcutKeyValue(commandName) {
    if (!document.getElementById('smod1_' + commandName)) {
        // missing (chrome allows max. 4 shortcuts)
        return OptionsUtil.getDefaultShortcutKey(commandName);
    }
    const mod1 = document.getElementById('smod1_' + commandName).value;
    const mod2 = document.getElementById('smod2_' + commandName).value;
    const key  = document.getElementById('skey_'  + commandName).value;
    return mod1 + '+' + mod2 + ((mod2 ==='')?'':'+') + key;
}

function shortcutKeyCommandEnableChanged(commandName) {
    const name = document.getElementById('shlblname_' + commandName);
    const shkeys = document.getElementById('shlbl_' + commandName);

    const enabled = document.getElementById('enable_' + commandName).checked;

    const mod1 = document.getElementById('smod1_' + commandName);
    let   mod2 = document.getElementById('smod2_' + commandName);
    const key  = document.getElementById('skey_'  + commandName);

    if (enabled) {
        name.classList.remove('disabled-shortcut-command');
        shkeys.classList.remove('disabled-shortcut-command');
    } else {
        name.classList.add('disabled-shortcut-command');
        shkeys.classList.add('disabled-shortcut-command');
    }

    if (enabled && browser.commands.update) {
        mod1.removeAttribute("disabled");
        mod2.removeAttribute("disabled");
        key.removeAttribute("disabled");
    } else {
        mod1.setAttribute("disabled", "true");
        mod2.setAttribute("disabled", "true");
        key.setAttribute("disabled", "true");
    }
}

function checkShortcutKeyEnable(prefShortcutKeys) {
    _checkShortcutKeyEnable('open_fhc',              prefShortcutKeys.open_fhc_enable);
    _checkShortcutKeyEnable('toggle_display_fields', prefShortcutKeys.toggle_display_fields_enable);
    _checkShortcutKeyEnable('fill_recent',           prefShortcutKeys.fill_recent_enable);
    _checkShortcutKeyEnable('fill_often',            prefShortcutKeys.fill_often_enable);
    _checkShortcutKeyEnable('clear_filled',          prefShortcutKeys.clear_filled_enable);
}

function _checkShortcutKeyEnable(commandName, enable) {
    const box = document.getElementById('enable_' + commandName);
    if (box) {
        box.checked = enable;
        shortcutKeyCommandEnableChanged(commandName);
    }
}