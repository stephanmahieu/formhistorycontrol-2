/*
 * Copyright (c) 2023. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

browser.runtime.onMessage.addListener(fhcEvent => {
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 998:
            case 999:
                // console.log('received a ' + fhcEvent.eventType + ' event, unhide close button.');
                document.querySelector("#buttonClose").style.display = "inline";
                break;
            case 808:
                // restore to default size and position
                browser.windows.getCurrent({populate: false}).then((window)=>{
                    WindowUtil.restoreToDefault(window.id, FHC_WINDOW_OPTIONS);
                });
                break;
            case 888:
                if (fhcEvent.interfaceThemeChanged) {
                    // options have changed, reload
                    OptionsUtil.getInterfaceTheme().then(res => {
                        ThemeUtil.switchTheme(res);
                    });
                }
                if (fhcEvent.domainFilterChanged) {
                    // option can be changed from pageaction
                    let gettingItem = browser.storage.local.get({
                        prefDomainList: []
                    });
                    gettingItem.then(res => {
                        setListOptions("#domainlist", res.prefDomainList);
                        document.querySelector("#domainListItem").value = "";
                        currentOptions.prefDomainList = res.prefDomainList;
                    });
                }
                break;
            case 666:
                browser.windows.getCurrent({populate: false}).then((window)=>{
                    WindowUtil.closePopupByID(window.id);
                });
                break;
        }
    }
});

document.addEventListener("DOMContentLoaded", function() {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    addStylesheetThemesToSelect();
    addMultilineSaveOptionsToSelect();
    addUpdateIntervalOptionsToSelect();

    // this sets the shortcuts keys with the current preferences (taken from commands)
    // but not the enable state (that is not an attribute of the command)
    addShortcutKeyOptions();

    restoreOptions();
    document.querySelector("form").addEventListener("submit", saveOptions);

    document.querySelector("#expertMode").addEventListener("change", showHideExpertPrefs);
    document.querySelector("#expertMode").addEventListener("change", checkPropertiesChanged);

    document.querySelectorAll('.optionLink').forEach(link => {
        link.addEventListener("click", selectOptionSection);
    });

    document.querySelector("#themeSelect").addEventListener("change", themeSelectionChanged);
    document.querySelector("#dateformatSelect").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#saveWindowProperties").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#resetWindowProperties").addEventListener("click", resetAllWindowProperties);
    document.querySelector("#scrollAmountSelect").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#contextMenuSelect").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#pageActionSelect").addEventListener("change", checkPropertiesChanged);

    document.querySelector("#overrideAutocomplete").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#overrideIncognito").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#retainTypeSelect").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#retainTypeSelect").addEventListener("change", retainTypeChanged);
    document.querySelector("#updateIntervalSelect").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#versionAgeSelect").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#versionLengthSelect").addEventListener("change", checkPropertiesChanged);

    document.querySelector("#shortcutKeysModify").addEventListener("click", showShortkeyModifySelects);
    document.querySelector("#shortcutKeysSummary").addEventListener("click", showShortkeySummary);

    document.querySelector("#autocleanup").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#keepdayshistory").addEventListener("change", checkPropertiesChanged);
    document.querySelector("#btnCleanupNow").addEventListener("click", cleanupNow);

    document.querySelector("#btnEncryptionEnable").addEventListener("click", showEnableEncryptionFields);
    document.querySelector("#btnEncryptionCancel").addEventListener("click", hideEnableEncryptionFields);
    document.querySelectorAll(".encryptpwd-input").forEach(input => {
        input.addEventListener("input", checkEncryptionPasswords);
    });
    document.querySelector("#btnEncryptionActivate").addEventListener("click", activateEncryption);

    document.querySelector("#fieldfillModeSelect").addEventListener("change", checkPropertiesChanged);

    document.querySelectorAll('input[name=radiogroupDomainlist]').forEach(radio => {
        radio.addEventListener("change", checkPropertiesChanged);
        radio.addEventListener("change", domainlistRadioChanged);
    });
    document.querySelector('#domainlist').addEventListener("change", domainlistChanged);
    document.querySelector('#domainListItem').addEventListener("keyup", domainlistInputChanged);
    document.querySelector('#domainListItem').addEventListener("paste", domainlistInputPasted);
    document.querySelectorAll('.domainbutton').forEach(btn => {btn.addEventListener("click", listButtonClicked)});

    document.querySelector('#fieldlist').addEventListener("change", fieldlistChanged);
    document.querySelector('#fieldListItem').addEventListener("keyup", fieldlistInputChanged);
    document.querySelector('#fieldListItem').addEventListener("paste", fieldlistInputPasted);

    document.querySelector("#buttonClose").addEventListener("click", closeThisPopup);
    document.addEventListener("keyup", onKeyClicked);

    document.querySelector("div.titleSidebar img.logo").addEventListener("dblclick", handleClick);
    document.getElementById('files').addEventListener('change', handleFileSelect);


    // if update shortcut commands is not supported (chrome), hide the shortcut edit button
    if (!browser.commands.update) {
        showShortcutKeysModifyNotAllowedMessage();
    }

    // if this is a large window, options have been opened from outside the app, in that case show all options at once
    if (document.body.clientHeight > 600) {
        // unhide fieldsets
        document.querySelectorAll('.sub-fieldset').forEach(fldset => {
            fldset.style.display = "block";
        });
        // hide option links
        document.querySelectorAll('.optionLink').forEach(lnk => {
            lnk.style.display = "none";
        });
    }

    // no event available for window move, check periodically
    setInterval(function() {WindowUtil.checkAndSaveCurrentWindowPosition(FHC_WINDOW_OPTIONS);}, 5*1000);

    // check if database is accessible
    // !! opening database in a popup script behaves differently across current/beta/nightly versions,
    // !! also db is usually opened from a background script so maybe activate (much) later
    // WindowUtil.isDatabaseAccessible()
});

let resizeTimer;
window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        // resizing has stopped
        WindowUtil.saveWindowPrefs(FHC_WINDOW_OPTIONS);
    }, 250);
});

function closeThisPopup(event) {
    event.preventDefault();
    // TODO check for changes and ask confirmation?
    WindowUtil.closeThisPopup();
}

let currentOptions;
function restoreOptions() {
    let gettingItem = browser.storage.local.get({
        prefExpertMode           : false,
        prefInterfaceTheme       : "default",
        prefSaveWindowProperties : false,
        prefUseCustomAutocomplete: false,
        prefSaveInIncognitoMode  : false,
        prefMultilineThresholds  : {age: "10", length: "500"},
        prefRetainType           : "all",
        prefUpdateInterval       : "5000",
        prefDateFormat           : "automatic",
        prefScrollAmount         : "auto",
        prefContextmenuAvail     : "page",
        prefPageactionAvail      : "always",
        prefShortcutKeys         : {
            // defaults here must be equal to the defaults in manifest.json
            _execute_browser_action     : OptionsUtil.getDefaultShortcutKey('_execute_browser_action'),
            // MF3 _execute_action      : OptionsUtil.getDefaultShortcutKey('_execute_action'),
            open_fhc                    : OptionsUtil.getDefaultShortcutKey('open_fhc'),
            toggle_display_fields       : OptionsUtil.getDefaultShortcutKey('toggle_display_fields'),
            fill_recent                 : OptionsUtil.getDefaultShortcutKey('fill_recent'),
            fill_often                  : OptionsUtil.getDefaultShortcutKey('fill_often'),
            open_fhc_enable             : true,
            toggle_display_fields_enable: true,
            fill_recent_enable          : true,
            fill_often_enable           : true,
            clear_filled_enable         : true
        },
        prefFieldfillMode        : "auto",
        prefDomainFilter         : "all",
        prefDomainList           : [],
        prefFieldList            : [],
        prefAutomaticCleanup     : CleanupConst.DEFAULT_DO_CLEANUP,
        prefKeepDaysHistory      : CleanupConst.DEFAULT_DAYS_TO_KEEP
    });
    gettingItem.then(res => {
        applyPreferences(res, true);
    });
}

function applyPreferences(res, fromStore) {
    //console.log('checkbox value got from storage is [' + res.prefUseCustomAutocomplete + ']');
    document.querySelector('#expertMode').checked = res.prefExpertMode;
    document.querySelector('#themeSelect').value = res.prefInterfaceTheme;
    document.querySelector("#saveWindowProperties").checked = res.prefSaveWindowProperties;
    document.querySelector("#overrideAutocomplete").checked = res.prefUseCustomAutocomplete;
    document.querySelector("#overrideIncognito").checked = res.prefSaveInIncognitoMode;
    document.querySelector('#versionAgeSelect').value = res.prefMultilineThresholds.age;
    document.querySelector('#versionLengthSelect').value = res.prefMultilineThresholds.length;
    document.querySelector('#retainTypeSelect').value = res.prefRetainType;
    document.querySelector('#updateIntervalSelect').value = res.prefUpdateInterval;
    document.querySelector("#dateformatSelect").value = res.prefDateFormat;
    document.querySelector("#scrollAmountSelect").value = res.prefScrollAmount;
    document.querySelector("#contextMenuSelect").value = res.prefContextmenuAvail;
    document.querySelector("#pageActionSelect").value = res.prefPageactionAvail;
    document.querySelector("#autocleanup").checked = res.prefAutomaticCleanup;
    document.querySelector("#fieldfillModeSelect").value = res.prefFieldfillMode;
    document.querySelector("#keepdayshistory").value = res.prefKeepDaysHistory;

    checkShortcutKeyEnable(res.prefShortcutKeys);

    checkRadioDomainByValue(res.prefDomainFilter);

    setListOptions("#domainlist", res.prefDomainList);
    document.querySelector("#domainListItem").value = "";

    setListOptions("#fieldlist", res.prefFieldList);
    document.querySelector("#fieldListItem").value = "";

    domainlistRadioChanged();
    domainlistChanged();
    fieldlistChanged();
    retainTypeChanged();
    showHideExpertPrefs();

    if (fromStore) {
        currentOptions = Object.assign({}, res);
    }
    checkPropertiesChanged();
}

function saveOptions(e) {
    //console.log('checkbox value is [' + document.querySelector("#overrideAutocomplete").checked + ']');
    const newOptions = getNewOptions();

    browser.storage.local.set(newOptions);
    e.preventDefault();

    const notifyMsg = {
        eventType: 888,
        interfaceThemeChanged:       (currentOptions.prefInterfaceTheme !== newOptions.prefInterfaceTheme),
        saveWindowPropertiesChanged: (currentOptions.prefSaveWindowProperties !== newOptions.prefSaveWindowProperties),
        overrideAutocompleteChanged: (currentOptions.prefUseCustomAutocomplete !== newOptions.prefUseCustomAutocomplete),
        overrideIncognitoChanged:    (currentOptions.prefSaveInIncognitoMode !== newOptions.prefSaveInIncognitoMode),
        multilineThresholdsChanged:  (currentOptions.prefMultilineThresholds.age !== newOptions.prefMultilineThresholds.age
                                   || currentOptions.prefMultilineThresholds.length !== newOptions.prefMultilineThresholds.length),
        retainTypeChanged:           (currentOptions.prefRetainType !== newOptions.prefRetainType),
        updateIntervalChanged:       (currentOptions.prefUpdateInterval !== newOptions.prefUpdateInterval),
        dateFormatChanged:           (currentOptions.prefDateFormat !== newOptions.prefDateFormat),
        scrollAmountChanged:         (currentOptions.prefScrollAmount !== newOptions.prefScrollAmount),
        contextmenuAvailChanged:     (currentOptions.prefContextmenuAvail !== newOptions.prefContextmenuAvail),
        domainFilterChanged:         (currentOptions.prefDomainFilter !== newOptions.prefDomainFilter || !arrayContentEquals(currentOptions.prefDomainList, newOptions.prefDomainList)),
        fieldFilterChanged:          !arrayContentEquals(currentOptions.prefFieldList, newOptions.prefFieldList)
    };

    // inform popups
    browser.runtime.sendMessage(notifyMsg);

    // inform all content scripts (all tabs)
    browser.tabs.query({status: "complete"}).then(tabs => {
        tabs.forEach(tab => {
            browser.tabs.sendMessage(tab.id, notifyMsg).then(null, null).catch((err) => {
                /* ignore error if no receiving end */
                if (err.message && !err.message.includes('Receiving end does not exist')) {
                    throw(err)
                }
            });
        });
    });

    // activate the new shortcut keys
    OptionsUtil.applyShortcutKeysPrefs();

    currentOptions = Object.assign({}, newOptions);
    checkPropertiesChanged();
}

