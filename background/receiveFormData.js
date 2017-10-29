'use strict';

browser.runtime.onMessage.addListener(receiveEvents);

function receiveEvents(fhcEvent, sender, sendResponse) {
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 1:
                // Process Text
                fhcEvent.value = JSON.parse(fhcEvent.value);
                //console.log("Received a content event for " + fhcEvent.id + " content is: " + fhcEvent.value);
                saveOrUpdateTextField(fhcEvent);
                break;

            case 2:
                // Process non-text like radiobuttons, checkboxes etcetera
                //console.log("Received a formelement event with " + fhcEvent.formElements.length + " form elements ");
                saveOrUpdateFormElements(fhcEvent.formElements);
                break;

            case 3:
                //console.log("Received a dataRetrieval event! for " + fhcEvent.id + " type " + fhcEvent.type + " for tab " + fhcEvent.targetTabId + " textOrState: " + fhcEvent.textOrState);
                // retrieve value and send it back
                if (fhcEvent.action === "clearFields") {
                    setEmptyValueAndNotify(fhcEvent);
                } else {
                    if (fhcEvent.textOrState === "text") {
                        getTextFieldFromStoreAndNotify(fhcEvent);
                    } else /* "state" */{
                        getFormElementFromStoreAndNotify(fhcEvent);
                    }
                }
                break;

            case 4:
                // console.log("Received an import dataRetrieval event for [" + fhcEvent.name + "] which is a " + fhcEvent.type);
                importIfNotExist(fhcEvent);
                break;

            case 444:
                // item(s) have been deleted from the database (by popup script)
                browser.extension.getBackgroundPage().updateEditorFieldRestoreMenuForActiveTab();
                return true;

            case 555:
                // console.log('Getting choices from datastore for field ' + fhcEvent.fieldName + ', search term: ' + fhcEvent.searchTerm);
                getValuesMatchingSearchtermFromDatabaseAndRespond(fhcEvent.fieldName, fhcEvent.searchTerm, sendResponse);
                // Tell the browser we intend to use the sendResponse argument after the listener has returned
                return true;
        }
    }

}

//----------------------------------------------------------------------------
// Database methods
//----------------------------------------------------------------------------

let db;

/**
 * Initialize (open) the database, create or upgrade if necessary.
 */
function initDatabase() {
    console.log("Open database " + DbConst.DB_NAME + "...");
    let req;
    try {
        req = indexedDB.open(DbConst.DB_NAME, DbConst.DB_VERSION);
    } catch (ex){
        console.error("Error opening database: " + ex.name + ": " + ex.message + "\nEnabling cookies might resolve this.");
    }
    req.onsuccess = function (event) {
        // Better use "this" than "req" to get the result to avoid problems with garbage collection.
        db = event.target.result;
        //db = this.result;
        console.log("Database opened successfully.");

        //doDatabaseTests();
    };
    req.onerror = function (event) {
        console.error("Database open error: " + event.target.errorCode);
    };
    req.onupgradeneeded = function (event) {
        console.log("Database upgrade start...");
        let db = event.target.result;

        // Create an objectStore for this database
        let objStore;
        if (event.oldVersion < 1) {
            objStore = db.createObjectStore(DbConst.DB_STORE_TEXT, {autoIncrement: true});
            objStore.createIndex(DbConst.DB_TEXT_IDX_FIELD, "fieldkey", {unique: true});
            objStore.createIndex(DbConst.DB_TEXT_IDX_NAME, "name", {unique: false});
            objStore.createIndex(DbConst.DB_TEXT_IDX_LAST, "last", {unique: false});
            objStore.createIndex(DbConst.DB_TEXT_IDX_HOST, "host", {unique: false});
            objStore.createIndex(DbConst.DB_TEXT_IDX_HOST_NAME, "host_name", {unique: false});
            //objStore.createIndex("by_uri", "uri", {unique: false});

            objStore = db.createObjectStore(DbConst.DB_STORE_ELEM, {autoIncrement: true});
            objStore.createIndex(DbConst.DB_ELEM_IDX_FIELD, "fieldkey", {unique: true});
            objStore.createIndex("by_saved", "saved", {unique: false});
            //objStore.createIndex("by_name", "name", {unique: false});
        }

        // if (event.oldVersion < 2) {
        //     // Version 2 introduces new index
        //     objStore = req.transaction.objectStore(DbConst.DB_STORE_TEXT);
        //     objStore.createIndex("by_type", "type", {unique: false});
        // }
        // if (event.oldVersion < 3) {
        //     // Version 3 rename indexes
        //     objStore = req.transaction.objectStore(DbConst.DB_STORE_TEXT);
        //     objStore.deleteIndex("name");
        //     objStore.createIndex("by_name", "name", {unique: false});
        // }

        // Use transaction oncomplete to make sure the objStore creation is finished before adding data into it.
        objStore.transaction.oncomplete = function (/*event*/) {
            console.log("Database upgrade success.");
            //doDatabaseTests();
        };
        console.log("Database upgrade finished.");
    };
}

