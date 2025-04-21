/*
 * Copyright (c) 2025. Stephan Mahieu
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
            case 808:
                // restore this window to default size and position
                browser.windows.getCurrent({populate: false}).then((window)=>{
                    WindowUtil.restoreToDefault(window.id, FHC_WINDOW_MANAGE);
                });
                break;
        }
    }
});

let dataRightClicked;
let resizeTimer;

$(document).ready(function() {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    const tableElement = $('#fhcTable');
    let table;

    browser.storage.local.get({
        pageSizeBig: 500,
        prefDateFormat: 'automatic',
        prefColBigVisible: []
    }).then(result => {
        let pageSizeBig = result.pageSizeBig;
        let dateformat = result.prefDateFormat;
        const prefColBigVisible = OptionsUtil.initColPrefs(result.prefColBigVisible);
        DataTableUtil.dateformat = dateformat;
        table = createDataTable(tableElement, dateformat, prefColBigVisible);

        // add event listener for saving changed pageSize
        table.on('length.dt', function(e, settings, len) {
            browser.storage.local.set({
                pageSizeBig: len
            });
            $('.dt-paging').toggle((len !== -1));
            // console.log( 'New page length: '+len);
        });

        // add event listener for saving changed column visibility
        table.on('column-visibility.dt', function(e, settings, column, state) {
            if (column > 1) {
                // console.log('Column '+ column +' has changed to '+ (state ? 'visible' : 'hidden'));
                prefColBigVisible[column - 2] = state;
                browser.storage.local.set({
                    prefColBigVisible: prefColBigVisible
                });
            }
        });

        // add event listener for opening and closing details
        tableElement.find('tbody').on('click', 'td.my-details-control', function() {
            DataTableUtil.openDetailViewOnRowClick($(this), table, "view");
        });
        tableElement.find('tbody').on('dblclick', 'tr', function() {
            DataTableUtil.openDetailViewOnRowClick($(this), table, "view");
        });

        // add event listener for select events
        table.on('select', function (e, dt, type /*, indexes */) {
            if (type === 'row') {
                selectionChangedHandler();
            }
        });

        // add event listener for deselect events
        table.on('deselect', function (e, dt, type /*, indexes*/) {
            if (type === 'row') {
                selectionChangedHandler();
            }
        });

        // add event listener for search events
        table.on('search.dt', function (e, dt) {
            searchBoxChangedHandler();
        });

        // navigation menu animation
        $('nav li').hover(
            function() {
                $('ul', this).stop().slideDown(200);
            },
            function() {
                $('ul', this).stop().slideUp(200);
            }
        );

        // custom right-click menu
        tableElement.find('tbody')
            .on('contextmenu', 'tr', function(event) {
                // console.log("context menu should now display :-)");
                let tr = $(this).closest('tr');
                let row = table.row( tr );
                dataRightClicked = row.data();
                WindowUtil.showContextMenu(event, '#content');
            })
            .on('click', 'tr', function(event) {
                // Event listener for closing the context menu when clicked outside the menu
                WindowUtil.hideContextMenuOnClick(event);
            }
        );

        // set the pagesize to the last used value
        table.page.len(pageSizeBig);

        // populate tableview with data from the database
        populateViewFromDatabase(table, 25, null, null, true);
        selectionChangedHandler();
      },
      () => {console.error("Get preferences error", this.error);}
    );

    // Prevent the default right-click contextmenu
    document.oncontextmenu = function() {return false;};

    $('.context-menu-item').on('click', function(event) {
        onContextMenuClicked(event.currentTarget.id);
    });

    // Add event listeners for the buttons
    $('#buttons').find('button').on('click', function (event) {
        onButtonClicked(event.currentTarget.id);
    });

    // Add event listeners for the menu-bar items
    $('nav ul li ul li span').on('click', function (event) {
        onMenuClicked(event.currentTarget.id);
    });

    // add keyhandler for esc/del/select-all and menu
    $('body').on('keyup', function(event) {
        onKeyClicked(event);
    });

    $(window).on('beforeunload', function() {
        // console.log('Unloading window, notify child windows to also close!');
        // this only works when the close-button is used
        browser.runtime.sendMessage({eventType: 666}).then(null,
            error=>console.log(`Error sending close event: ${error}`)
        ).catch((err) => {
            /* ignore error if no child windows are opened */
            if (err.message && !err.message.includes('Receiving end does not exist')) {
                throw(err)
            }
        })
    });

    $(window).on('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            // resizing has stopped
            resizeTable();
            $('#fhcTable').DataTable().draw();
            WindowUtil.saveWindowPrefs(FHC_WINDOW_MANAGE);
        }, 250);
    });

    setInterval(updateTableRowsAgeColumn, 60*1000);

    // no event available for window move, check periodically
    setInterval(function() {WindowUtil.checkAndSaveCurrentWindowPosition(FHC_WINDOW_MANAGE);}, 5*1000);
});

