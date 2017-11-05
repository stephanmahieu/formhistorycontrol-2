/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

function translate(/*event*/) {
    //console.log("Translation started");
    document.querySelectorAll("[data-fhc-i18n]").forEach( (elem) => {
        let messageId = elem.getAttribute('data-fhc-i18n');
        let translation = browser.i18n.getMessage(messageId);

        if (translation) {
            if (elem.nodeType === Node.ELEMENT_NODE && elem.value) {
                elem.vakue = translation;
            } else if (elem.nodeType === Node.ELEMENT_NODE && elem.label) {
                elem.label = translation;
            } else if (elem.hasChildNodes()) {
                let child = elem.childNodes[0];
                if (child.nodeType === Node.TEXT_NODE) {
                    child.nodeValue = translation;
                    if (messageId.slice(0,4) === 'menu') {
                        setUnusedAccessKey(elem, child, translation);

                    }
                }
            }
        }
    });
}

let usedAccessKeys = "";
function setUnusedAccessKey(element, child, translation) {
    let key, lKey;
    for (let i=0; i<translation.length; i++) {
        key = translation.substring(i, i+1);
        lKey = key.toLowerCase();

        if (isAlpha(lKey) && !usedAccessKeys.includes(lKey)) {
            usedAccessKeys += lKey;
            element.setAttribute('data-access-key', lKey);
            element.removeChild(child);

            // add the first part of the label
            if (i>0) {
                element.appendChild(document.createTextNode(translation.slice(0, i)));
            }
            // add the key part wrapped inside a span element and apply an underline style
            let keyDiv = document.createElement('div');
            keyDiv.setAttribute('style', 'text-decoration: underline; display:inline-block;');
            keyDiv.appendChild(document.createTextNode(key));
            element.appendChild(keyDiv);
            // add the remainder of the label
            element.appendChild(document.createTextNode(translation.slice(i+1)));

            break;
        }
    }
}

const isAlpha = ch => {
    return ch.match(/^[a-z]+$/i) !== null;
};

document.addEventListener('DOMContentLoaded', translate);