/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

'use strict';

browser.runtime.onMessage.addListener(fhcEvent=>{
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 777:
                refreshView();
                break;
        }
    }
});


let dataRightClicked;

$(document).ready(function() {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    let table;

    // create/initialize the dataTable
    browser.storage.local.get({
            pageSizeSmall: 12,
            prefDateFormat: 'automatic',
            prefScrollAmount: 'auto',
            prefColSmallVisible: []
    }).then(result => {
        let pageSizeSmall = result.pageSizeSmall;
        let dateformat = result.prefDateFormat;
        let scrollAmount = result.prefScrollAmount;
        const prefColSmallVisible = OptionsUtil.initColSmallPrefs(result.prefColSmallVisible);

        table = createDataTable(dateformat, scrollAmount, prefColSmallVisible);

        // add event listener for saving changed pageSize
        table.on('length.dt', function(e, settings, len) {
            browser.storage.local.set({
                pageSizeSmall: len
            });
            // console.log( 'New page length: ' + len);
        });

        // add event listener for saving changed column visibility
        table.on('column-visibility.dt', function(e, settings, column, state) {
            if (column > 1) {
                // console.log('Column '+ column +' has changed to '+ (state ? 'visible' : 'hidden'));
                prefColSmallVisible[column - 2] = state;
                browser.storage.local.set({
                    prefColSmallVisible: prefColSmallVisible
                });
            }
        });

        $('#fhcTable tbody').on('dblclick', 'tr', function () {
            // show details in a separate window
            DataTableUtil.openDetailViewOnRowClick($(this), table, "view");
        }).on('contextmenu', 'tr', function(event) {
            // custom right-click menu
            // console.log("context menu should now display :-)");
            let tr = $(this).closest('tr');
            let row = table.row( tr );
            dataRightClicked = row.data();
            WindowUtil.showContextMenu(event, '#root');
        }).on('click', 'tr', function(event) {
            // Event listener for closing the context menu when clicked outside the menu
            WindowUtil.hideContextMenuOnClick(event);
        }).on('click', 'td.details-control', function () {
            // show inline details
            const tr = $(this).closest('tr');
            const row = table.row( tr );

            if (row.child.isShown()) {
                // This row is already open - close it
                $('div.detail-root', row.child()).slideUp('fast', function () {
                    row.child.hide();
                    tr.removeClass('shown');
                });
            }
            else {
                closePrevChildIfOpen();
                openChildRow = row.child( DataTableUtil.formatDetail(row.data()), 'no-padding');
                openChildRow.show();
                openTr = tr;
                tr.addClass('shown');
                $('div.detail-root', row.child()).slideDown('fast');
            }
        });

        // set the pagesize to the last used value
        table.page.len(pageSizeSmall);

        populateViewFromDatabase(table, 15, null, null);
      },
      () => {console.error("Get preferences error", this.error);}
    );

    /*
     * Unused code for future use, filter view to only show fields for active tab (current host, current fields)
     * ------------------------------------------------------------------------------------------------------------
        .then(() => {
            return browser.tabs.query(
                {lastFocusedWindow: true, active: true}
            );
        }).then(tabs => {
            if (tabs.length === 1) {
                let tab = tabs[0];
                // console.log('popup-small:: Active tab: id: ' + tab.id + ' windowId: ' + tab.windowId);
                // Send only a message to frameId 0 (the main window), inner frames won't receive an event. If the message
                // was sent to all frames on the page multiple responses would arrive but still only one gets processed!
                return browser.tabs.sendMessage(tab.id, {action: "getformfields", targetTabId: tab.id}, {frameId: 0}).then(
                    message => {
                        //console.log(`popup-small::responseMessage: ${message.response}`);
                        return message;
                    });
            } else {
                return Promise.reject("found 0 or > 1 active tabs");
            }
        }).then(fieldsMsg => {
            // console.log(`received ${fieldsMsg.fields.length} fields!`);
            populateViewFromDatabase(table, 15, fieldsMsg.fields, fieldsMsg.host);
        }).catch(reason => {
            // console.warn(`Could not get formfields from active tab, showing all instead. Error: ${reason}`);
            populateViewFromDatabase(table, 15, null, null);
        });
    * ------------------------------------------------------------------------------------------------------------
    */


    // Prevent the default right-click contextmenu
    document.oncontextmenu = function() {return false;};

    document.onkeyup = onKeyClicked;

    $('.context-menu-item').on('click', function(event) {
        onContextMenuClicked(event.currentTarget.id);
    });

    $('#bigdialog-action').on('click', function() {
        // Let background script open the popup (WindowUtil.createOrFocusWindow(FHC_WINDOW_MANAGE);)
        browser.runtime.sendMessage({eventType: 338}).then(null,
            error=>console.log(`Error sending open-bigdialog event: ${error}`)
        )
    });
    $('#preference-action').on('click', function() {
        // Let background script open the popup (WindowUtil.createOrFocusWindow(FHC_WINDOW_OPTIONS);)
        browser.runtime.sendMessage({eventType: 339}).then(null,
            error=>console.log(`Error sending open-preference event: ${error}`)
        )
    });
    $('#closepopup-action').on('click', function() {
        window.close();
    });

    // enable resizing height
    $('#resize-bar').on('mousedown', startResize);
});