function createDataTable(tableElement, dateformat, prefColVisible) {
    let languageURL = DataTableUtil.getLanguageURL();
    const i18nFld = DataTableUtil.getLocaleFieldNames();
    const i18nAll = browser.i18n.getMessage("pagingAll") || 'All';
    const i18nColVis = browser.i18n.getMessage("buttonColumnVisibility") || 'Column visibility';
    const i18nColVisRestore = browser.i18n.getMessage("buttonRestoreColumnVisibility") || 'Restore visibility';

    return tableElement.DataTable( {
        responsive: {details: false},
        scrollY: '300',
        language: {
            url: languageURL,
            buttons: {
                colvisRestore: i18nColVisRestore,
                colvis: i18nColVis
            }
        },
        paging: true,
        lengthMenu: [[100, 500, 1000, 2000, -1], ['100', '500', '1000', '2000', i18nAll]],
        pageLength: 500,
        select: {
            style: 'multi+shift',
            info: true,
            selector: 'td:not(.my-details-control)'
        },
        order: [[ 7, "desc" ]],
        layout: {
            topStart: {
                buttons: [
                    {
                        extend: 'pageLength'
                    },
                    {
                        extend: 'colvis',
                        postfixButtons: ['colvisRestore'],
                        /*text: '<span class="column-selector" title="'+i18nColVis+'"/>',*/
                        columnText: function(dt, idx, title) {
                            return '<span class="col-select"><span class="check"/></span><span class="col-select-title">'+title+'</span>';
                        },
                        columns: ':gt(1)'
                    }
                ]
            },
            topEnd: 'search',
            bottomStart: 'info',
            bottomEnd: 'paging'
        },
        columns: [
            {
                responsivePriority: 1,
                className: 'my-details-control',
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
                render: function ( data, type /*, row */) {
                    return DataTableUtil.ellipsis(data, type, 25, false, true);
                }
            },
            {
                targets: 3,
                visible: prefColVisible[1],
                data: 2,
                className: "dt-head-left",
                render: function ( data, type /*, row */) {
                    return DataTableUtil.ellipsis(data, type, 40, false, true);
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
                type: "num",
                searchable: false,
                className: "dt-right",
                render: function ( data, /*type, row */) {
                    return (!data) ? "" : data;
                }
            },
            {
                targets: 6,
                visible: prefColVisible[4],
                data: 5,
                className: "dt-head-left",
                render: function ( data, type /*, row */) {
                    return DataTableUtil.formatDate(data, type, dateformat);
                }
            },
            {
                targets: 7,
                visible: prefColVisible[5],
                data: 6,
                className: "dt-head-left",
                render: function ( data, type /*, row */) {
                    return DataTableUtil.formatDate(data, type, dateformat);
                }
            },
            {
                targets: 8,
                visible: prefColVisible[6],
                data: 6,
                className: "dt-right",
                render: function ( data, type /*, row */) {
                    return DataTableUtil.formatAge(data, type);
                }
            },
            {
                targets: 9,
                visible: prefColVisible[7],
                data: 7,
                className: "dt-head-left",
                render: function ( data, type /*, row */) {
                    return DataTableUtil.ellipsis(data, type, 20, false, true);
                }
            },
            {
                targets: 10,
                visible: prefColVisible[8],
                data: 8,
                className: "dt-head-left",
                render: function ( data, type /*, row */) {
                    return DataTableUtil.ellipsis(data, type, 30, false, true);
                }
            },
            {
                targets: 11,
                visible: prefColVisible[9],
                data: 2,
                type: "num",
                searchable: false,
                className: "dt-right",
                render: function ( data, /*type, row */) {
                    return (!data) ? "0" : data.length;
                }
            }
        ]
    });
}


function selectAll() {
    let table = $('#fhcTable').DataTable();
    table.rows( {order:'index', search:'applied'} ).select();
}

function selectNone() {
    let table = $('#fhcTable').DataTable();
    table.rows().deselect();
}

function selectInvert() {
    let table = $('#fhcTable').DataTable();
    let curSelected = table.rows('.selected').indexes();
    table.rows().select();
    table.rows(curSelected).deselect();
}

function deleteSelectedItemsAsk() {
    let rows = $('#fhcTable').DataTable().rows('.selected');

    if (rows.data().length > 1) {
        // multiple items to be deleted, ask confirmation
        try {
            WindowUtil.showModalYesNo(
                {titleId:'confirmDeleteMultipleTitle', msgId:'confirmDeleteMultipleMessage', args: [rows.data().length]}
            ).then(
                value=>{deleteSelectedItems(value);},
                reason=>{console.log('rejected ' + reason);}
            );
        } catch(err){
            // suppress TypeError: WindowUtil.showModalYesNo(...) is undefined
        }
    } else {
        // delete a single item
        deleteSelectedItems()
    }
}

function deleteSelectedItems() {
    const rows = $('#fhcTable').DataTable().rows('.selected');

    // Collect primaryKeys in array
    const primaryKeys = [];
    rows.every(
        function (/* rowIdx, tableLoop, rowLoop */) {
            const primaryKey = this.data()[0];
            // console.log('primaryKey database (delete) is: ' + primaryKey);
            primaryKeys.push(primaryKey);
        }
    );

    DataTableUtil.deleteMultipleItemsFromDatabase(primaryKeys);
    DataTableUtil.broadcastItemDeletedFromDatabase();

    // assume db deletes succeed, remove selected entries and redraw table
    rows.remove().draw();
}

function editSelectedEntries() {
    let table = $('#fhcTable').DataTable();
    DataTableUtil.openDetailViewSelectedEntries(table, "edit");
}

function editEntry(data) {
    DataTableUtil.openDetailViewEntry(data, "edit");
}

function addNewEntry() {
    DataTableUtil.openDetailViewEntry({}, "add");
}

function refreshView() {
    let table = $('#fhcTable').DataTable();
    table.clear();
    selectionChangedHandler();
    populateViewFromDatabase(table, 25, null, null, true);
}

function updateTableRowsAgeColumn() {
    let table = $('#fhcTable').DataTable();
    let now = (new Date()).getTime();
    let redraw = false;

    table.rows().every(
        function (/* rowIdx, tableLoop, rowLoop */) {
            let last = this.data()[6];
            let timePassedSec = (now - last) / 1000;
            if (timePassedSec <= 3660) {
                // if age < 1 hour update each invocation (every minute)
                this.invalidate();
                redraw = true;
            }
        }
    );
    if (redraw) {
        table.draw('page');
    }
}

function selectionChangedHandler() {
    let table = $('#fhcTable').DataTable();
    let noSelected = table.rows('.selected').indexes().length;
    // console.log("Selection has changed! (" + noSelected + " selected)");

    // enable/disable buttons
    setButtonEnabled('buttonDelete', (noSelected !== 0));
    setButtonEnabled('buttonModify', (noSelected !== 0));

    // enable/disable menu-item
    setMenuItemEnabled('delete', (noSelected !== 0));
    setMenuItemEnabled('modify', (noSelected !== 0));
    setMenuItemEnabled('copy2clipboard', (noSelected === 1));
    setMenuItemEnabled('copy2clipboardText', (noSelected === 1));
}

function setButtonEnabled(id, enabled) {
    $('#'+id).prop( "disabled", !enabled);
}
function setMenuItemEnabled(id, enabled) {
    let mnuItem = $('#'+id);
    if (enabled) {
        mnuItem.removeClass('menu-disabled');
    } else {
        mnuItem.addClass('menu-disabled');
    }
}
function isMenuItemEnabled(id) {
    return  !($('#'+id).hasClass('menu-disabled'));
}

function onButtonClicked(buttonId) {
    // console.log("buttonId " + buttonId + " clicked...");
    switch (buttonId) {
        case "buttonDelete":
            deleteSelectedItemsAsk();
            break;

        case "buttonModify":
            editSelectedEntries();
            break;

        case "buttonAdd":
            addNewEntry();
            break;

        case "buttonClose":
            WindowUtil.closeThisPopup();
            break;
    }
}

function onContextMenuClicked(menuItemId) {
    // console.log("context menuItemId " + menuItemId + " clicked...");
    // console.log('- primaryKey: ' + dataRightClicked[0] + '  fieldname: ' + dataRightClicked[1]);

    switch (menuItemId) {

        case "add-ctx":
            addNewEntry();
            WindowUtil.hideContextMenu();
            break;

        case "modify-ctx":
            // if one or more entries are selected edit the selection, otherwise edit the right-clicked item
            if (haveSelectedItems()) {
                editSelectedEntries();
            } else {
                editEntry(dataRightClicked);
            }
            WindowUtil.hideContextMenu();
            break;

        case "delete-ctx":
            // if one or more entries are selected delete selection, otherwise delete the right-clicked item
            if (haveSelectedItems()) {
                deleteSelectedItemsAsk();
            } else {
                DataTableUtil.deleteItemFromDatabase(dataRightClicked[0]);
                DataTableUtil.broadcastItemDeletedFromDatabase();
            }
            WindowUtil.hideContextMenu();
            break;

        case "copy2clipboard-ctx":
            // if one or more entries are selected copy the first selected item, otherwise copy the right-clicked item
            if (haveSelectedItems()) {
                const dataRow1 = $('#fhcTable').DataTable().rows('.selected').data()[0];
                DataTableUtil.copyDataToClipboard(dataRow1);
            } else {
                DataTableUtil.copyDataToClipboard(dataRightClicked);
            }
            WindowUtil.hideContextMenu();
            break;

        case "selectall-ctx":
            selectAll();
            WindowUtil.hideContextMenu();
            break;

        case "selectnone-ctx":
            selectNone();
            WindowUtil.hideContextMenu();
            break;

        case "selectinvert-ctx":
            selectInvert();
            WindowUtil.hideContextMenu();
            break;
    }
}

function onMenuClicked(menuItemId) {
    // console.log("menuItemId " + menuItemId + " clicked...");
    switch (menuItemId) {
        case "import":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_IMPORT);
            break;

        case "export":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_EXPORT);
            break;

        case "close":
            WindowUtil.closeThisPopup();
            break;

        case "add":
            addNewEntry();
            break;

        case "modify":
            if (isMenuItemEnabled(menuItemId)) {
                editSelectedEntries();
            }
            break;

        case "delete":
            if (isMenuItemEnabled(menuItemId)) {
                deleteSelectedItemsAsk();
            }
            break;

        case "copy2clipboard":
            if (isMenuItemEnabled(menuItemId)) {
                DataTableUtil.copySelectedEntryToClipboard($('#fhcTable').DataTable());
                WindowUtil.showModalInformation({titleId:'dialogInformationTitle', msgId:'informClipboardValueCopied'});
            }
            break;

        case "copy2clipboardText":
            if (isMenuItemEnabled(menuItemId)) {
                DataTableUtil.copySelectedEntryCleanToClipboard($('#fhcTable').DataTable());
                WindowUtil.showModalInformation({titleId:'dialogInformationTitle', msgId:'informClipboardValueCopied'});
            }
            break;

        case "selectall":
            selectAll();
            break;

        case "selectnone":
            selectNone();
            break;

        case "selectinvert":
            selectInvert();
            break;

        case "refresh":
            refreshView();
            break;

        case "preferences":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_OPTIONS);
            break;

        case "cleanup":
            try {
                OptionsUtil.getCleanupPrefs().then(prefs => {
                    const keepDays = prefs.prefKeepDaysHistory;

                    WindowUtil.showModalYesNo({titleId:'confirmStartCleanupTitle', msgId:'confirmStartCleanupMessage', args:keepDays}).then(
                        value=>{
                            browser.runtime.sendMessage({eventType: 800});
                            WindowUtil.showModalInformation({titleId:'dialogInformationTitle', msgId:'informCleanupInitiated', args:keepDays});
                        },
                        reason=>{console.log('rejected ' + reason);}
                    );
                });
            } catch(err){
                // suppress TypeError: WindowUtil.showModalYesNo(...) is undefined
                console.log(err);
            }
            break;

        case "helpoverview":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_HELP);
            break;

        case "releasenotes":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_RELNOTES);
            break;

        case "about":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_ABOUT);
            break;
    }
}


