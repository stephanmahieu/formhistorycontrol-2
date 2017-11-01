'use strict';

browser.runtime.onMessage.addListener(fhcEvent=>{
    if (fhcEvent.eventType) {
        switch (fhcEvent.eventType) {
            case 888:
                OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res.interfaceTheme);});
                break;

            case 777:
                refreshView();
                break;

            case 111:
                databaseChangeSingleItem(fhcEvent.what, fhcEvent.primaryKey, fhcEvent.fhcEntry);
                break;
        }
    }
});

let dataRightClicked;
let resizeTimer;

$(document).ready(function() {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res.interfaceTheme);});

    const tableElement = $('#fhcTable');
    const table = createDataTable(tableElement);

    let gettingPageSize = browser.storage.local.get({
        pageSizeBig: 500
    });
    gettingPageSize.then(
        result => {
            // set the pagesize to the last used value
            table.page.len(result.pageSizeBig);

            // populate tableview with data from the database
            populateViewFromDatabase(table);
            selectionChangedHandler();
        },
        () => {console.error("Get last used pagesize error", this.error);}
    );

    // add event listener for saving changed pageSize
    table.on('length.dt', function(e, settings, len) {
        browser.storage.local.set({
            pageSizeBig: len
        });
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

    // // Prevent the default right-click contextmenu
    // //document.oncontextmenu = function() {return false;};

    // custom right-click menu
    tableElement.find('tbody')
      .on('contextmenu', 'tr', function(event) {
        // console.log("context menu should now display :-)");
        let tr = $(this).closest('tr');
        let row = table.row( tr );
        dataRightClicked = row.data();
        DataTableUtil.showContextMenu(event, 'content');
    }).on('click', 'tr', function(event) {
        // Event listener for closing the context menu when clicked outside the menu
        DataTableUtil.hideContextMenuOnClick(event);
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

function createDataTable(tableElement) {
    let languageURL = DataTableUtil.getLanguageURL();
    const i18nFld = DataTableUtil.getLocaleFieldNames();

    return tableElement.DataTable( {
        responsive: {details: false},
        scrollY: '300px',
        language: {url: languageURL},
        paging: true,
        lengthMenu: [100, 500, 1000, 2000, 5000],
        pageLength: 500,
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
            { title: i18nFld.value, responsivePriority: 4  },
            { title: i18nFld.type, responsivePriority: 10  },
            { title: i18nFld.count, responsivePriority: 5  },
            { title: i18nFld.first, responsivePriority: 9  },
            { title: i18nFld.last, responsivePriority: 7  },
            { title: i18nFld.age, responsivePriority: 6 },
            { title: i18nFld.host, responsivePriority: 8  }
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
                    return DataTableUtil.formatDate(data, type);
                }
            },
            {
                targets: 7,
                data: 6,
                className: "dt-head-left",
                render: function ( data, type /*, full, meta */) {
                    return DataTableUtil.formatDate(data, type);
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
                    return DataTableUtil.ellipsis(data, type, 25, false, true);
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
            WindowUtil.showModalYesNo('confirmDeleteMultipleTitle', 'confirmDeleteMultipleMessage').then(
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
    populateViewFromDatabase(table);
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
        table.draw();
    }
}

function populateViewFromDatabase(table) {
    $("#overlaystatus").addClass('spinner').show();

    let req = indexedDB.open(DbConst.DB_NAME, DbConst.DB_VERSION);
    req.onerror = function (/*event*/) {
        console.error("Database open error", this.error);
        $("#overlaystatus").hide();
    };
    req.onsuccess = function (event) {
        // Better use "this" than "req" to get the result to avoid problems with garbage collection.
        let db = event.target.result;
        //console.log("Database opened successfully.");

        let count = 0;
        let objStore = db.transaction(DbConst.DB_STORE_TEXT, "readonly").objectStore(DbConst.DB_STORE_TEXT);
        let cursorReq = objStore.index(DbConst.DB_TEXT_IDX_LAST).openCursor(null, "prev");

        cursorReq.onsuccess = function(evt) {
            let cursor = evt.target.result;
            if (cursor) {
                let fhcEntry = cursor.value;
                //console.log("Entry [" + cursor.key + "] name:[" + fhcEntry.name + "] value:[" + fhcEntry.value + "] used:[" + fhcEntry.used + "] host:" + fhcEntry.host + "] type:[" + fhcEntry.type + "} KEY=[" + fhcEntry.fieldkey + "]");

                table.row.add([cursor.primaryKey, fhcEntry.name, fhcEntry.value, fhcEntry.type, fhcEntry.used, fhcEntry.first, fhcEntry.last, fhcEntry.host]);

                // only update display after 25 rows and when finished
                count += 1;
                if (count === 25) {
                    table.draw();
                }

                cursor.continue();
            }
            else {
                //console.log("No more entries!");

                console.log();

                table.draw();
                $("#overlaystatus").removeClass('spinner').hide();
            }
        }
    };
}

function databaseChangeSingleItem(what, primaryKey, fhcEntry) {
    let table = $('#fhcTable').DataTable();
    switch(what) {
        case 'add':
            table.row
                .add([primaryKey, fhcEntry.name, fhcEntry.value, fhcEntry.type, fhcEntry.used, fhcEntry.first, fhcEntry.last, fhcEntry.host])
                .draw();
            break;

        case 'update':
            table.rows().every(
                function (/* rowIdx, tableLoop, rowLoop */) {
                    if (this.data()[0] === primaryKey) {
                        let d = this.data();
                        d[1] = fhcEntry.name;
                        d[2] = fhcEntry.value;
                        d[3] = fhcEntry.type;
                        d[4] = fhcEntry.used;
                        d[5] = fhcEntry.first;
                        d[6] = fhcEntry.last;
                        d[7] = fhcEntry.host;
                        this.invalidate();
                        table.draw();
                    }
                }
            );
            break;
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
    seMenuItemEnabled('delete', (noSelected !== 0));
    seMenuItemEnabled('modify', (noSelected !== 0));
    seMenuItemEnabled('copy2clipboard', (noSelected === 1));
}

function setButtonEnabled(id, enabled) {
    $('#'+id).prop( "disabled", !enabled);
}
function seMenuItemEnabled(id, enabled) {
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

        case "buttonCleanup":
            // TODO cleanup
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
            DataTableUtil.hideContextMenu();
            break;

        case "modify-ctx":
            editEntry(dataRightClicked);
            DataTableUtil.hideContextMenu();
            break;

        case "delete-ctx":
            DataTableUtil.deleteItemFromDatabase(dataRightClicked[0]);
            DataTableUtil.broadcastItemDeletedFromDatabase();
            DataTableUtil.hideContextMenu();
            break;

        case "copy2clipboard-ctx":
            DataTableUtil.copyEntryToClipboard(dataRightClicked);
            DataTableUtil.hideContextMenu();
            break;

        case "selectall-ctx":
            selectAll();
            DataTableUtil.hideContextMenu();
            break;

        case "selectnone-ctx":
            selectNone();
            DataTableUtil.hideContextMenu();
            break;

        case "selectinvert-ctx":
            selectInvert();
            DataTableUtil.hideContextMenu();
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
                // hide the menu and give feedback of successful copy
                alert("Value copied"); // TODO internationalize copy 2 clipboard alert
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

        case "helpoverview":
            // TODO helpoverview
            break;

        case "releasenotes":
            // TODO releasenotes
            break;

        case "about":
            WindowUtil.createOrFocusWindow(FHC_WINDOW_ABOUT);
            break;
    }
}


function onKeyClicked(event) {
    const keyName = event.key;
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
