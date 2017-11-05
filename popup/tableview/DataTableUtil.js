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
            '<tr><td><span class="label">'+i18n.value+':</span></td><td>'+d[2]+'</td></tr>'+
            '<tr><td><span class="label">'+i18n.type+':</span></td><td>'+d[3]+'</td></tr>'+
            (d[4]?('<tr><td><span class="label">'+i18n.count+':</span></td><td>'+d[4]+'</td></tr>'):'')+
            '<tr><td><span class="label">'+i18n.first+':</span></td><td>'+this.formatDate(d[5], 'display')+'</td></tr>'+
            '<tr><td><span class="label">'+i18n.last+':</span></td><td>'+this.formatDate(d[6], 'display')+'</td></tr>'+
            (d[7]?('<tr><td><span class="label">'+i18n.host+':</span></td><td>'+d[7]+'</td></tr>'):'')+
            (d[8]?('<tr><td><span class="label">'+i18n.uri+':</span></td><td>'+d[8]+'</td></tr>'):'')+
            '</table></div>';
    }

    /**
     *
     * @param data
     * @param type
     * @returns {String}
     */
    static formatDate(data, type, dateformat) {
        return (type === 'display' || type === 'filter') ? DateUtil.dateToDateString(new Date(data), dateformat) : data;
    }

    /**
     * Shorten displayed data if exceeds cutoff, append ellipses when shortened.
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

        data = data.toString(); // cast numbers

        if (data.length <= cutoff) {
            return data;
        }

        let shortened = data.substr(0, cutoff-1);

        // Find the last white space character in the string
        if (wordbreak) {
            shortened = shortened.replace(/\s([^\s]*)$/, '');
        }

        // Protect against uncontrolled HTML input
        if (escapeHtml) {
            shortened = esc(shortened);
        }

        return '<span class="ellipsis" title="'+esc(data)+'">'+shortened+'&#8230;</span>';
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
            WindowUtil.createNewPopupWindow(FHC_WINDOW_ENTRYVW);
        } else {
            WindowUtil.createNewPopupWindow(FHC_WINDOW_EDITRVW);
        }
    }

    static openDetailViewEntry(data, doWhat) {
        // store data in local storage so it can be retrieved by the view
        browser.storage.local.set(
            this.createEntryObject(data, doWhat, [data[0]])
        );

        if (data[3] === 'input' && doWhat === 'view') {
            WindowUtil.createNewPopupWindow(FHC_WINDOW_ENTRYVW);
        } else {
            WindowUtil.createNewPopupWindow(FHC_WINDOW_EDITRVW);
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

        // TODO modal?: https://stackoverflow.com/questions/24801124/how-to-make-window-open-pop-up-modal
        if (data[3] === 'input' && doWhat === 'view') {
            WindowUtil.createNewPopupWindow(FHC_WINDOW_ENTRYVW);
        } else {
            WindowUtil.createNewPopupWindow(FHC_WINDOW_EDITRVW);
        }
    }

    static copySelectedEntryToClipboard(table) {
        const data = table.row('.selected').data();
        if (data) {
            this.copyEntryToClipboard(data);
        }
    }

    static copyEntryToClipboard(data) {
        //const type = data[3];
        const value = data[2];
        // console.log('Trying to copy value: ' + value);

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


    static showContextMenu(event, idContentElement) {
        event.preventDefault();

        // keep a margin between the edge of the menu and the window
        const edgeMargin = 10;

        const winRect = document.getElementById(idContentElement).getBoundingClientRect();

        document.getElementById('context-menu-container').style.display = 'block';
        const menuRect = document.getElementById('context-menu-wrapper').getBoundingClientRect();

        // get the mouse position and apply an offset to get the mouse-pointer on the first item
        let x = Math.max(edgeMargin, event.pageX - 60);
        let y = Math.max(edgeMargin, event.pageY - 20);

        // check if we're near the right edge of the window
        if (x > winRect.width - (menuRect.width + edgeMargin)) {
            x = winRect.width - (menuRect.width + edgeMargin);
        }

        // check if we're near the bottom edge of the window
        if (y > winRect.height - (menuRect.height + edgeMargin)) {
            y = winRect.height - (menuRect.height + edgeMargin);
        }

        const mnu = document.getElementById('context-menu-wrapper');
        mnu.style.top = y + "px";
        mnu.style.left = x + "px";

        // trigger the transition
        document.getElementById('context-menu-wrapper').classList.add('show');
    }

    static hideContextMenuOnClick(event) {
        // only close the context-menu if clicked outside
        if (!document.getElementById('context-menu-wrapper').contains(event.target)) {
            DataTableUtil.hideContextMenu();
        }
    }

    static hideContextMenu() {
        document.getElementById('context-menu-wrapper').classList.remove('show');
        window.setTimeout(()=>{document.getElementById('context-menu-container').style.display = 'none';}, 800);
    }
}