/**
 * Get a transaction for the objectStore.
 *
 * @param {string} store_name
 * @param {string} mode either "readonly" or "readwrite"
 */
function getObjectStore(store_name, mode) {
    let tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
}

function setEmptyValueAndNotify(fhcEvent) {
    fhcEvent.action = "formfieldValueResponse";
    fhcEvent.value = "";
    //console.log("Sending a " + fhcEvent.action + " message to tab " + fhcEvent.targetTabId);
    browser.tabs.sendMessage(fhcEvent.targetTabId, fhcEvent);
}

function getFormElementFromStoreAndNotify(fhcEvent) {
    let objStore = getObjectStore(DbConst.DB_STORE_ELEM, "readonly");

    let key = getFormElementLookupKey(fhcEvent);
    let index = objStore.index(DbConst.DB_ELEM_IDX_FIELD);

    //console.log("Looking up formfield with key: " + key);

    let req = index.get(key);
    req.onerror = function (/*event*/) {
        console.error("Get failed for key " + key, this.error);
    };
    req.onsuccess = function(event) {
        let formElement = event.target.result;
        if (formElement) {
            fhcEvent.action = "formfieldValueResponse";
            fhcEvent.value = formElement.value;
            fhcEvent.selected = formElement.selected;

            //console.log("Sending a " + fhcEvent.action + " message to tab " + fhcEvent.targetTabId + " for fieldname " + fhcEvent.name + " id " + fhcEvent.id);
            browser.tabs.sendMessage(fhcEvent.targetTabId, fhcEvent);
            // TODO Does this mean this value is used now and used-count and lastused-date should be updated?
            //      In any case only if the host and or uri matches?
            //      Maybe we should trigger an update from the page itself by firing a change event (input. textarea)
        }
    }
}

