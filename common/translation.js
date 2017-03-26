function translate(e) {
    var matches = document.querySelectorAll("[data-fhc-i18n]");

    for (var i in matches) {
        if (matches.hasOwnProperty(i)) {
            var elem = matches[i];

            var messageId = elem.getAttribute('data-fhc-i18n');
            var translation = browser.i18n.getMessage(messageId);

            if (translation) {
                if (elem.nodeType === Node.ELEMENT_NODE && elem.value) {
                    elem.vakue = translation;
                } else if (elem.hasChildNodes()) {
                    var child = elem.childNodes[0];
                    if (child.nodeType === Node.TEXT_NODE) {
                        child.nodeValue = translation;
                    }
                }
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', translate);