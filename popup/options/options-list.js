/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';


function listButtonClicked(event) {
    event.preventDefault();
    let idButton = event.target.id;
    switch (idButton) {
        case "listAdd":
            _addListItem("#domainlist", "#domainListItem");
            domainlistChanged();
            break;
        case "listModify":
            _modifyListItem("#domainlist", "#domainListItem");
            domainlistChanged();
            break;
        case "listDelete":
            _deleteSelectedItem("#domainlist", "#domainListItem");
            domainlistChanged();
            break;

        case "fieldAdd":
            _addListItem("#fieldlist", "#fieldListItem");
            fieldlistChanged();
            break;
        case "fieldModify":
            _modifyListItem("#fieldlist", "#fieldListItem");
            fieldlistChanged();
            break;
        case "fieldDelete":
            _deleteSelectedItem("#fieldlist", "#fieldListItem");
            fieldlistChanged();
            break;
    }
    checkPropertiesChanged();
}

function checkRadioDomainByValue(radioButtonValue) {
    switch(radioButtonValue) {
        case "all":
            document.querySelector("#radioDomainlistAll").checked = true;
            break;
        case "blacklist":
            document.querySelector("#radioDomainlistBlacklist").checked = true;
            break;
        case "whitelist":
            document.querySelector("#radioDomainlistWhitelist").checked = true;
            break;
    }
}

function getCheckedRadioDomainValue() {
    let checkedRadioValue = 'all';
    document.querySelectorAll('input[name=radiogroupDomainlist]').forEach(radio => {
        if (radio.checked) {
            checkedRadioValue = radio.value;
        }
    });
    return checkedRadioValue;
}

function getList(selectId) {
    const options = document.querySelector(selectId).options;

    let domainlist = [];
    for(let i = 0; i < options.length; i++) {
        domainlist.push(options[i].textContent);
    }
    domainlist.sort();
    return domainlist;
}

function setListOptions(selectId, lstOptions) {
    const lstSelect = document.querySelector(selectId);

    // empty list before adding new items
    for(let i = lstSelect.options.length-1; i>=0 ; i--) {
        lstSelect.remove(i);
    }

    for(let i = 0; i < lstOptions.length; i++) {
        let newoption = document.createElement("option");
        newoption.textContent = lstOptions[i];
        lstSelect.options.add(newoption);
    }
}


function _addListItem(selectId, inputId) {
    const lstSelect = document.querySelector(selectId);
    const inputValue = document.querySelector(inputId).value;

    if (!_listItemExist(lstSelect, inputValue)) {
        let newoption = document.createElement("option");
        newoption.textContent = inputValue;
        lstSelect.options.add(newoption);
        lstSelect.selectedIndex = lstSelect.options.length - 1;
    }
}

function _modifyListItem(selectId, inputId) {
    const lstSelect = document.querySelector(selectId);
    const inputElm = document.querySelector(inputId);

    lstSelect.options[lstSelect.selectedIndex].textContent = inputElm.value;
}

function _deleteSelectedItem(selectId, inputId) {
    const lstSelect = document.querySelector(selectId);
    const inputElm = document.querySelector(inputId);

    let idx = lstSelect.selectedIndex;
    if (idx >= 0) {
        lstSelect.remove(lstSelect.selectedIndex);
        if (lstSelect.options.length > 0) {
            if (idx < lstSelect.options.length-1) {
                lstSelect.selectedIndex = idx;
            } else {
                lstSelect.selectedIndex  = lstSelect.options.length-1;
            }
        } else {
            // list became empty
            inputElm.value = "";
        }
    }
}

function copySelectedItemToInput(selectId, inputId) {
    const lstSelect = document.querySelector(selectId);
    const inputElm = document.querySelector(inputId);

    let elements = lstSelect.options;
    for(let i = 0; i < elements.length; i++) {
        if (elements[i].selected) {
            inputElm.value = elements[i].value;
        }
    }
    inputElm.focus();
}

function setListButtonsState(selectId, inputId, btnAddId, btnModId, btnDelId) {
    const btnAdd = document.querySelector(btnAddId);
    const btnMod = document.querySelector(btnModId);
    const btnDel = document.querySelector(btnDelId);

    const lstSelect = document.querySelector(selectId);
    const inputValue = document.querySelector(inputId).value;

    if (lstSelect.selectedIndex < 0 || !inputValue) {
        if (inputValue) {
            btnAdd.removeAttribute("disabled");
        } else {
            btnAdd.setAttribute("disabled", "true");
        }
        btnMod.setAttribute("disabled", "true");
        btnDel.setAttribute("disabled", "true");
    } else {
        if (_listItemExist(lstSelect, inputValue)) {
            btnAdd.setAttribute("disabled", "true");
            btnMod.setAttribute("disabled", "true");
            btnDel.removeAttribute("disabled");
        } else {
            btnAdd.removeAttribute("disabled");
            btnMod.removeAttribute("disabled");
            btnDel.setAttribute("disabled", "true");
        }
    }
}

function _listItemExist(selectElm, optionValue) {
    const options = selectElm.options;
    let exist = false;
    for(let i = 0; i < options.length; i++) {
        if (options[i].textContent === optionValue) {
            exist = true;
        }
    }
    return exist;
}
