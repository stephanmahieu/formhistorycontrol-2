/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

function addStylesheetThemesToSelect() {
    // discover the installed alternate stylesheets and create a list
    let themeList = new Set();
    document.querySelectorAll('link.alternate_stylesheet[data-title]').forEach( (elem) => {
        let elemTitle = elem.getAttribute("data-title");
        if (elemTitle) {
            themeList.add(elemTitle);
        }
    });

    // add the discovered themes as option to the theme select
    themeList.forEach((option)=>{
        const optionNode = document.createElement('option');
        optionNode.value = option;
        optionNode.appendChild(document.createTextNode(option));
        document.querySelector('#themeSelect').appendChild(optionNode);
    });
}
