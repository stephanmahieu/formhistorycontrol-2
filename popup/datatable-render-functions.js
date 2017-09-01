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
    return (type === 'display' || type === 'filter') ? _dateToDateString(new Date(data)) : data;
}

function _dateToDateString(aDate) {
    return _getDateString(aDate) + ' ' + _getTimeString(aDate);
}
function _getDateString(aDate) {
    let strLocaleDate = aDate.toLocaleDateString();
    let dateSeparator = strLocaleDate.replace(/[0-9]/g,'').charAt(0);
    let dateParts = strLocaleDate.split(dateSeparator);
    let strPaddedDate = '';
    for(let i=0; i<dateParts.length; i++) {
        strPaddedDate += _pad(dateParts[i]);
        if (i<dateParts.length-1) {
            strPaddedDate += dateSeparator;
        }
    }
    return strPaddedDate;
}
function _getTimeString(aDate) {
    return _pad(aDate.getHours()) + ":" + _pad(aDate.getMinutes()) + ":" + _pad(aDate.getSeconds());
}
function _pad(aValue) {
    return (''+aValue).length < 2 ? String("00" + aValue).slice(-2) : aValue;
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
        return getFuzzyAge(data);
    }
    else {
        return data;
    }
}

/**
 * Get friendly/fuzzy formatted age (3 days) measured as the time between
 * aDate and the current date (aDate presumed before to be before the current date).
 *
 * @param  aDate {Date}
 *         the javascript date/time
 *
 * @return {String}
 *         the timeperiod between the current date and aDate, expressed in a
 *         single unit of time (seconds|minutes|hours|days|weeks|months|years)
 */
function getFuzzyAge(aDate) {
    let _getIndDay = function(n) {
        return " " + ((n===1) ? "day" : "days");
    };
    let _getIndHour = function(n) {
        return " " + ((n===1) ? "hour" : "hours");
    };
    let _getIndMinute = function(n) {
        return " " + ((n===1) ? "minute" : "minutes");
    };
    let _getIndSecond = function(n) {
        return " " + ((n===1) ? "second" : "seconds");
    };

    let d = new Date();
    let nowDate = d.getTime();

    let result;
    let space = "&nbsp;&nbsp;";
    let noOfSeconds = Math.round((nowDate - aDate) / 1000);
    let noOfDays = Math.round(noOfSeconds / (60 * 60 * 24));

    if (noOfDays > 0) {
        let noOfWeeks = Math.floor(noOfDays / 7);
        let noOfMonths = Math.floor(noOfDays / 30);
        if (noOfMonths > 24) {
            result = Math.round(noOfMonths / 12) + " " + "years";
        }
        else if (noOfMonths > 1) {
            result = noOfMonths + " " + "months";
            if (noOfMonths > 9) space = "";
        }
        else if (noOfWeeks > 2) {
            result = noOfWeeks + " " + "weeks";
        }
        else  {
            result = noOfDays + " " + _getIndDay(noOfDays);
            if (noOfDays > 9) space = "";
        }
    }
    else {
        let noOfHours = Math.round(noOfSeconds / (60*60));
        if (noOfHours > 0) {
            result = noOfHours + _getIndHour(noOfHours);
            if (noOfHours > 9) space = "";
        }
        else {
            if (noOfSeconds < 60) {
                result = noOfSeconds + _getIndSecond(noOfSeconds);
                if (noOfSeconds > 9) space = "";
            }
            else {
                let noOfMinutes = Math.round(noOfSeconds / 60);
                result = noOfMinutes + _getIndMinute(noOfMinutes);
                if (noOfMinutes > 9) space = "";
            }
        }
    }
    return space + result;
}