function getTextFieldFromStoreAndNotify(fhcEvent) {
    let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readonly");

    let found = {
        value: null,
        used: 0,
        last: 0
    };

    //console.log("Looking up textfield with name: " + fhcEvent.name);

    let index = objStore.index(DbConst.DB_TEXT_IDX_NAME);
    let singleKeyRange = IDBKeyRange.only(fhcEvent.name);

    let req = index.openCursor(singleKeyRange);
    req.onerror = function (/*event*/) {
        console.error("Get failed for name " + fhcEvent.name, this.error);
    };
    req.onsuccess = function(evt) {
        let cursor = evt.target.result;
        if (cursor) {
            let fhcEntry = cursor.value;
            // console.log("Named Entry [" + cursor.key + "] name:[" + fhcEntry.name + "] value:[" + fhcEntry.value + "] used:[" + fhcEntry.used + "] host:" + fhcEntry.host + "] type:[" + fhcEntry.type +
            //     "} KEY=[" + fhcEntry.fieldkey + "] first:[" + fhcEntry.first + "] last:[" + fhcEntry.last + "]");

            // TODO If host matches also it should take precedence?

            switch (fhcEvent.action) {
                case "fillMostRecent":
                    if (fhcEntry.last > found.last) {
                        found.value = fhcEntry.value;
                        found.last = fhcEntry.last;
                    }
                    break;

                case "fillMostUsed":
                    if (fhcEntry.used > found.used) {
                        found.value = fhcEntry.value;
                        found.used = fhcEntry.used;
                    }
                    break;
            }
            cursor.continue();
        }
        else {
            //console.log("No more named entries!");
            if (found.value) {
                // use a callback function instead? (or a promise, arrow function whatever...)
                fhcEvent.action = "formfieldValueResponse";
                fhcEvent.value = found.value;
                //console.log("Sending a " + fhcEvent.action + " message to tab " + fhcEvent.targetTabId + " for fieldname " + fhcEvent.name + " id " + fhcEvent.id);
                browser.tabs.sendMessage(fhcEvent.targetTabId, fhcEvent);
                // TODO Does this mean this value is used now and used-count and lastused-date should be updated?
                //      In any case only if the host and or uri matches?
                //      Maybe we should trigger an update from the page itself by firing a change event (input. textarea)
            }
        }
    };
}

function getValuesMatchingSearchtermFromDatabaseAndRespond(fieldname, searchterm, sendResponse) {
    let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readonly");

    let fieldValues = [];
    const term = searchterm.toLowerCase();

    // console.log("Looking up values for textfield with name: " + fieldname);

    let index = objStore.index(DbConst.DB_TEXT_IDX_NAME);
    let singleKeyRange = IDBKeyRange.only(fieldname);

    let req = index.openCursor(singleKeyRange);
    req.onerror = function (/*event*/) {
        console.error("Get failed for name " + fieldname, this.error);
    };
    req.onsuccess = function(evt) {
        let cursor = evt.target.result;
        if (cursor) {
            const fhcEntry = cursor.value;
            const value = fhcEntry.value;

            if (value) {
                if (searchterm) {
                    if (~value.toLowerCase().indexOf(term)) {
                        fieldValues.push(value);
                    }
                } else {
                    fieldValues.push(value);
                }
            }

            cursor.continue();
        }
        else {
            // console.log("Returning response with " + fieldValues.length + " items");
            sendResponse({choices: fieldValues});
        }
    };
}


function saveOrUpdateFormElements(formElements) {
    formElements.forEach(formElement=>{
        _saveOrUpdateFormElement(formElement);
    });
}

function _saveOrUpdateFormElement(formElement) {
    let objStore = getObjectStore(DbConst.DB_STORE_ELEM, "readwrite");

    // formElement already exists? (index = host + formid + id + name + type)
    let key = getFormElementLookupKey(formElement);

    let index = objStore.index(DbConst.DB_ELEM_IDX_FIELD);
    let req = index.get(key);

    req.onerror = function (/*event*/) {
        console.error("Get failed for key " + key, this.error);
    };
    req.onsuccess = function(event) {
        let formElementFromDB = event.target.result;
        if (formElementFromDB) {
            _updateFormElement(objStore, key, formElementFromDB, formElement);
        } else {
            //console.log("formelement does not exist, adding...");
            _insertNewFormElement(objStore, formElement);
        }
    }
}

function saveOrUpdateTextField(fhcEvent) {
    if (fhcEvent.type === 'input') {
        saveOrUpdateTextInputField(fhcEvent);
    } else {
        saveOrUpdateMultilineField(fhcEvent);
    }
}

function saveOrUpdateTextInputField(fhcEvent) {
    let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readwrite");

    // entry already exists? (index = host + type + name + value)
    let key = getLookupKey(fhcEvent);

    let index = objStore.index(DbConst.DB_TEXT_IDX_FIELD);
    let req = index.getKey(key);

    req.onsuccess = function(event) {
        let key = event.target.result;
        if (key) {
            console.log("entry exist, updating value for key " + key);

            // now get the complete record by key
            let getReq = objStore.get(key);
            getReq.onerror = function(/*event*/) {
                console.error("Get (for update) failed for record-key " + key, this.error);
            };
            getReq.onsuccess = function(event) {
                let fhcEntry = event.target.result;
                _updateEntry(objStore, key, fhcEntry, fhcEvent);
            };
        } else {
            //console.log("entry does not exist, adding...");
            _insertNewEntry(objStore, fhcEvent);
        }
    };
}