function startResize(e) {
    // only allow resizing the height
    const startPosX = e.clientX;
    const startPosY = e.clientY;
    const initWidth = document.body.clientWidth;
    const initHeight = document.body.clientHeight;

    function eventMove(e) {
        //const deltaX = e.clientX - startPosX;

        // HACK: only allow grow, shrinking messes things up
        //const deltaY = e.clientY - startPosY;
        const deltaY = Math.max(e.clientY - startPosY, 0);

        // max size:= 800 x 600
        // const newWidth = Math.max(Math.min(initWidth - deltaX, 800), 500);
        const newHeight = Math.max(Math.min(initHeight + deltaY, 600), 450);

        // resize window
        //document.body.style.width = newWidth + 'px';
        document.body.style.height = newHeight + 'px';
    }

    function eventUp() {
        // WindowEvents.emit(document, 'SetUIState', {resize: undefined});
        document.removeEventListener('mouseup', eventUp);
        document.removeEventListener('mousemove', eventMove);

        // adjust table
        //$('#fhcTable').resize();
        $('.dataTables_scrollBody').css('height', (window.innerHeight - 110) + "px");
        $('#fhcTable').DataTable().draw();
    }

    document.addEventListener('mouseup', eventUp);
    document.addEventListener('mousemove', eventMove);
}


let openChildRow;
let openTr;
function closePrevChildIfOpen() {
    if (openChildRow) {
        openChildRow.child.hide();
        openTr.removeClass('shown');
        openChildRow = null;
        openTr = null;
    }
}


function onContextMenuClicked(menuItemId) {
    // console.log("context menuItemId " + menuItemId + " clicked...");
    switch (menuItemId) {

        case "add-ctx":
            DataTableUtil.openDetailViewEntry({}, "add");
            WindowUtil.hideContextMenu();
            break;

        case "modify-ctx":
            // console.log('- primaryKey: ' + dataRightClicked[0] + '  fieldname: ' + dataRightClicked[1]);
            DataTableUtil.openDetailViewEntry(dataRightClicked, "edit");
            WindowUtil.hideContextMenu();
            break;

        case "delete-ctx":
            // console.log('- primaryKey: ' + dataRightClicked[0] + '  fieldname: ' + dataRightClicked[1]);
            // method expects the primary key
            DataTableUtil.deleteItemFromDatabase(dataRightClicked[0]);
            DataTableUtil.broadcastItemDeletedFromDatabase();
            WindowUtil.hideContextMenu();
            break;

        case "copy2clipboard-ctx":
            // console.log('- primaryKey: ' + dataRightClicked[0] + '  fieldname: ' + dataRightClicked[1]);
            DataTableUtil.copyDataToClipboard(dataRightClicked);
            WindowUtil.hideContextMenu();
            break;

        case "copy2clipboardText-ctx":
            // console.log('- primaryKey: ' + dataRightClicked[0] + '  fieldname: ' + dataRightClicked[1]);
            DataTableUtil.copyDataCleanToClipboard(dataRightClicked);
            WindowUtil.hideContextMenu();
            break;
    }
}


