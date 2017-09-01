'use strict';

function translate(/*event*/) {
    //console.log("Translation started");
    let matches = document.querySelectorAll("[data-fhc-i18n]");

    for (let i in matches) {
        if (matches.hasOwnProperty(i)) {
            let elem = matches[i];

            let messageId = elem.getAttribute('data-fhc-i18n');
            let translation = browser.i18n.getMessage(messageId);

            if (translation) {
                if (elem.nodeType === Node.ELEMENT_NODE && elem.value) {
                    elem.vakue = translation;
                } else if (elem.hasChildNodes()) {
                    let child = elem.childNodes[0];
                    if (child.nodeType === Node.TEXT_NODE) {
                        child.nodeValue = translation;
                    }
                }
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', translate);