function getNewOptions() {
    return {
        prefExpertMode           : document.querySelector("#expertMode").checked,
        prefInterfaceTheme       : document.querySelector("#themeSelect").value,
        prefSaveWindowProperties : document.querySelector("#saveWindowProperties").checked,
        prefUseCustomAutocomplete: document.querySelector("#overrideAutocomplete").checked,
        prefSaveInIncognitoMode  : document.querySelector("#overrideIncognito").checked,
        prefMultilineThresholds  : {age   : document.querySelector("#versionAgeSelect").value,
                                    length: document.querySelector("#versionLengthSelect").value},
        prefRetainType           : document.querySelector("#retainTypeSelect").value,
        prefUpdateInterval       : document.querySelector("#updateIntervalSelect").value,
        prefDateFormat           : document.querySelector("#dateformatSelect").value,
        prefScrollAmount         : document.querySelector("#scrollAmountSelect").value,
        prefContextmenuAvail     : document.querySelector("#contextMenuSelect").value,
        prefPageactionAvail      : document.querySelector("#pageActionSelect").value,
        prefShortcutKeys         : getAllShortcutKeyValues(),
        prefFieldfillMode        : document.querySelector("#fieldfillModeSelect").value,
        prefDomainFilter         : getCheckedRadioDomainValue(),
        prefDomainList           : getList("#domainlist"),
        prefFieldList            : getList("#fieldlist"),
        prefAutomaticCleanup     : document.querySelector("#autocleanup").checked,
        prefKeepDaysHistory      : document.querySelector("#keepdayshistory").value
    };
}

