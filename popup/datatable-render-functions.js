//import {DateUtil} from '../common/DateUtil.js';

'use strict';


/* Formatting function for row details */
function formatDetail( d ) {
    // `d` is the original data object for the row
    return '<div class="detail-root"><table>'+
        '<tr><td><span class="label">Veldnaam:</span></td><td>'+d[1]+'</td></tr>'+
        '<tr><td><span class="label">Waarde:</span></td><td>'+d[2]+'</td></tr>'+
        '<tr><td><span class="label">Aantal:</span></td><td>'+d[3]+'</td></tr>'+
        '<tr><td><span class="label">Eerst gebruikt:</span></td><td>'+formatDate(d[4], 'display')+'</td></tr>'+
        '<tr><td><span class="label">Laatst gebruikt:</span></td><td>'+formatDate(d[5], 'display')+'</td></tr>'+
        '<tr><td><span class="label">Bron:</span></td><td>'+d[6]+'</td></tr>'+
        '</table></div>';
}

function formatDate(data, type) {
    return (type === 'display' || type === 'filter') ? DateUtil.dateToDateString(new Date(data)) : data;
}


function ellipsis(data, type, cutoff, wordbreak, escapeHtml) {
    let esc = function ( t ) {
        return t
            .replace( /&/g, '&amp;' )
            .replace( /</g, '&lt;' )
            .replace( />/g, '&gt;' )
            .replace( /"/g, '&quot;' );
    };

    // Order, search and type get the original data
    if ( type !== 'display' ) {
        return data;
    }

    if ( typeof data !== 'number' && typeof data !== 'string' ) {
        return data;
    }

    data = data.toString(); // cast numbers

    if ( data.length <= cutoff ) {
        return data;
    }

    let shortened = data.substr(0, cutoff-1);

    // Find the last white space character in the string
    if ( wordbreak ) {
        shortened = shortened.replace(/\s([^\s]*)$/, '');
    }

    // Protect against uncontrolled HTML input
    if ( escapeHtml ) {
        shortened = esc( shortened );
    }

    return '<span class="ellipsis" title="'+esc(data)+'">'+shortened+'&#8230;</span>';
}


function formatAge(data, type) {
    if  (type === 'display' || type === 'filter') {
        return DateUtil.getFuzzyAge(data);
    }
    else {
        return data;
    }
}