function saveOrUpdateMultilineField(fhcEvent) {
    let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readwrite");

    let found = {
        fhcEntry: null,
        last: 0
    };

    let index = objStore.index(DbConst.DB_TEXT_IDX_HOST_NAME);
    let singleKeyRange = IDBKeyRange.only(getHostNameKey(fhcEvent));
    let req = index.openCursor(singleKeyRange);

    req.onerror = function (/*event*/) {
        console.error("Get failed for name " + fhcEvent.name, this.error);
    };
    req.onsuccess = function(evt) {
        let cursor = evt.target.result;
        if (cursor) {
            let fhcEntry = cursor.value;
            // console.log("Multiline Entry [" + cursor.key + "] name:[" + fhcEntry.name + "] value:[" + fhcEntry.value + "] used:[" + fhcEntry.used + "] host:" + fhcEntry.host + "] type:[" + fhcEntry.type +
            //     "} KEY=[" + fhcEntry.fieldkey + "] first:[" + fhcEntry.first + "] last:[" + fhcEntry.last + "]");

            // keep the most recent entry
            if (fhcEntry.last > found.last) {
                found.last = fhcEntry.last;
                found.fhcEntry = fhcEntry;
                found.primaryKey = cursor.primaryKey;
            }

            cursor.continue();
        }
        else {
            // no more entries
            let hasFoundEntry = (found.last !== 0);
            if (hasFoundEntry && !createNewMultilineEntry(fhcEvent, found.fhcEntry)) {
                _updateEntry(objStore, found.primaryKey, found.fhcEntry, fhcEvent);
            } else {
                _insertNewEntry(objStore, fhcEvent);
            }
        }
    };
}

/**
 * Determine when to create a new entry or update an existing entry in the database for a multiline field.
 * Create a new multiline entry when a certain amount of characters in the value has changed or when a
 * certain amount of time has passed.
 */
function createNewMultilineEntry(currentEntry, lastStoredEntry) {
    // create a new entry if the current version is 10 min. older or length changes more than 500 chars.
    let now = DateUtil.getCurrentDate();
    let isOlderThan10min = ((now - lastStoredEntry.last) > (10 * 60 * 1000));
    let gtThan500 = (Math.abs(currentEntry.value.length - lastStoredEntry.value.length) > 500);
    return (gtThan500 || isOlderThan10min);
}

function importIfNotExist(fhcEvent) {
    let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readwrite");

    // FIXME the lookupKey is not sufficient for multiple versions of multiline fields
    // TODO  import-lookupkey should include date so maybe use a cursor to match multiple versions

    // entry already exists? (index = host + type + name + value)
    let lookupKey = getLookupKey(fhcEvent);

    let index = objStore.index(DbConst.DB_TEXT_IDX_FIELD);
    let req = index.getKey(lookupKey);

    req.onerror = function (/*event*/) {
        console.error("Get failed for lookupKey " + lookupKey, this.error);
    };
    req.onsuccess = function(event) {
        let key = event.target.result;
        if (key) {
            //console.log("import entry exist, skipping key " + key + "  [" + lookupKey + "]");
        } else {
            //console.log("import-entry does not exist, adding...");
            _importNewEntry(objStore, fhcEvent);
        }
    }
}