function resetAllWindowProperties() {
    WindowUtil.removeAllSavedWindowPrefs().then(()=>{

        // restore myself to default size and position except when I was opened in a tab
        if (document.querySelector("#buttonClose").style.display !== "") {
            browser.windows.getCurrent({populate: false}).then((window)=>{
                WindowUtil.restoreToDefault(window.id, FHC_WINDOW_OPTIONS);
            });
        }

        WindowUtil.showModalInformation({titleId:'dialogInformationTitle', msgId:'informWindowPrefsReset'});
    }, (errMsg) => {
        console.error("Error removing SavedWindowPrefs", errMsg);
    });
}

function selectOptionSection(event) {
    let currentLinkElm = event.currentTarget;
    let openFieldsetId = "fld_" + currentLinkElm.id;

    // hide old fieldset
    let oldLinkElm = document.querySelector(".optionLink.selected");
    let oldFieldsetId = "fld_" + oldLinkElm.id;
    let oldFldSet = document.querySelector("#" + oldFieldsetId);
    oldFldSet.style.display = "none";
    oldLinkElm.classList.remove("selected");

    // show new fieldset
    let newFldSet = document.querySelector("#" + openFieldsetId);
    newFldSet.style.display = "block";

    // set link to selected
    currentLinkElm.classList.add("selected");
}