function createDataTable(dateformat, scrollAmount, prefColVisible) {
    const languageURL = DataTableUtil.getLanguageURL();
    const i18nFld = DataTableUtil.getLocaleFieldNames();
    const i18nColVis = browser.i18n.getMessage("buttonColumnVisibility") || 'Column visibility';
    const i18nColVisRestore = browser.i18n.getMessage("buttonRestoreColumnVisibility") || 'Restore visibility';

    const table = $('#fhcTable').DataTable( {
        responsive: {details: false},
        scrollY: 300,
        language: {
            url: languageURL,
            buttons: {
                colvisRestore: i18nColVisRestore,
                colvis: i18nColVis
            }
        },
        order: [[ 7, "desc" ]],
        paging: true,
        lengthMenu: [10, 12, 20, 50, 100, 500],
        pageLength: 12,
        fnDrawCallback: function(){
            $('.dataTables_scrollBody').mCustomScrollbar({
                scrollInertia: 1000,
                showArrows: true,
                scrollButtons:{ enable: true, scrollAmount: 13 },
                mouseWheel:{ scrollAmount: scrollAmount },
                keyboard:{ enable: true, scrollAmount: 13 },
                theme: "3d-thick-dark"
            });
        },
        select: {
            style: 'single',
            info: false,
            selector: 'td:not(.details-control)'
        },
        columns: [
            {
                responsivePriority: 1,
                className: 'details-control',
                orderable: false,
                data: null,
                defaultContent: ''
            },
            { title: "Id", responsivePriority: 2 },
            { title: i18nFld.name, responsivePriority: 3 },
            { title: i18nFld.value, responsivePriority: 4 },
            { title: i18nFld.type, responsivePriority: 10 },
            { title: i18nFld.count, responsivePriority: 5 },
            { title: i18nFld.first, responsivePriority: 9 },
            { title: i18nFld.last, responsivePriority: 7 },
            { title: i18nFld.age, responsivePriority: 6 },
            { title: i18nFld.host, responsivePriority: 8 },
            { title: i18nFld.uri, responsivePriority: 11 },
            { title: i18nFld.length, responsivePriority: 12 }
        ],
        columnDefs: [
            {
                targets: [ 1 ],
                visible: false,
                searchable: false
            },
            {
                targets: 2,
                visible: prefColVisible[0],
                data: 1,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 14, false, true);
                }
            },
            {
                targets: 3,
                visible: prefColVisible[1],
                data: 2,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 18, false, true);
                }
            },
            {
                targets: 4,
                visible: prefColVisible[2],
                data: 3,
                className: "dt-head-left"
            },
            {
                targets: 5,
                visible: prefColVisible[3],
                data: 4,
                searchable: false,
                type: "num",
                className: "dt-right",
                render: function ( data, /*type, full, meta */) {
                    return (!data) ? "" : data;
                }
            },
            {
                targets: 6,
                visible: prefColVisible[4],
                data: 5,
                searchable: false,
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.formatDate(data, type, dateformat);
                }
            },
            {
                targets: 7,
                visible: prefColVisible[5],
                data: 6,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.formatDate(data, type, dateformat);
                }
            },
            {
                targets: 8,
                visible: prefColVisible[6],
                data: 6,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.formatAge(data, type);
                }
            },
            {
                targets: 9,
                visible: prefColVisible[7],
                data: 7,
                className: "dt-head-left",
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 15, false, true);
                }
            },
            {
                targets: 10,
                visible: prefColVisible[8],
                data: 8,
                className: "dt-head-left",
                searchable: true,
                render: function ( data, type/*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 15, false, true);
                }
            },
            {
                targets: 11,
                visible: prefColVisible[9],
                data: 2,
                type: "num",
                searchable: false,
                className: "dt-right",
                render: function ( data, /*type, full, meta */) {
                    return (!data) ? "0" : data.length;
                }
            }
        ]
    } );

    new $.fn.dataTable.Buttons(table, {
        buttons: [{
            extend: 'colvis',
            columns: ':gt(1)',
            postfixButtons: [ 'colvisRestore' ]
        }]
    });
    table.table().buttons().container().appendTo( $('#colvis-container', table.table().container()));

    return table;
}

function refreshView() {
    let table = $('#fhcTable').DataTable();
    table.clear();
    populateViewFromDatabase(table);
}

function deleteSelected() {
    let deleted = false;
    let rows = $('#fhcTable').DataTable().rows('.selected');
    rows.every(
        function (/* rowIdx, tableLoop, rowLoop */) {
            let primaryKey = this.data()[0];
            // console.log('primaryKey database (delete) is: ' + primaryKey);
            DataTableUtil.deleteItemFromDatabase(primaryKey);
            deleted = true;
        }
    );
    if (deleted) {
        DataTableUtil.broadcastItemDeletedFromDatabase();
    }
}

function onKeyClicked(event) {
    const keyName = event.key;

    // Select all is not supported for the small popup (single select only)

    // Delete and Shift+Delete key
    if (!event.altKey && !event.ctrlKey && keyName === 'Delete') {
        deleteSelected();
    }

    // context menu shortcut (Alt+key)
    if (event.altKey && !event.ctrlKey && !event.shiftKey && isAlpha(keyName)) {
        // try to find a matching menu-item
        const menuItems = $("span[data-access-key='" + keyName +"']");
        if (menuItems.length > 0) {
            const menuItem = menuItems[0];

            // if no id its a toplevel menu
            if (menuItem.id) {
                onContextMenuClicked(menuItem.id);
            }
        }
    }
}