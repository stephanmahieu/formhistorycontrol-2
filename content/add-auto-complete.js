'use strict';

// TODO Only add handlers if auto-complete is enabled (OptionsUtil.get...)
document.querySelectorAll('input[type=text],input[type=search],input[type=tel],input[type=url],input[type=email]').forEach( elem => {
    elem.addEventListener("focus", addAutocomplete);
    elem.addEventListener("blur", removeAutocomplete);
});


const autocompleteMap = new Map();

function getKey(elem) {
    return elem.id?elem.id:Math.random().toString();
}

function addAutocomplete(event) {
    const elem = event.target;
    // add autocomplete to the element only once
    if (elem.hasAttribute('data-fhc')) {
        return;
    }
    const key = getKey(elem);
    elem.setAttribute('data-fhc', key);
    console.log('Adding autocomplete to id: ' + elem.id + ', key: ' + key);
    autocompleteMap.set(key, new AutoComplete({
        selector: elem,
        minChars: 0,
        source: getSuggestions
    }));
}

function getSuggestions(term, element, suggest) {
    const fieldname = (element.name) ? element.name : ((element.id) ? element.id : "");
    console.log('getting suggestions for field ' + fieldname + ' matching search term: ' + term);
    browser.runtime.sendMessage({
        eventType: 555,
        searchTerm: term,
        fieldName: fieldname
    }).then( message => {
        console.log(`getSuggestions::responseMessage, received: ${message.choices.length} choices`);
        if (message.choices) {
            suggest(message.choices);
        }
    });
}

function removeAutocomplete(event) {
    const elem = event.target;
    if (elem.hasAttribute('data-fhc')) {
        const key = elem.getAttribute('data-fhc');
        elem.removeAttribute('data-fhc');
        if (autocompleteMap.has(key)) {
            console.log('Removing autocomplete from id: ' + elem.id + ', key: ' + key);
            let autoCompleteObj = autocompleteMap.get(key);
            autocompleteMap.delete(key);
            autoCompleteObj.destroy();
            autoCompleteObj = null;
        }
    }
}