function retainTypeChanged() {
    const retainType = document.querySelector("#retainTypeSelect").value;

    const selAge = document.querySelector("#versionAgeSelect");
    const selAgeLbl = document.querySelector("#versionAgeSelectLabel");
    const selLen = document.querySelector("#versionLengthSelect");
    const selLenLbl = document.querySelector("#versionLengthSelectLabel");

    if (retainType === 'single') {
        // disable multiline options
        selAgeLbl.classList.add("disabled");
        selAge.setAttribute("disabled", "true");
        selLenLbl.classList.add("disabled");
        selLen.setAttribute("disabled", "true");
    } else {
        selAgeLbl.classList.remove("disabled");
        selAge.removeAttribute("disabled");
        selLenLbl.classList.remove("disabled");
        selLen.removeAttribute("disabled");
    }
}

function showHideExpertPrefs() {
    const expertModeChecked = document.querySelector("#expertMode").checked;

    Array.from(document.getElementsByClassName('expert-pref')).forEach(elem => {
        if (expertModeChecked) {
            elem.style.display = 'inherit';
        } else {
            elem.style.display = 'none';
        }
    });

    // check if the current selected category is still visible
    const oldLinkElm = document.querySelector(".optionLink.selected");
    if (oldLinkElm && oldLinkElm.offsetParent === null) {
        // unselect the now hidden fieldset
        const oldFieldsetId = "fld_" + oldLinkElm.id;
        const oldFldSet = document.querySelector("#" + oldFieldsetId);
        oldFldSet.style.display = "none";
        oldLinkElm.classList.remove("selected");

        // select the first visible fieldset
        document.querySelector('#display').classList.add('selected');
        document.querySelector('#fld_display').style.display = 'block';
    }
}

