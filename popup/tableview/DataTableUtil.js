/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

//import {DateUtil} from '../common/DateUtil.js';

class DataTableUtil {

    /**
     * get the URL to the translation file (translation will fallback to en if language file does not exist).
     */
    static getLanguageURL() {
        let languageURL = '';
        let uiLanguage = browser.i18n.getUILanguage();
        if (uiLanguage && uiLanguage.length >= 2) {
            languageURL = browser.extension.getURL('/_locales/' + uiLanguage.substring(0, 2) + '/datatables.json');
            // console.log("setting languageURL for DataTables: " + languageURL);
        }
        return languageURL;
    }

    /**
     * Get the fieldnames for the current locale.
     */
    static getLocaleFieldNames() {
        return {
            name: browser.i18n.getMessage("fieldName") || 'Fieldname',
            value: browser.i18n.getMessage("fieldValue") || 'Content',
            type: browser.i18n.getMessage("fieldType") || 'Type',
            count: browser.i18n.getMessage("fieldCount") || 'Count',
            first: browser.i18n.getMessage("fieldFirstUsed") || 'First used',
            last: browser.i18n.getMessage("fieldLastUsed") || 'Last used',
            age: browser.i18n.getMessage("fieldAge") || 'Age',
            host: browser.i18n.getMessage("fieldHost") || 'Host',
            uri: 'URL'
        }
    }

    /**
     * Formatting function for row details.
     *
     * @param d
     * @returns {string}
     */
    static formatDetail( d ) {
        const i18n = DataTableUtil.getLocaleFieldNames();
        // `d` is the original data object for the row
        return '<div class="detail-root"><table>'+
            '<tr><td><span class="label">'+i18n.name+':</span></td><td>'+d[1]+'</td></tr>'+
            '<tr><td><span class="label">'+i18n.value+':</span></td><td><div class="detail-info">'+d[2]+'</div></td></tr>'+
            '<tr><td><span class="label">'+i18n.type+':</span></td><td>'+d[3]+'</td></tr>'+
            (d[4]?('<tr><td><span class="label">'+i18n.count+':</span></td><td>'+d[4]+'</td></tr>'):'')+
            '<tr><td><span class="label">'+i18n.first+':</span></td><td>'+this.formatDate(d[5], 'display')+'</td></tr>'+
            '<tr><td><span class="label">'+i18n.last+':</span></td><td>'+this.formatDate(d[6], 'display')+'</td></tr>'+
            (d[7]?('<tr><td><span class="label">'+i18n.host+':</span></td><td>'+d[7]+'</td></tr>'):'')+
            (d[8]?('<tr><td><span class="label">'+i18n.uri+':</span></td><td><div class="detail-info">'+d[8]+'</div></td></tr>'):'')+
            '</table></div>';
    }

    /**
     *
     * @param data
     * @param type
     * @param dateformat
     * @returns {String}
     */
    static formatDate(data, type, dateformat) {
        return (type === 'display' || type === 'filter') ? DateUtil.dateToDateString(new Date(data), dateformat) : data;
    }

