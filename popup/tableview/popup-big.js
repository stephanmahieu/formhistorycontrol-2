'use strict';

browser.runtime.onMessage.addListener(fhcEvent=>{
    if (fhcEvent.eventType && fhcEvent.eventType===888) {
        // options have changed, reload
        OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res.interfaceTheme);});
    }
});

let dataRightClicked;
let resizeTimer;

$(document).ready(function() {
    OptionsUtil.getInterfaceTheme().then(res=>{ThemeUtil.switchTheme(res.interfaceTheme);});

    const tableElement = $('#fhcTable');
    const table = createDataTable(tableElement);

    // populate tableview with data from the database
    populateViewFromDatabase(table);
    selectionChangedHandler();

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
    tableElement.find('tbody').on('contextmenu', 'tr', function() {
        console.log("context menu should now display :-)");
        let tr = $(this).closest('tr');
        let row = table.row( tr );
        dataRightClicked = row.data();
    });
    $('menuitem').on('click', function(event) {
        onContextMenuClicked(event.currentTarget.id);
    });

    // Add event listeners for the buttons
    $('#buttons').find('button').on('click', function (event) {
        onButtonClicked(event.currentTarget.id);
    });

    // Add event listeners for the menu items
    $('nav ul li ul li span').on('click', function (event) {
        onMenuClicked(event.currentTarget.id);
    });

    // add keyhandler for menu
    $('body').on('keyup', function(event) {
        onKeyClicked(event);
    });

    $(window).on('beforeunload', function() {
        console.log('Unloading window, notify child windows to also close!');
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
});

function createDataTable(tableElement) {
    let languageURL = DataTableUtil.getLanguageURL();

    // get language specific header titles
    const hdrFieldname = browser.i18n.getMessage("fieldName") || 'Fieldname';
    const hdrFieldvalue = browser.i18n.getMessage("fieldValue") || 'Content';
    const hdrFieldType = browser.i18n.getMessage("fieldType") || 'Type';
    const hdrFieldCount = browser.i18n.getMessage("fieldCount") || 'Count';
    const hdrFieldFirst = browser.i18n.getMessage("fieldFirstUsed") || 'First used';
    const hdrFieldLast = browser.i18n.getMessage("fieldLastUsed") || 'Last used';
    const hdrFieldAge = browser.i18n.getMessage("fieldAge") || 'Age';
    const hdrFieldHost = browser.i18n.getMessage("fieldHost") || 'Host';

    return tableElement.DataTable( {
        responsive: {details: false},
        scrollY: '300px',
        language: {url: languageURL},
        paging: true,
        lengthMenu: [100, 500, 1000, 2000],
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
            { title: hdrFieldname, responsivePriority: 3 },
            { title: hdrFieldvalue, responsivePriority: 4  },
            { title: hdrFieldType, responsivePriority: 10  },
            { title: hdrFieldCount, responsivePriority: 5  },
            { title: hdrFieldFirst, responsivePriority: 9  },
            { title: hdrFieldLast, responsivePriority: 7  },
            { title: hdrFieldAge, responsivePriority: 6 },
            { title: hdrFieldHost, responsivePriority: 8  }
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

function deleteSelectedItems() {
    let rows = $('#fhcTable').DataTable().rows('.selected');
    rows.every(
        function (/* rowIdx, tableLoop, rowLoop */) {
            let primaryKey = this.data()[0];
            console.log('primaryKey database (delete) is: ' + primaryKey);
            deleteItemFromDatabase(primaryKey);
        }
    );

    // assume db deletes succeed, remove selected entries en redraw table
    rows.remove().draw();
}


function deleteItemFromDatabase(primaryKey) {
    // TODO open db only once?
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
            console.log("key " + primaryKey + " deleted from the object store.");
        };
        reqDel.onerror = function(/*evt*/) {
            console.error("delete error for key " + primaryKey, this.error);
        };
    }
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
        let cursorReq = objStore.index("by_last").openCursor(null, "prev");

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
                table.draw();
                $("#overlaystatus").removeClass('spinner').hide();
            }
        }
    };
}

function selectionChangedHandler() {
    let table = $('#fhcTable').DataTable();
    let noSelected = table.rows('.selected').indexes().length;
    console.log("Selection has changed! (" + noSelected + " selected)");

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
    console.log("buttonId " + buttonId + " clicked...");
    switch (buttonId) {
        case "buttonDelete":
            deleteSelectedItems();
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
    console.log("context menuItemId " + menuItemId + " clicked...");
    console.log('- primaryKey: ' + dataRightClicked[0] + '  fieldname: ' + dataRightClicked[1]);

    switch (menuItemId) {

        case "add-ctx":
            addNewEntry();
            break;

        case "modify-ctx":
            editEntry(dataRightClicked);
            break;

        case "delete-ctx":
            // TODO deleteCurrentItem();
            break;

        case "copy2clipboard-ctx":
            DataTableUtil.copyEntryToClipboard(dataRightClicked);
            break;

        case "selectall-ctx":
            selectAll();
            break;

        case "selectnone-ctx":
            selectNone();
            break;

        case "selectinvert-ctx":
            selectInvert();
            break;
    }
}

function onMenuClicked(menuItemId) {
    console.log("menuItemId " + menuItemId + " clicked...");
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
                deleteSelectedItems();
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
        console.log("We have an Alt-key event: " + keyName);

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