function domainlistRadioChanged() {
    const radioAllowAllChecked = document.querySelector("#radioDomainlistAll").checked;

    const domainlistElm = document.querySelector("#domainlist");
    const domainListInputElm = document.querySelector("#domainListItem");
    const btnAdd = document.querySelector("#listAdd");
    const btnMod = document.querySelector("#listModify");
    const btnDel = document.querySelector("#listDelete");

    if (radioAllowAllChecked) {
        domainlistElm.setAttribute("disabled", "true");
        domainListInputElm.setAttribute("disabled", "true");
        btnAdd.setAttribute("disabled", "true");
        btnMod.setAttribute("disabled", "true");
        btnDel.setAttribute("disabled", "true");

        domainlistElm.value = -1;
        domainListInputElm.value = "";
    } else {
        domainlistElm.removeAttribute("disabled");
        domainListInputElm.removeAttribute("disabled");
    }
}

function domainlistChanged() {
    copySelectedItemToInput("#domainlist", "#domainListItem");
    setListButtonsState("#domainlist", "#domainListItem", "#listAdd", "#listModify", "#listDelete");
}

function domainlistInputChanged() {
    setListButtonsState("#domainlist", "#domainListItem", "#listAdd", "#listModify", "#listDelete");
}
function domainlistInputPasted(event) {
    window.setTimeout(() => {domainlistInputChanged(); }, 10);
}

function fieldlistChanged() {
    copySelectedItemToInput("#fieldlist", "#fieldListItem");
    setListButtonsState("#fieldlist", "#fieldListItem", "#fieldAdd", "#fieldModify", "#fieldDelete");
}

function fieldlistInputChanged() {
    setListButtonsState("#fieldlist", "#fieldListItem", "#fieldAdd", "#fieldModify", "#fieldDelete");
}
function fieldlistInputPasted(event) {
    window.setTimeout(() => {fieldlistInputChanged(); }, 10);
}

function shortcutKeyEnableChanged(event) {
    const commandName = event.target.getAttribute('data-cmd');
    shortcutKeyCommandEnableChanged(commandName);
    checkPropertiesChanged();
}

function checkPropertiesChanged() {
    // enable apply button only if properties have changed
    let changed = false;
    const newOptions = getNewOptions();
    Object.entries(newOptions).forEach(([key, newValue]) => {
        let oldValue = currentOptions[key];
        if (Array.isArray(oldValue)) {
            if (!arrayContentEquals(oldValue, newValue)) {
                changed = true;
            }
        }
        else if (typeof oldValue === 'object') {
            // assuming both object have the same keys
            Object.entries(oldValue).forEach(([subKey, oldSubValue]) => {
                if (oldSubValue !== newValue[subKey]) {
                    changed = true;
                }
            });
        }
        else {
            if (oldValue !== newValue) {
                changed = true;
            }
        }
    });

    const applyBtnElm = document.querySelector("#buttonApply");
    if (changed) {
        applyBtnElm.removeAttribute("disabled");
    } else {
        applyBtnElm.setAttribute("disabled", "true");
    }
}

