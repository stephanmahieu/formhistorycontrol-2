/*
 * Copyright (c) 2023. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

browser.runtime.onMessage.addListener(receiveEvents);

function receiveEvents(fhcEvent, sender, sendResponse) {
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 1:
                if (!blockedByFilter(fhcEvent) && doRetainFieldType(fhcEvent)) {
                    // Process Text
                    fhcEvent.value = JSON.parse(fhcEvent.value);
                    //console.log("Received a content event for " + fhcEvent.id + " content is: " + fhcEvent.value);
                    saveOrUpdateTextField(fhcEvent);
                }
                break;

            case 11:
                // Process Text (manual added, no filters apply)
                fhcEvent.value = JSON.parse(fhcEvent.value);
                //console.log("Received a content event for " + fhcEvent.id + " content is: " + fhcEvent.value);
                saveOrUpdateTextField(fhcEvent);
                break;

            case 2:
                if (!blockedByFilter(fhcEvent)) {
                    // Process non-text like radiobuttons, checkboxes etcetera
                    //console.log("Received a formelement event with " + fhcEvent.formElements.length + " form elements ");
                    saveOrUpdateFormElements(fhcEvent.formElements);
                }
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

            case 5:
                // console.log("Received an import dataRetrieval event for [" + fhcEvent.name + "] which is a " + fhcEvent.type);
                updateMultipleValues(fhcEvent);
                break;

            case 6:
                // console.log("Received an update event for [" + fhcEvent.name + "] which is a " + fhcEvent.type);
                fhcEvent.value = JSON.parse(fhcEvent.value);
                updateSingleValue(fhcEvent);
                break;

            case 336:
                WindowUtil.createNewPopupWindow(FHC_WINDOW_EDITRVW);
                break;

            case 337:
                WindowUtil.createNewPopupWindow(FHC_WINDOW_ENTRYVW);
                break;

            case 338:
                WindowUtil.createOrFocusWindow(FHC_WINDOW_MANAGE);
                break;

            case 339:
                WindowUtil.createOrFocusWindow(FHC_WINDOW_OPTIONS);
                break;

            case 444:
                // item(s) have been deleted from the database (by popup script)
                return true;

            case 555:
                // console.log('Getting choices from datastore for field ' + fhcEvent.fieldName + ', search term: ' + fhcEvent.searchTerm);
                getValuesMatchingSearchtermFromDatabaseAndRespond(fhcEvent.fieldName, fhcEvent.searchTerm, sendResponse);
                // Tell the browser we intend to use the sendResponse argument after the listener has returned
                return true;

            case 800:
                console.log('Cleanup now request received!');
                doCleanup(true);
                break;

            case 888:
                // console.log('Background script: options changed!');
                if (fhcEvent.domainFilterChanged || fhcEvent.fieldFilterChanged || fhcEvent.retainTypeChanged || fhcEvent.overrideIncognitoChanged) {
                    initFilterOptions();
                }
                if (fhcEvent.multilineThresholdsChanged) {
                    initMultilineThresholds();
                }
                break;

            case 998:
                // resend the message delayed as 999, do it multiple times so at least the last one is most likely received.
                // console.log('Received an event (998) intended for options.html popup');
                setTimeout(() => {browser.runtime.sendMessage({eventType: 999});}, 200);
                setTimeout(() => {browser.runtime.sendMessage({eventType: 999});}, 350);
                setTimeout(() => {browser.runtime.sendMessage({eventType: 999});}, 500);
                setTimeout(() => {browser.runtime.sendMessage({eventType: 999});}, 1500);
                break;
        }
    }
}

//----------------------------------------------------------------------------
// Cleanup methods
//----------------------------------------------------------------------------

function initCleanupAlarm() {
    browser.alarms.onAlarm.addListener(handleCleanupAlarm);

    browser.alarms.create(CleanupConst.ALARM_NAME, {
        delayInMinutes: CleanupConst.INITIAL_DELAY_MINUTES,
        periodInMinutes: CleanupConst.PERIOD_MINUTES
    });
}

function handleCleanupAlarm(alarmInfo) {
    if (CleanupConst.ALARM_NAME === alarmInfo.name) {
        console.log("Cleanup Alarm: Performing a periodic cleanup now!");
        doCleanup(false);
    }
}

function doCleanup(forceManual) {
    // get cleanup preferences
    OptionsUtil.getCleanupPrefs().then(prefs => {
        console.log("Cleanup doit:" + prefs.prefAutomaticCleanup + ", days to keep:" + prefs.prefKeepDaysHistory);
        if (forceManual || prefs.prefAutomaticCleanup) {
            console.log('Starting cleanup...');
            const expirationDate = DateUtil.getCurrentDate() - (prefs.prefKeepDaysHistory * 24 * 60 * 60 * 1000);
            deleteExpiredItems(expirationDate);
            deleteExpiredFormElements(expirationDate);
        }
    });
}

function deleteExpiredItems(expirationDate) {
    countExpiredItems(expirationDate).then(noOfRecordsExpired => {

        if (noOfRecordsExpired === 0) {
            console.log('Finished text cleanup, no expired entries found.');
            return;
        }

        const FAST_UPDATE_LIMIT = 25;

        let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readwrite");

        let index = objStore.index(DbConst.DB_TEXT_IDX_LAST);
        let keyRange = IDBKeyRange.upperBound(expirationDate);

        let req = index.openCursor(keyRange);
        let noOfRecordsDeleted = 0;
        req.onerror = function (/*event*/) {
            console.error("Get failed for expired text data", this.error);
        };
        req.onsuccess = function(evt) {
            let cursor = evt.target.result;
            if (cursor) {
                const fhcEntry = cursor.value;
                // console.log("Expired: " + DateUtil.toDateStringShorter(fhcEntry.last) + "   " + fhcEntry.name + " (" + fhcEntry.type + ")");

                const request = cursor.delete();
                request.onsuccess = function() {
                    noOfRecordsDeleted++;

                    // console.log('Delete ' + noOfRecordsDeleted + ' of ' + noOfRecordsExpired + ' succeeded');

                    if (noOfRecordsExpired <= FAST_UPDATE_LIMIT) {
                        // for small quantities, notify the table to update itself (if open) for each deleted record (slow)
                        browser.runtime.sendMessage({
                            eventType: 111,
                            primaryKey: cursor.primaryKey,
                            fhcEntry: null,
                            what: 'delete'
                        }).then(null, null
                        )
                        .catch((err) => {
                            /* ignore error if popup is not open */
                            if (err.message && !err.message.includes('Receiving end does not exist')) {
                                throw(err)
                            }
                        });
                    }
                };

                cursor.continue();
            } else {
                console.log('Finished cleanup expired text entries, ' + noOfRecordsDeleted + ' entries deleted');

                if (noOfRecordsExpired > FAST_UPDATE_LIMIT) {
                    // for large quantities, notify the table to update itself only after all entries have been deleted (fast)
                    browser.runtime.sendMessage({
                        eventType: 777
                    })
                    .catch((err) => {
                        /* ignore error if popup is not open */
                        if (err.message && !err.message.includes('Receiving end does not exist')) {
                            throw(err)
                        }
                    });
                }
            }
        };
    });
}

