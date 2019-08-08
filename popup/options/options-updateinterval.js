/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

function addUpdateIntervalOptionsToSelect() {
    [   {val:  1000, lbl: "1 "  + browser.i18n.getMessage("dateSecond")},
        {val:  2000, lbl: "2 "  + browser.i18n.getMessage("dateSeconds")},
        {val:  3000, lbl: "3 "  + browser.i18n.getMessage("dateSeconds")},
        {val:  4000, lbl: "4 "  + browser.i18n.getMessage("dateSeconds")},
        {val:  5000, lbl: "5 "  + browser.i18n.getMessage("dateSeconds") + " (" + browser.i18n.getMessage("optionDefault") + ")"},
        {val: 10000, lbl: "10 " + browser.i18n.getMessage("dateSeconds")},
        {val: 30000, lbl: "30 " + browser.i18n.getMessage("dateSeconds")},
        {val: 60000, lbl: "1 "  + browser.i18n.getMessage("dateMinute")}
    ].forEach((opt)=>{
        const optionNode = document.createElement('option');
        optionNode.value = opt.val;
        optionNode.appendChild(document.createTextNode(opt.lbl));
        document.querySelector("#updateIntervalSelect").appendChild(optionNode);
    });
}