function _updateEntry(objStore, key, fhcEntry, fhcEvent) {
    let deleteReq = objStore.delete(key);

    deleteReq.onerror = function(/*deleteEvent*/) {
        console.error("Delete (for update) failed for record-key " + key, this.error);
    };
    deleteReq.onsuccess = function(/*deleteEvent*/) {
        //console.log("Delete (for update) okay");
        let now = (new Date()).getTime();

        // now add the modified record
        if (fhcEntry.used) {
            // multiline has no used count
            fhcEntry.used++;
        }
        fhcEntry.last = now;

        // if it is a multiline field (not input) value must be updated too
        if ("input" === fhcEvent.type) {
            // TODO input -> host should be a 1 to many relation, update related hosts
        } else {
            fhcEntry.uri = fhcEvent.url;
            fhcEntry.value = fhcEvent.value;
            fhcEntry.pagetitle = fhcEvent.pagetitle;
        }

        let addReq = objStore.add(fhcEntry);
        addReq.onerror = function(/*addEvent*/) {
            console.error("Add (for update) failed for original record with record-key " + key, this.error);
        };
        addReq.onsuccess = function(/*addEvent*/) {
            //console.log("Update succeeded for record-key " + key + ", new record-key is " + addEvent.target.result);
            if ("input" !== fhcEvent.type) {
                browser.extension.getBackgroundPage().updateEditorFieldRestoreMenuForActiveTab();
            }
        };
    };
}

function _insertNewEntry(objStore, fhcEvent) {
    let now = (new Date()).getTime();
    let host;
    let uri;
    let pagetitle;

    if ("input" === fhcEvent.type) {
        // TODO input -> host should be a 1 to many relation, update related hosts
        host = "";
        uri = "";
        pagetitle = "";
    } else {
        host = fhcEvent.host;
        uri = fhcEvent.url;
        pagetitle = fhcEvent.pagetitle;
    }

    let fhcEntry = {
        fieldkey: getLookupKey(fhcEvent),
        host_name: getHostNameKey(fhcEvent),
        name: fhcEvent.name,
        value: fhcEvent.value,
        type: fhcEvent.type,
        first: now,
        last: now,
        used: 1,
        host: host,
        uri: uri,
        pagetitle: pagetitle
    };
    let insertReq = objStore.add(fhcEntry);
    insertReq.onerror = function(/*insertEvent*/) {
        console.error("Insert failed!", this.error);
    };
    insertReq.onsuccess = function(/*insertEvent*/) {
        //console.log("Insert succeeded, new record-key is " + insertEvent.target.result);
        if ("input" !== fhcEvent.type) {
            browser.extension.getBackgroundPage().updateEditorFieldRestoreMenuForActiveTab();
        }
    };
}


function _updateFormElement(objStore, key, formElementFromDB, formElement) {
    let deleteReq = objStore.delete(key);

    deleteReq.onerror = function(/*deleteEvent*/) {
        console.error("Delete (for update) failed for record-key " + key, this.error);
    };
    deleteReq.onsuccess = function(/*deleteEvent*/) {
        //console.log("Delete (for update) okay");
        let now = (new Date()).getTime();

        // now add the modified record
        formElementFromDB.used++;
        formElementFromDB.saved = now;
        formElementFromDB.selected = formElement.selected;
        formElementFromDB.value = formElement.value;

        // may have changed, store the latest value:
        formElementFromDB.uri = formElement.uri;
        formElementFromDB.pagetitle = formElement.pagetitle;

        let addReq = objStore.add(formElementFromDB);
        addReq.onerror = function(/*addEvent*/) {
            console.error("Add (for update) failed for original record with record-key " + key, this.error);
        };
        addReq.onsuccess = function(addEvent) {
            //console.log("Update succeeded for record-key " + key + ", new record-key is " + addEvent.target.result);
        };
    };
}

function _insertNewFormElement(objStore, formElement) {
    let now = (new Date()).getTime();

    let newFormElement = {
        fieldkey: getFormElementLookupKey(formElement),
        id: formElement.id,
        name: formElement.name,
        type: formElement.type,
        formid: formElement.formid,
        selected: formElement.selected,
        value: formElement.value,
        host: formElement.host,
        uri: formElement.url,
        pagetitle: formElement.pagetitle,
        saved: now,
        used: 1
    };
    let insertReq = objStore.add(newFormElement);
    insertReq.onerror = function(/*insertEvent*/) {
        console.error("FormElement Insert failed!", this.error);
    };
    insertReq.onsuccess = function(insertEvent) {
        //console.log("FormElement Insert succeeded, new record-key is " + insertEvent.target.result);
    };
}