function countExpiredItems(expirationDate) {
    return new Promise((resolve, reject) => {
        let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readonly");

        let index = objStore.index(DbConst.DB_TEXT_IDX_LAST);
        let keyRange = IDBKeyRange.upperBound(expirationDate);

        let req = index.openCursor(keyRange);
        let noOfRecordsExpired = 0;
        req.onerror = function (/*event*/) {
            console.error("Get (for count) failed for expired data", this.error);
            reject(0);
        };
        req.onsuccess = function(evt) {
            let cursor = evt.target.result;
            if (cursor) {
                noOfRecordsExpired++;
                cursor.continue();
            } else {
                resolve(noOfRecordsExpired);
            }
        };
    });
}

function deleteExpiredFormElements(expirationDate) {
    let objStore = getObjectStore(DbConst.DB_STORE_ELEM, "readwrite");

    let index = objStore.index(DbConst.DB_ELEM_IDX_SAVED);
    let keyRange = IDBKeyRange.upperBound(expirationDate);

    let req = index.openCursor(keyRange);
    let noOfRecordsDeleted = 0;

    req.onerror = function (/*event*/) {
        console.error("Get failed for expired FormElement data", this.error);
    };
    req.onsuccess = function(evt) {
        let cursor = evt.target.result;
        if (cursor) {
            const fhcEntry = cursor.value;
            console.log("Expired: " + DateUtil.toDateStringShorter(fhcEntry.saved));

            const request = cursor.delete();
            request.onsuccess = function() {
                noOfRecordsDeleted++;
                console.log('Delete FormElement ' + noOfRecordsDeleted + ' succeeded');
            };
            cursor.continue();
        } else {
            console.log('Finished cleanup expired FormElement entries, ' + noOfRecordsDeleted + ' entries deleted');
        }
    };
}