function arrayContentEquals(array1, array2) {
    if (array1.length === 0 && array2.length === 0) {
        return true;
    }
    if (array1.length !== array2.length) {
        return false;
    }
    let sameContent = true;
    array1.forEach(value => {
        if (!array2.includes(value)) {
            sameContent = false;
        }
    });
    return sameContent;
}

function shortcutKeySelectChanged(event) {
    // check validity change first, modifier 1 and 2 can not be the same
    const curSelect = event.target;
    const commandName = curSelect.getAttribute('data-cmd');

    const mod1 = document.getElementById('smod1_' + commandName).value;
    let   mod2 = document.getElementById('smod2_' + commandName).value;
    const key  = document.getElementById('skey_'  + commandName).value;

    // reset mod2 to empty if set equal to mod1
    if (mod1 === mod2) {
        document.getElementById('smod2_' + commandName).value = '';
    }

    // TODO check for duplicate shortcuts?

    updateShortcutKeyTextLabel(commandName, mod1, mod2, key);

    checkPropertiesChanged();
}

function themeSelectionChanged(/*event*/) {
    // theme selection changed, apply directly to this window to preview the theme
    const selectedTheme = document.querySelector("#themeSelect").value;
    ThemeUtil.switchTheme(selectedTheme === 'default' ? '' : selectedTheme);
    checkPropertiesChanged();
}

function onKeyClicked(event) {
    const keyName = event.key;
    if (keyName === 'Escape') {
        WindowUtil.closeThisPopup();
    }
}

function cleanupNow(event) {
    event.preventDefault();
    browser.runtime.sendMessage({eventType: 800});

    // notify popup(s) that new data has been added so they can update their view
    // do not do that immediately because cleanup is performed asynchronously
    window.setTimeout(()=>{browser.runtime.sendMessage({eventType: 777});}, 800);
}

function showEnableEncryptionFields(event) {
    event.preventDefault();
    document.querySelector("#enableEncryptForm").style.display = "block";

    // clear both pasword fields
    document.querySelector("#encryptKeyPwd1").value = "test";
    document.querySelector("#encryptKeyPwd2").value = "test";
    checkEncryptionPasswords();

    const enableBtn = document.querySelector("#btnEncryptionEnable");
    enableBtn.setAttribute("disabled", "true");
    enableBtn.classList.add("disabled");
}

function hideEnableEncryptionFields(event) {
    event.preventDefault();
    document.querySelector("#enableEncryptForm").style.display = "none";

    document.querySelector("#encryptKeyPwd1").value = "";
    document.querySelector("#encryptKeyPwd2").value = "";
    checkEncryptionPasswords();

    const enableBtn = document.querySelector("#btnEncryptionEnable");
    enableBtn.removeAttribute("disabled");
    enableBtn.classList.remove("disabled");
}

function checkEncryptionPasswords() {
    // only enable when both password are not empty and equal
    const pw1 = document.querySelector("#encryptKeyPwd1").value;
    const pw2 = document.querySelector("#encryptKeyPwd2").value;

    const enableBtn = document.querySelector("#btnEncryptionActivate");
    if (pw1.length > 0 && pw1 === pw2) {
        enableBtn.removeAttribute("disabled");
        enableBtn.classList.remove("disabled");
    } else {
        enableBtn.setAttribute("disabled", "true");
        enableBtn.classList.add("disabled");
    }
}

// function getWrappingKey(password, salt) {
//     return new Promise((resolve, reject) => {
//         const encUTF8 = new TextEncoder();
//         window.crypto.subtle.importKey(
//             "raw",
//             encUTF8.encode(password),
//             {name: "PBKDF2"},
//             false,
//             ["deriveBits", "deriveKey"]
//         ).then( (keyMaterial) => {
//             window.crypto.subtle.deriveKey(
//                 {
//                     "name": "PBKDF2",
//                     "salt": salt,
//                     "iterations": 100000,
//                     "hash": "SHA-256"
//                 },
//                 keyMaterial,
//                 {"name": "AES-GCM", "length": 256},
//                 true,
//                 ["wrapKey", "unwrapKey"]
//             ).then( (wrappingKey ) => {
//                 console.log("WrappingKey ", wrappingKey);
//                 resolve(wrappingKey);
//             });
//         });
//     });
// }
//
// /*
// Convert an array of byte values to an ArrayBuffer.
// */
// function bytesToArrayBuffer(bytes) {
//     const bytesAsArrayBuffer = new ArrayBuffer(bytes.length);
//     const bytesUint8 = new Uint8Array(bytesAsArrayBuffer);
//     bytesUint8.set(bytes);
//     return bytesAsArrayBuffer;
// }