function _importNewEntry(objStore, fhcEvent) {
    let host;
    let uri;
    let pagetitle;

    if ("input" === fhcEvent.type) {
        // TODO input -> host should be a 1 to many relation, update related hosts
        host = "";
        uri = "";
        pagetitle = "";
    } else {
        host = fhcEvent.host;
        uri = fhcEvent.url;
        pagetitle = fhcEvent.pagetitle;
    }

    let fhcEntry = {
        fieldkey: getLookupKey(fhcEvent),
        host_name: getHostNameKey(fhcEvent),
        name: fhcEvent.name,
        value: fhcEvent.value,
        type: fhcEvent.type,
        first: fhcEvent.first,
        last: fhcEvent.last,
        used: fhcEvent.used,
        host: host,
        uri: uri,
        pagetitle: pagetitle
    };
    let insertReq = objStore.add(fhcEntry);
    insertReq.onerror = function(/*insertEvent*/) {
        console.error("Insert from import failed!", this.error);
    };
    insertReq.onsuccess = function(insertEvent) {
        //console.log("Insert succeeded, new record-key is " + insertEvent.target.result);
    };
}


/**
 * Create a unique key for looking up entries (input types)
 */
function getLookupKey(fhcEvent) {
    let key = fhcEvent.type + "|" + fhcEvent.name;

    if ("input" === fhcEvent.type) {
        // prepend with empty host, input values are universal and not bound to a host
        key = "|" + key + "|" + fhcEvent.value;
    } else {
        // bind multiline fields to a specific host
        // do not add the value but the lastUsed date, we want to store one or more versions per host
        key = fhcEvent.host + "|" + key + "|" + fhcEvent.last;
    }
    return key;
}

/**
 *  Create a non unique key for looking-up multiline entries
 */
function getHostNameKey(fhcEvent) {
    let key = "";
    if ("input" !== fhcEvent.type) {
        // this allows for multiple versions of a field per host
        key = fhcEvent.host + "|" + fhcEvent.type + "|" + fhcEvent.name;
    }
    return key;
}

function getFormElementLookupKey(formElement) {
    return formElement.host + '|' + formElement.formid + '|' + formElement.type + '|' + formElement.name + '|' + formElement.id;
}