//----------------------------------------------------------------------------
// Filter methods
//----------------------------------------------------------------------------

let filterPrefs;

function initFilterOptions() {
    OptionsUtil.getFilterPrefs().then(prefs => {
        filterPrefs = prefs;
    });
}

function doRetainFieldType(fhcEvent) {
    if (fhcEvent.type === 'input') {
        return OptionsUtil.doRetainSinglelineField(filterPrefs);
    } else {
        return OptionsUtil.doRetainMultilineField(filterPrefs);
    }
}

function blockedByFilter(fhcEvent) {
    if (fhcEvent.incognito && !OptionsUtil.doSaveInIncognitoMode(filterPrefs)) {
        //console.log('name:' + fhcEvent.name + ' is blocked in Incognito mode');
        return true;
    }
    if (OptionsUtil.isDomainBlocked(fhcEvent.host, filterPrefs)) {
        //console.log('type:' + fhcEvent.type + ' name:' + fhcEvent.name + ' host:' + fhcEvent.host + ' is blocked by domain');
        return true;
    }
    if (fhcEvent.eventType === 1 && OptionsUtil.isTextFieldBlocked(fhcEvent.host, fhcEvent.name, filterPrefs)) {
        //console.log('type:' + fhcEvent.type + ' name:' + fhcEvent.name + ' host:' + fhcEvent.host + ' is blocked by field');
        return true;
    }
    return false;
}

//----------------------------------------------------------------------------
// Database methods
//----------------------------------------------------------------------------

let db;

/**
 * Initialize (open) the database, create or upgrade if necessary.
 */
