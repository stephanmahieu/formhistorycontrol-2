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
     * Formatting function for row details.
     *
     * @param d
     * @returns {string}
     */
    static formatDetail( d ) {
        // `d` is the original data object for the row
        return '<div class="detail-root"><table>'+
            '<tr><td><span class="label">Veldnaam:</span></td><td>'+d[1]+'</td></tr>'+
            '<tr><td><span class="label">Waarde:</span></td><td>'+d[2]+'</td></tr>'+
            '<tr><td><span class="label">Aantal:</span></td><td>'+d[4]+'</td></tr>'+
            '<tr><td><span class="label">Eerst gebruikt:</span></td><td>'+this.formatDate(d[5], 'display')+'</td></tr>'+
            '<tr><td><span class="label">Laatst gebruikt:</span></td><td>'+this.formatDate(d[6], 'display')+'</td></tr>'+
            '<tr><td><span class="label">Bron:</span></td><td>'+d[7]+'</td></tr>'+
            '</table></div>';
    }

    /**
     *
     * @param data
     * @param type
     * @returns {String}
     */
    static formatDate(data, type) {
        return (type === 'display' || type === 'filter') ? DateUtil.dateToDateString(new Date(data)) : data;
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

    static openDetailViewOnRowClick(clickedElem, table) {
        let tr = clickedElem.closest('tr');
        let row = table.row( tr );
        let data = row.data();

        // store data in local storage so it can be retrieved by the view
        browser.storage.local.set({
            entryObject: {
                primaryKey: data[0],
                name      : data[1],
                value     : data[2],
                type      : data[3],
                used      : data[4],
                first     : data[5],
                last      : data[6],
                url       : data[7]
            }
        });

        // TODO modal?: https://stackoverflow.com/questions/24801124/how-to-make-window-open-pop-up-modal
        if (data[3] === 'input') {
            WindowUtil.createNewPopupWindow(FHC_WINDOW_ENTRYVW);
        } else {
            WindowUtil.createNewPopupWindow(FHC_WINDOW_EDITRVW);
        }
    }

}