function onKeyClicked(event) {
    const keyName = event.key;
    const keyCode = event.code;

    if (keyCode === 'Escape') {
        if (WindowUtil.isModalDialogActive()) {
            WindowUtil.doCancelModalDialog();
            return;
        }
        if (WindowUtil.isContextMenuShown()) {
            WindowUtil.hideContextMenu();
            return;
        }
    }

    // Select all (Ctrl-A seems locale independent)
    if (!event.altKey && event.ctrlKey && !event.shiftKey && keyCode === 'KeyA') {
        // event.stopImmediatePropagation not effective, user-select style none will prevent showing selected elements
        selectAll();
        return;
    }

    // Delete and Shift+Delete key
    if (!event.altKey && !event.ctrlKey && keyCode === 'Delete') {
        if (isMenuItemEnabled('delete')) {
            if (event.shiftKey) {
                deleteSelectedItems();
            } else {
                deleteSelectedItemsAsk();
            }
        }
        return;
    }

    // Ctrl+C Copy all
    if (!event.altKey && event.ctrlKey && !event.shiftKey && keyCode === 'KeyC') {
        event.preventDefault();

        // if one or more entries are selected copy the first selected item
        if (haveSelectedItems()) {
            const dataRow1 = $('#fhcTable').DataTable().rows('.selected').data()[0];
            DataTableUtil.copyDataToClipboard(dataRow1);
        }
    }

    // Shift+Ctrl+C Copy without formatting
    if (!event.altKey && event.ctrlKey && event.shiftKey && keyCode === 'KeyC') {
        event.preventDefault();

        // if one or more entries are selected copy the first selected item
        if (haveSelectedItems()) {
            const dataRow1 = $('#fhcTable').DataTable().rows('.selected').data()[0];
            DataTableUtil.copyDataCleanToClipboard(dataRow1);
        }
    }

    // context menu shortcut (Alt+key)
    if (event.altKey && !event.ctrlKey && !event.shiftKey && isAlpha(keyName)) {
        // try to find a matching menu-item
        const menuItems = $("span[data-access-key='" + keyName +"']");
        if (menuItems.length > 0) {
            const menuItem = menuItems[0];

            // if no id its a toplevel menu
            if (menuItem.id) {
                onMenuClicked(menuItem.id);
            }
        }
    }
}
