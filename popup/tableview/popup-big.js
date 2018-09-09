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
let resizeTimer;

$(document).ready(function() {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res);});

    const tableElement = $('#fhcTable');
    let table;

    // const table = createDataTable(tableElement);
    OptionsUtil.getDateFormat(
    ).then(dateformat => {
        DataTableUtil.dateformat = dateformat;
        table = createDataTable(tableElement, dateformat);

        // add event listener for saving changed pageSize
        table.on('length.dt', function(e, settings, len) {
            browser.storage.local.set({
                pageSizeBig: len
            });
            $('#fhcTable_paginate').toggle((len !== -1));
            // console.log( 'New page length: '+len);
        });

        // Add event listener for opening and closing details
        tableElement.find('tbody').on('click', 'td.my-details-control', function() {
            DataTableUtil.openDetailViewOnRowClick($(this), table, "view");
        });

        tableElement.find('tbody').on('dblclick', 'tr', function() {
            DataTableUtil.openDetailViewOnRowClick($(this), table, "view");
        });

        // Add event listener for select events
        table.on('select', function (e, dt, type /*, indexes */) {
            if (type === 'row') {
                selectionChangedHandler();
            }
        });

        // Add event listener for deselect events
        table.on('deselect', function (e, dt, type /*, indexes*/) {
            if (type === 'row') {
                selectionChangedHandler();
            }
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
            }).on('click', 'tr', function(event) {
            // Event listener for closing the context menu when clicked outside the menu
            WindowUtil.hideContextMenuOnClick(event);
        });
    }).then(() => {
        browser.storage.local.get(
            {pageSizeBig: 500}
        ).then(result => {
                // set the pagesize to the last used value
                table.page.len(result.pageSizeBig);

                // populate tableview with data from the database
                populateViewFromDatabase(table, 25, null, null);
                selectionChangedHandler();
            },
            () => {
                console.error("Get last used pagesize error", this.error);
            }
        );
    });

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

    // add keyhandler for menu
    $('body').on('keyup', function(event) {
        onKeyClicked(event);
    });

    $(window).on('beforeunload', function() {
        // console.log('Unloading window, notify child windows to also close!');
        // this only works when the close-button is used
        browser.runtime.sendMessage({eventType: 666}).then(null,
            error=>console.log(`Error sending close event: ${error}`)
        )
    });

    $(window).on('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            // resizing has stopped
            let buttonSpace = 160;
            if (window.innerWidth < 768) {
                // miscellaneous DataTable components will stack on top of each other, leave more room for the buttons
                buttonSpace = 220;
            }
            $('.dataTables_scrollBody').css('height', window.innerHeight-buttonSpace+"px");
            $('#fhcTable').DataTable().draw();
        }, 250);
    });

    setInterval(updateTableRowsAgeColumn, 60*1000);
});

function createDataTable(tableElement, dateformat) {
    let languageURL = DataTableUtil.getLanguageURL();
    const i18nFld = DataTableUtil.getLocaleFieldNames();
    const i18nAll = browser.i18n.getMessage("pagingAll") || 'All';

    return tableElement.DataTable( {
        responsive: {details: false},
        scrollY: '300px',
        language: {url: languageURL},
        paging: true,
        lengthMenu: [[100, 500, 1000, 2000, -1], [100, 500, 1000, 2000, i18nAll]],
        pageLength: 500,
        fnDrawCallback: function(){
            $('.dataTables_scrollBody').mCustomScrollbar({
                showArrows: 'true',
                scrollButtons:{ enable: true },
                theme: "3d-thick-dark"
            });
        },
        select: {
            style: 'multi+shift',
            info: true,
            selector: 'td:not(.my-details-control)'
        },
        order: [[ 7, "desc" ]],
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
            { title: i18nFld.uri, responsivePriority: 11 }
        ],
        columnDefs: [
            {
                targets: [ 1 ],
                visible: false,
                searchable: false
            },
            {
                targets: 2,
                data: 1,
                className: "dt-head-left",
                render: function ( data, type /*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 25, false, true);
                }
            },
            {
                targets: 3,
                data: 2,
                className: "dt-head-left",
                render: function ( data, type /* , full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 40, false, true);
                }
            },
            {
                targets: 4,
                data: 3,
                className: "dt-head-left"
            },
            {
                targets: 5,
                data: 4,
                type: "num",
                searchable: false,
                className: "dt-right",
                render: function ( data, /*type, full, meta */) {
                    return (!data) ? "" : data;
                }
            },
            {
                targets: 6,
                data: 5,
                className: "dt-head-left",
                render: function ( data, type /*, full, meta */) {
                    return DataTableUtil.formatDate(data, type, dateformat);
                }
            },
            {
                targets: 7,
                data: 6,
                className: "dt-head-left",
                render: function ( data, type /*, full, meta */) {
                    return DataTableUtil.formatDate(data, type, dateformat);
                }
            },
            {
                targets: 8,
                data: 6,
                className: "dt-head-left",
                render: function ( data, type /*, full, meta */) {
                    return DataTableUtil.formatAge(data, type);
                }
            },
            {
                targets: 9,
                data: 7,
                className: "dt-head-left",
                render: function ( data, type /*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 20, false, true);
                }
            },
            {
                targets: 10,
                data: 8,
                className: "dt-head-left",
                render: function ( data, type /*, full, meta */) {
                    return DataTableUtil.ellipsis(data, type, 30, false, true);
                }
            }
        ]
    });
}


function selectAll() {
    let table = $('#fhcTable').DataTable();
    table.rows().select();
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
            WindowUtil.showModalYesNo({titleId:'confirmDeleteMultipleTitle', msgId:'confirmDeleteMultipleMessage'}).then(
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
    let rows = $('#fhcTable').DataTable().rows('.selected');

    rows.every(
        function (/* rowIdx, tableLoop, rowLoop */) {
            let primaryKey = this.data()[0];
            // console.log('primaryKey database (delete) is: ' + primaryKey);
            DataTableUtil.deleteItemFromDatabase(primaryKey);
        }
    );
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
    populateViewFromDatabase(table, 25, null, null);
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
            editEntry(dataRightClicked);
            WindowUtil.hideContextMenu();
            break;

        case "delete-ctx":
            DataTableUtil.deleteItemFromDatabase(dataRightClicked[0]);
            DataTableUtil.broadcastItemDeletedFromDatabase();
            WindowUtil.hideContextMenu();
            break;

        case "copy2clipboard-ctx":
            DataTableUtil.copyEntryToClipboard(dataRightClicked);
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

    if (keyName === 'Escape' && WindowUtil.isModalDialogActive()) {
        WindowUtil.doCancelModalDialog();
        return;
    }

    if (event.altKey && !event.ctrlKey && !event.shiftKey && isAlpha(keyName)) {
        // console.log("We have an Alt-key event: " + keyName);

        // try to find a matching menu-item
        const menuItems = $("span[data-access-key='" + keyName +"']");
        if (menuItems.length > 0) {
            const menuItem = menuItems[0];

            // if no id its a toplevel menu
            if (!menuItem.id) {
                // $(menuItem).parent().addClass('hovered');
                // $(menuItem).parent().find('*').addClass('hovered');
            }
        }
    }
}