    /**
     * Shorten displayed data if exceeds cutoff (tooltip shows all), append ellipses when shortened.
     *
     * @param data
     * @param type
     * @param cutoff
     * @param wordbreak
     * @param escapeHtml
     * @returns {*}
     */
    static ellipsis(data, type, cutoff, wordbreak, escapeHtml) {
        let esc = function(t) {
            return t
                .replace( /&/g, '&amp;' )
                .replace( /</g, '&lt;' )
                .replace( />/g, '&gt;' )
                .replace( /"/g, '&quot;' );
        };
        // Order, search and type get the original data
        if (type !== 'display') {
            return data;
        }

        if (typeof data !== 'number' && typeof data !== 'string') {
            return data;
        }

        const displayData = data.toString(); // cast numbers

        // shortened is what is being displayed in the table
        let shortened = WindowUtil.htmlToReadableText(displayData).substr(0, cutoff-1);
        if (wordbreak) {
            // Find the last white space character in the string
            shortened = shortened.replace(/\s([^\s]*)$/, '');
        }
        if (displayData.length <= cutoff) {
            return shortened;
        }

        // if what is being displayed in the table is too large, add the data in the tooltip (title)
        const tooltipText = esc(WindowUtil.htmlToReadableText(displayData));
        return '<span class="ellipsis" title="' + tooltipText + '">' + shortened + '&#8230;</span>';
    }

    /**
     * Display age fuzzy.
     *
     * @param date
     * @param type
     * @returns {*}
     */
    static formatAge(date, type) {
        if  (type === 'display' || type === 'filter') {
            return DateUtil.getFuzzyAge(date);
        }
        else {
            return date;
        }
    }

    static openDetailViewSelectedEntries(table, doWhat) {
        let rowSelected = table.rows('.selected');
        let primaryKeys = [];
        let rowIdxFirst = null;
        rowSelected.every(
            function (rowIdx /*, tableLoop, rowLoop */) {
                let primaryKey = this.data()[0];
                //console.log('primaryKey database (edit) is: ' + primaryKey);
                primaryKeys.push(primaryKey);
                if (rowIdxFirst === null || rowIdx < rowIdxFirst) {
                    rowIdxFirst = rowIdx;
                }
            }
        );
        // console.log('No of entries to edit is: ' + primaryKeys.length + ', rowIdxFirst is: ' + rowIdxFirst);

        // get the data of the one entry to edit
        let data = table.row( rowIdxFirst ).data();

        // store data in local storage so it can be retrieved by the view
        browser.storage.local.set(
            this.createEntryObject(data, doWhat, primaryKeys)
        );

        if (data[3] === 'input' && primaryKeys.length === 1 && doWhat === 'view') {
            // Let background script open the popup (WindowUtil.createNewPopupWindow(FHC_WINDOW_ENTRYVW);)
            browser.runtime.sendMessage({eventType: 337}).then(null,
                error=>console.log(`Error sending open-entryview event: ${error}`)
            )
        } else {
            // Let background script open the popup (WindowUtil.createNewPopupWindow(FHC_WINDOW_EDITRVW);)
            browser.runtime.sendMessage({eventType: 336}).then(null,
                error=>console.log(`Error sending open-editview event: ${error}`)
            )
        }
    }

    static openDetailViewEntry(data, doWhat) {
        // store data in local storage so it can be retrieved by the view
        browser.storage.local.set(
            this.createEntryObject(data, doWhat, [data[0]])
        );

        if (data[3] === 'input' && doWhat === 'view') {            
            // Let background script open the popup (WindowUtil.createNewPopupWindow(FHC_WINDOW_ENTRYVW);)
            browser.runtime.sendMessage({eventType: 337}).then(null,
                error=>console.log(`Error sending open-entryview event: ${error}`)
            )
        } else {
            // Let background script open the popup (WindowUtil.createNewPopupWindow(FHC_WINDOW_EDITRVW);)
            browser.runtime.sendMessage({eventType: 336}).then(null,
                error=>console.log(`Error sending open-editview event: ${error}`)
            )
        }
    }

    static openDetailViewOnRowClick(clickedElem, table, doWhat) {
        let tr = clickedElem.closest('tr');
        let row = table.row( tr );
        let data = row.data();

        // store data in local storage so it can be retrieved by the view
        browser.storage.local.set(
            this.createEntryObject(data, doWhat, [data[0]])
        );

        if (data[3] === 'input' && doWhat === 'view') {
            // Let background script open the popup (WindowUtil.createNewPopupWindow(FHC_WINDOW_ENTRYVW);)
            browser.runtime.sendMessage({eventType: 337}).then(null,
                error=>console.log(`Error sending open-entryview event: ${error}`)
            )
        } else {
            // Let background script open the popup (WindowUtil.createNewPopupWindow(FHC_WINDOW_EDITRVW);)
            browser.runtime.sendMessage({eventType: 336}).then(null,
                error=>console.log(`Error sending open-editview event: ${error}`)
            )
        }
    }

    static copySelectedEntryToClipboard(table) {
        const data = table.row('.selected').data();
        this.copyDataToClipboard(data);
    }

    static copySelectedEntryCleanToClipboard(table) {
        const data = table.row('.selected').data();
        this.copyDataCleanToClipboard(data);
    }

    static copyDataToClipboard(data) {
        if (data) {
            this.copyStringToClipboard(data[2]);
        }
    }

    static copyDataCleanToClipboard(data) {
        if (data) {
            this.copyStringCleanToClipboard(data[2]);
        }
    }

    static copyStringCleanToClipboard(value) {
        const cleanContent = WindowUtil.htmlToReadableText(value);
        this.copyStringToClipboard(cleanContent);
    }

    static copyStringToClipboard(value) {
        // create invisible textarea to set value and copy to clipboard (only works for popup scripts)
        const input = document.createElement('textarea');
        input.style.position = 'fixed';
        input.style.opacity = 0;
        input.value = value;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
    }

    static createEntryObject(data, doWhat, multiKeys) {
        return {
            entryObject: {
                doWhat: doWhat,
                multiKeys: multiKeys,
                primaryKey: data[0],
                name: data[1],
                value: data[2],
                type: data[3],
                used: data[4],
                first: data[5],
                last: data[6],
                host: data[7],
                url: data[8]
            }
        }
    }

    static deleteItemFromDatabase(primaryKey) {
        let req = indexedDB.open(DbConst.DB_NAME, DbConst.DB_VERSION);
        req.onerror = function (/*event*/) {
            console.error("Database open error", this.error);
        };
        req.onsuccess = function (event) {
            let db = event.target.result;
            //console.log("Database opened successfully.");

            let objStore = db.transaction(DbConst.DB_STORE_TEXT, "readwrite").objectStore(DbConst.DB_STORE_TEXT);

            let reqDel = objStore.delete(primaryKey);
            reqDel.onsuccess = function(/*evt*/) {
                // console.log("primaryKey " + primaryKey + " deleted from the object store.");
                DataTableUtil.removeRowFromTable(primaryKey);
            };
            reqDel.onerror = function(/*evt*/) {
                console.error("delete error for key " + primaryKey, this.error);
            };
        }
    };

    static broadcastItemDeletedFromDatabase() {
        // tell background script
        browser.runtime.sendMessage({eventType: 444});
    }

    static removeRowFromTable(primaryKey) {
        // console.log(`Entry successful deleted, removing ${primaryKey} from the dataTable view`);
        const table = $('#fhcTable').DataTable();

        // find row which has the primaryKey in the first column and remove it
        let rowIndexes = [];
        table.rows().every( function(rowIdx) {
            let rowData = this.data();
            if (rowData[0] === primaryKey) {
                rowIndexes.push(rowIdx);
            }
        });
        if (rowIndexes.length === 1) {
            // console.log('Removing row with index ' + rowIndexes[0] + ' from table-data');
            table.rows(rowIndexes[0]).remove().draw('page');
        }
    }
}