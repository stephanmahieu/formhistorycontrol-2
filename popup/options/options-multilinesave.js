/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

function addMultilineSaveOptionsToSelect() {
    const charactersText = browser.i18n.getMessage("optionsSaveNewVersionMultilineCharacters");
    ["10", "20", "50", "75", "100", "200", "500", "1000", "5000"].forEach((count)=>{
        const optionNode = document.createElement('option');
        optionNode.value = count;
        optionNode.appendChild(document.createTextNode(count + " " + charactersText));
        document.querySelector("#versionLengthSelect").appendChild(optionNode);
    });

    [   {val:       1, lbl: "1 "  + browser.i18n.getMessage("dateMinute")},
        {val:       2, lbl: "2 "  + browser.i18n.getMessage("dateMinutes")},
        {val:       5, lbl: "5 "  + browser.i18n.getMessage("dateMinutes")},
        {val:      10, lbl: "10 " + browser.i18n.getMessage("dateMinutes")},
        {val:      30, lbl: "30 " + browser.i18n.getMessage("dateMinutes")},
        {val:      60, lbl: "1 "  + browser.i18n.getMessage("dateHour")},
        {val:  2 * 60, lbl: "2 "  + browser.i18n.getMessage("dateHours")},
        {val:  6 * 60, lbl: "6 "  + browser.i18n.getMessage("dateHours")},
        {val: 12 * 60, lbl: "12 " + browser.i18n.getMessage("dateHours")},
        {val: 24 * 60, lbl: "1 "  + browser.i18n.getMessage("dateDay")}
    ].forEach((age)=>{
        const optionNode = document.createElement('option');
        optionNode.value = age.val;
        optionNode.appendChild(document.createTextNode(age.lbl));
        document.querySelector("#versionAgeSelect").appendChild(optionNode);
    });
}