function activateEncryption(event) {
    event.preventDefault();

    const password = document.querySelector("#encryptKeyPwd1").value;

    CryptoUtil.generateKeypair(password).then( (keys) => {
        console.log("Generated keys", keys);

        CryptoUtil.encrypt(keys["publicKey"], "Hello hëllö World!").then( (ciphertext) => {
            console.log("Encrypted text (an arraybuffer)", ciphertext);

            CryptoUtil.decrypt(password, keys["wrappedPrivateKey"], ciphertext).then( (plaintext) => {
                console.log("Decrypted text", plaintext);

            });
        });


        CryptoUtil.encrypt(keys["publicKey"], "Hallo Allemaal Dit is een TEST!!!!").then( (ciphertext2) => {


            // export the public key as spki so it can be stored
            CryptoUtil.exportPublicKey(keys["publicKey"]).then((publicPemKey) => {
                console.log("exported pubkey as pem", publicPemKey);

                const privateKeyString = CryptoUtil.exportPrivateKey(keys["wrappedPrivateKey"]);

                const secKeys = {
                    secPublicKey: publicPemKey,
                    secEncryptedPrivateKey: privateKeyString
                };
                browser.storage.local.set(secKeys).then(() => {
                    console.log("Security keys stored successfully!");

                    // retrieve the keys
                    browser.storage.local.get(["secPublicKey", "secEncryptedPrivateKey"]).then((result) => {
                        // console.log("Security keys retrieved successfully!", result);
                        console.log("Security keys retrieved successfully!");

                        CryptoUtil.importPublicKey(result["secPublicKey"]).then( (pubKey2) => {
                            console.log("Public key imported successfully!", pubKey2);

                            const privKey2 = CryptoUtil.importPrivateKey(result["secEncryptedPrivateKey"]);
                            console.log("Private key imported successfully!", privKey2);



                            // Now test decryption with private key from storage
                            CryptoUtil.decrypt(password, privKey2, ciphertext2).then( (plaintext2) => {
                                console.log("Decrypted text", plaintext2);
                            });

                            WindowUtil.createOrFocusWindow(FHC_WINDOW_PASSW);


                        });

                    });
                });
            });

        });

    });


    // /*  Salt for derivation, key-wrapping and unwrapping */
    // const saltBytes = [89,113,135,234,168,204,21,36,55,93,1,132,242,242,192,156];
    // const saltBuffer = bytesToArrayBuffer(saltBytes);
    //
    // window.crypto.subtle.generateKey(
    //     {
    //         name: "RSA-OAEP",
    //         // Consider using a 4096-bit key for systems that require long-term security
    //         modulusLength: 2048,
    //         publicExponent: new Uint8Array([1, 0, 1]),
    //         hash: "SHA-256",
    //     }, true, ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    // ).then( (keyPair) => {
    //     console.log("Key Success!");
    //
    //     window.crypto.subtle.exportKey("jwk", keyPair["publicKey"]).then( (pubKey) => {
    //         console.log("Public key is: ", pubKey);
    //     });
    //     window.crypto.subtle.exportKey("jwk", keyPair["privateKey"]).then( (privKey) => {
    //         console.log("Private key is: ", privKey);
    //     });
    //
    //     const plainText = "The quick brown fox";
    //     const encUTF8 = new TextEncoder();
    //
    //     window.crypto.subtle.encrypt(
    //         {
    //             name: "RSA-OAEP"
    //         },
    //         keyPair["publicKey"],
    //         encUTF8.encode(plainText)
    //     ).then( (ciphertext) => {
    //         console.log("Encrypted text (an arraybuffer)", ciphertext);
    //
    //         window.crypto.subtle.decrypt(
    //             {name: "RSA-OAEP"},
    //             keyPair["privateKey"],
    //             ciphertext
    //         ).then( (decryptedArrayBuffer) => {
    //             const dec = new TextDecoder();
    //             console.log("Decrypted text", dec.decode(decryptedArrayBuffer));
    //         });
    //     });
    //
    //
    //     getWrappingKey(password, saltBuffer).then( (wrappingKey) => {
    //         const iv = window.crypto.getRandomValues(new Uint8Array(16));
    //         window.crypto.subtle.wrapKey(
    //             "pkcs8",
    //             keyPair["privateKey"],
    //             wrappingKey,
    //             {
    //                 name: "AES-GCM",
    //                 iv: iv
    //             }
    //         ).then( (wrappedPrivateKey) => {
    //             console.log("WrappedPrivateKey", wrappedPrivateKey);
    //             // ArrayBuffer bytes
    //
    //             // now we have a wrappedPrivateKey, lets try to unwrap it again
    //             window.crypto.subtle.unwrapKey(
    //                 "pkcs8",                  // import format
    //                 wrappedPrivateKey,               // ArrayBuffer representing key to unwrap
    //                 wrappingKey,                     // CryptoKey representing key encryption key
    //                 {                  // algorithm params for key encryption key
    //                     name: "AES-GCM",
    //                     iv: iv
    //                 },
    //                 {
    //                     name: "RSA-OAEP",
    //                     modulusLength: 2048,
    //                     publicExponent: new Uint8Array([1, 0, 1]),
    //                     hash: "SHA-256",
    //                 },
    //                 true,                  // extractability of key to unwrap
    //                 ["decrypt"]               // key usages for key to unwrap
    //             ).then( (unwrappedPrivateKey) => {
    //                 console.log("UnwrappedPrivateKey", unwrappedPrivateKey);
    //
    //
    //                 // now try to encrypt with public key and decrypt with unwrapped privatekey
    //                 const plainText2 = "Hello world!";
    //                 const encUTF8 = new TextEncoder();
    //                 window.crypto.subtle.encrypt(
    //                     {
    //                         name: "RSA-OAEP"
    //                     },
    //                     keyPair["publicKey"],
    //                     encUTF8.encode(plainText2)
    //                 ).then( (ciphertext2) => {
    //                     console.log("Encrypted text (an arraybuffer)", ciphertext2);
    //
    //                     window.crypto.subtle.decrypt(
    //                         {name: "RSA-OAEP"},
    //                         unwrappedPrivateKey,
    //                         ciphertext2
    //                     ).then( (decryptedArrayBuffer2) => {
    //                         const dec = new TextDecoder();
    //                         console.log("Decrypted text", dec.decode(decryptedArrayBuffer2));
    //                     });
    //                 });
    //
    //
    //             });
    //
    //         });
    //     });
    //
    // });
}
function _ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}
function _str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

function handleClick(e) {
    if (e.shiftKey && e.ctrlKey && !e.altKey) {
        downloadprefs();
    } else if (e.shiftKey && e.altKey && e.ctrlKey) {
        uploadprefs();
    }
}
function downloadprefs() {
    console.log('Download prefs...');
    const curPrefs = JSON.stringify(getNewOptions(), null, '  ');
    FileUtil.download(curPrefs, 'text/json', 'formhistory-preferences.json').then(success => {
        console.log(`Download succeeded: ${success}`);
    });
}
function uploadprefs() {
    console.log('Enable upload prefs.');
    document.querySelector('#fileinput').style.display = 'block';
}
function handleFileSelect() {
    document.querySelector('#fileinput').style.display = 'none';
    console.log('Uploading prefs...');
    const fileList = document.getElementById('files').files;
    FileUtil.upload(fileList, 'application/json').then(content => {
        const importedPrefs = JSON.parse(content);
        console.log('JSON file read okay, applying preferences...');
        applyPreferences(importedPrefs, false);
        themeSelectionChanged();
        console.log('Done');
    });
}