function initDatabase() {
    // console.log("Open database " + DbConst.DB_NAME + "...");
    let req;
    try {
        req = indexedDB.open(DbConst.DB_NAME, DbConst.DB_VERSION);
    } catch (ex){
        console.error("Error opening database: " + ex.name + ": " + ex.message + "\nEnabling cookies might resolve this.");
    }
    req.onsuccess = function (event) {
        // Better use "this" than "req" to get the result to avoid problems with garbage collection.
        db = event.target.result;
        // db = this.result;
        // console.log("Database opened successfully.");
    };
    req.onerror = function (event) {
        console.error("Database open error: " + event.target.errorCode);
    };
    req.onupgradeneeded = function (event) {
        console.log("Database upgrade start...");
        db = event.target.result;

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
            objStore.createIndex(DbConst.DB_ELEM_IDX_SAVED, "saved", {unique: false});
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

function updateSingleValue(fhcEvent) {
    let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readwrite");

    let primaryKey = fhcEvent.primaryKey;
    let getReq = objStore.get(primaryKey);
    getReq.onerror = function(/*event*/) {
        console.error("Get (for update) failed for record-key " + primaryKey, this.error);
    };
    getReq.onsuccess = function(event) {
        let fhcEntry = event.target.result;

        fhcEntry.fieldkey = getLookupKey(fhcEvent);
        fhcEntry.host_name = getHostNameKey(fhcEvent);
        fhcEntry.name = fhcEvent.name;
        fhcEntry.value = fhcEvent.value;
        fhcEntry.type  = fhcEvent.type;
        fhcEntry.used  = fhcEvent.used;
        fhcEntry.first = fhcEvent.first;
        fhcEntry.last = fhcEvent.last;
        fhcEntry.host = fhcEvent.host;
        fhcEntry.uri = fhcEvent.url;

        let updateReq = objStore.put(fhcEntry, primaryKey);
        updateReq.onsuccess = function(/*updateEvent*/) {
            // console.log("Update okay, id: " + updateEvent.target.result);
            // notify change so popup (if open) can update itself
            browser.runtime.sendMessage({
                eventType: 111,
                primaryKey: primaryKey,
                fhcEntry: fhcEntry,
                what: 'update'
            }).then(null, null
            )
            .catch((err) => {
                /* ignore error if popup is not open */
                if (err.message && !err.message.includes('Receiving end does not exist')) {
                    throw(err)
                }
            })
        };
        updateReq.onerror = function(/*updateEvent*/) {
            console.error("Update failed for text record with record-key " + key, this.error);
        };
    }
}

function updateMultipleValues(fhcEvent) {
    let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readwrite");

    fhcEvent.multiKeys.forEach(primaryKey => {

        let getReq = objStore.get(primaryKey);
        getReq.onerror = function(/*event*/) {
            console.error("Get (for update) failed for record-key " + primaryKey, this.error);
        };
        getReq.onsuccess = function(event) {
            let fhcEntry = event.target.result;

            if (fhcEvent.used) {
                fhcEntry.used = fhcEvent.used;
            }
            if (fhcEvent.first && fhcEvent.last) {
                fhcEntry.first = fhcEvent.first;
                fhcEntry.last = fhcEvent.last;
            } else {
                // keep dates consistent: first <= last
                if (fhcEvent.first && (fhcEvent.first <= fhcEntry.last)) {
                    fhcEntry.first = fhcEvent.first;
                }
                if (fhcEvent.last && (fhcEvent.last >= fhcEntry.first)) {
                    fhcEntry.last = fhcEvent.last;
                }
            }

            let updateReq = objStore.put(fhcEntry, primaryKey);
            updateReq.onsuccess = function(/*updateEvent*/) {
                // console.log("Update okay, id: " + updateEvent.target.result);
                // notify change so popup (if open) can update itself
                browser.runtime.sendMessage({
                    eventType: 111,
                    primaryKey: primaryKey,
                    fhcEntry: fhcEntry,
                    what: 'update'
                }).then(null, null
                )
                .catch((err) => {
                    /* ignore error if popup is not open */
                    if (err.message && !err.message.includes('Receiving end does not exist')) {
                        throw(err)
                    }
                })
            };
            updateReq.onerror = function(/*updateEvent*/) {
                console.error("Update failed for text record (loop) with record-key " + key, this.error);
            };
        };
    });
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
    let req = index.getKey(key);

    req.onerror = function (/*event*/) {
        console.error("Get failed for key " + key, this.error);
    };
    req.onsuccess = function(event) {
        let primaryKey = event.target.result;
        if (primaryKey) {
            let getReq = objStore.get(primaryKey);
            getReq.onerror = function(/*event*/) {
                console.error("Get (for update) failed for record-key " + primaryKey, this.error);
            };
            getReq.onsuccess = function(event) {
                let formElementFromDB = event.target.result;
                _updateFormElement(objStore, primaryKey, formElementFromDB, formElement);
            }
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
            //console.log("entry exist, updating value for key " + key);

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
let multilineThresholdAgeMs = 10 * 60 * 1000; // 10 minutes to milliseconds
let multilineThresholdLength = 500;

function initMultilineThresholds() {
    OptionsUtil.getMultilineThresholds().then(prefs => {
        multilineThresholdAgeMs = prefs.age * 60 * 1000;
        multilineThresholdLength = prefs.length;
    });
}
function createNewMultilineEntry(currentEntry, lastStoredEntry) {
    // create a new entry if the current version is 10 min. older or length changes more than 500 chars.
    let now = DateUtil.getCurrentDate();
    let isOlderThanThreshold = ((now - lastStoredEntry.last) > multilineThresholdAgeMs);
    let gtThanThreshold = (Math.abs(currentEntry.value.length - lastStoredEntry.value.length) > multilineThresholdLength);
    return (gtThanThreshold || isOlderThanThreshold);
}


function importIfNotExist(fhcEvent) {
    let objStore = getObjectStore(DbConst.DB_STORE_TEXT, "readwrite");

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
    // multiline fields are updated while you type, so only update the used count for input fields
    if ("input" === fhcEvent.type) {
        fhcEntry.used++;
        // XXX input -> host should be a 1 to many relation, update related hosts
    } else {
        // for multiline fields update value and other properties that may have changed
        fhcEntry.value = fhcEvent.value;
        fhcEntry.uri = fhcEvent.url;
        fhcEntry.host = fhcEvent.host;
        fhcEntry.pagetitle = fhcEvent.pagetitle;
    }
    fhcEntry.fieldkey = getLookupKey(fhcEvent);
    fhcEntry.host_name = getHostNameKey(fhcEvent);
    fhcEntry.last = (new Date()).getTime();

    let updateReq = objStore.put(fhcEntry, key);
    updateReq.onsuccess = function(/*updateEvent*/) {
        // console.log("Update okay, id: " + updateEvent.target.result);

        // notify change so popup (if open) can update itself
        browser.runtime.sendMessage({
            eventType: 111,
            primaryKey: key,
            fhcEntry: fhcEntry,
            what: 'update'
        }).then(null, null
        )
        .catch((err) => {
            /* ignore error if popup is not open */
            if (err.message && !err.message.includes('Receiving end does not exist')) {
                throw(err)
            }
        })
    };
    updateReq.onerror = function(/*updateEvent*/) {
        console.error("Update failed for text record with record-key " + key, this.error);
    };
}

function _insertNewEntry(objStore, fhcEvent) {
    let now = (new Date()).getTime();
    let host;
    let uri;
    let pagetitle;

    if ("input" === fhcEvent.type) {
        // XXX input -> host should be a 1 to many relation, update related hosts
        host = "";
        uri = "";
        pagetitle = "";
    } else {
        host = fhcEvent.host;
        uri = fhcEvent.url;
        pagetitle = fhcEvent.pagetitle;
    }

    let first = (fhcEvent.first) ? fhcEvent.first : now;
    let last = (fhcEvent.last) ? fhcEvent.last : now;
    let used = (fhcEvent.used) ? fhcEvent.used : 1;

    let fhcEntry = {
        fieldkey: getLookupKey(fhcEvent),
        host_name: getHostNameKey(fhcEvent),
        name: fhcEvent.name,
        value: fhcEvent.value,
        type: fhcEvent.type,
        first: first,
        last: last,
        used: used,
        host: host,
        uri: uri,
        pagetitle: pagetitle
    };
    let insertReq = objStore.add(fhcEntry);
    insertReq.onerror = function(/*insertEvent*/) {
        console.error("Insert failed!", this.error);
    };
    insertReq.onsuccess = function(insertEvent) {
        //console.log("Insert succeeded, new record-key is " + insertEvent.target.result);

        // notify change so popup (if open) can update itself
        browser.runtime.sendMessage({
            eventType: 111,
            primaryKey: insertEvent.target.result,
            fhcEntry: fhcEntry,
            what: 'add'
        }).then(null, null
        )
        .catch((err) => {
            /* ignore error if popup is not open */
            if (err.message && !err.message.includes('Receiving end does not exist')) {
                throw(err)
            }
        });
    };
}


function _updateFormElement(objStore, key, formElementFromDB, formElement) {
    let now = (new Date()).getTime();

    // update modified record
    formElementFromDB.used++;
    formElementFromDB.saved = now;
    formElementFromDB.selected = formElement.selected;
    formElementFromDB.value = formElement.value;

    // may have changed, store the latest value:
    formElementFromDB.uri = formElement.uri;
    formElementFromDB.pagetitle = formElement.pagetitle;

    let updateReq = objStore.put(formElementFromDB, key);
    updateReq.onerror = function(/*addEvent*/) {
        console.error("Update failed for form record with record-key " + key, this.error);
    };
    updateReq.onsuccess = function(addEvent) {
        //console.log("Update succeeded for record-key " + key);
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
        // XXX input -> host should be a 1 to many relation, update related hosts
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


initDatabase();
initCleanupAlarm();
initFilterOptions();
initMultilineThresholds();