// function doDatabaseTests() {
//     // doDatabaseAddTest();
//     // doReadAllTest();
//     // doDatabaseUpdateTest();
//     // clearTextFieldsStore();
//     // doReadAllTest();
//     // doDatabaseDeleteTest();
// }
//
// function clearTextFieldsStore() {
//     let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readwrite");
//     let req = objStore.clear();
//     req.onsuccess = function(/*insertEvent*/) {
//         console.log("Clear okay, all TextField records deleted!");
//     };
//     req.onerror = function(/*insertEvent*/) {
//         console.error("Clear failed!!");
//     };
// }
//
// function doDatabaseDeleteTest() {
//     let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readwrite");
//
//     console.log("Attempt deleting keys...");
//     for (let i=41; i<=300; i++) {
//         let req = objStore.delete(i);
//         req.onsuccess = function(evt) {
//             console.log("key " + i + " deleted from the object store.");
//         };
//         req.onerror = function(/*evt*/) {
//             console.error("delete error for key " + i, this.error);
//         };
//     }
// }
//
// function doDatabaseAddTest() {
//     console.log("Attempt inserts...");
//
//     // Formhistory test data
//     const formHistData = [
//         { name: "testfld1", value: "hello", type: "textarea", first: 1364453733248, last: 1487678983265, used:  1, host: "test.net",  uri: "http://test.net/page/one",  pagetitle: "Hello", fieldkey: "key1"},
//         { name: "testfld2", value: "world", type: "input",    first: 1364453733248, last: 1487678983265, used:  2, host: "test.net",  uri: "http://test.net/page/two",  pagetitle: "World!", fieldkey: "key2"},
//         { name: "testfld3", value: "foo",   type: "html",     first: 1364453733248, last: 1487678983265, used: 20, host: "dummy.org", uri: "http://dummy.org/page/one", pagetitle: "My Homepage", fieldkey: "key3"},
//         { name: "testfld4", value: "bar",   type: "div",      first: 1364453733248, last: 1487678983265, used: 10, host: "dummy.org", uri: "http://dummy.org/page/two", pagetitle: "Some interesting page", fieldkey: "key4"},
//         { name: "testfld4", value: "bar",   type: "iframe",   first: 1364453733248, last: 1487678983265, used:  5, host: "dummy.org", uri: "http://dummy.org/page/two", pagetitle: "Yeah", fieldkey: "key5"}
//     ];
//
//     // var transaction = db.transaction([DbConst.DB_STORE_TEXT], "readwrite");
//     // transaction.oncomplete = function(event) {
//     //     console.log("Transaction complete.");
//     //
//     //     doReadAllTest();
//     // };
//     // transaction.onerror = function(event) {
//     //     console.log("Insert error: " + event.target.errorCode);
//     // };
//
//     let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readwrite");
//     for (let i in formHistData) {
//         let req = objStore.add(formHistData[i]);
//         req.onsuccess = function(event) {
//             console.log("Insert okay, id: " + event.target.result);
//         };
//     }
// }
//
// function doReadAllTest() {
//     console.log("Attempt reading all...");
//
//     let objStore = getObjectStore(DbConst.DB_STORE_TEXT, 'readonly');
//     let req;
//
//     req = objStore.count();
//     req.onsuccess = function(evt) {
//         console.log("There are " + evt.target.result + " record(s) in the object store.");
//     };
//     req.onerror = function(/*evt*/) {
//         console.error("add error", this.error);
//     };
//
//     req = objStore.openCursor();
//     req.onsuccess = function(evt) {
//         let cursor = evt.target.result;
//         if (cursor) {
//             // req = objStore.get(cursor.key);
//             // req.onsuccess = function (evt) {
//             //     var value = evt.target.result;
//             //     console.log("Entry [" + cursor.key + "] name: " + cursor.value.name);
//             // };
//             let fhcEntry = cursor.value;
//             console.log("Entry [" + cursor.key + "] name:[" + fhcEntry.name + "] value:[" + fhcEntry.value + "] used:[" + fhcEntry.used + "] host:" + fhcEntry.host + "] type:[" + fhcEntry.type +
//                 "} KEY=[" + fhcEntry.fieldkey + "] first:[" + fhcEntry.first + "] last:[" + fhcEntry.last + "]");
//             cursor.continue();
//         }
//         else {
//             console.log("No more entries!");
//         }
//     };
// }
//
// function doDatabaseUpdateTest() {
//     console.log("Attempt update...");
//
//     let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readwrite");
//
//     let request = objStore.index("by_fieldkey").get("key1");
//     request.onerror = function(/*event*/) {
//         console.log("Update, get by index failed!");
//     };
//     request.onsuccess = function(event) {
//         // Get the old value that we want to update
//         let data = event.target.result;
//
//         if (data) {
//             console.log("Found existing record");
//
//             // update the value(s) in the object that you want to change
//             data.value = "value changed!";
//
//             // Put this updated object back into the database.
//             let requestUpdate = objStore.put(data);
//             requestUpdate.onerror = function(/*event*/) {
//                 console.error("update error", this.error);
//             };
//             requestUpdate.onsuccess = function(/*event*/) {
//                 console.log("Update succeeded.");
//             };
//         }
//         else {
//             console.log("Did NOT find an existing record!");
//         }
//     };
// }


initDatabase();
