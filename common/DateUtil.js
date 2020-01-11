/*
 * Copyright (c) 2018. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

const LBL_I18N_SECOND  = browser.i18n.getMessage("dateSecond");
const LBL_I18N_SECONDS = browser.i18n.getMessage("dateSeconds");
const LBL_I18N_MINUTE  = browser.i18n.getMessage("dateMinute");
const LBL_I18N_MINUTES = browser.i18n.getMessage("dateMinutes");
const LBL_I18N_HOUR    = browser.i18n.getMessage("dateHour");
const LBL_I18N_HOURS   = browser.i18n.getMessage("dateHours");
const LBL_I18N_DAY     = browser.i18n.getMessage("dateDay");
const LBL_I18N_DAYS    = browser.i18n.getMessage("dateDays");
const LBL_I18N_WEEK    = browser.i18n.getMessage("dateWeek");
const LBL_I18N_WEEKS   = browser.i18n.getMessage("dateWeeks");
const LBL_I18N_MONTH   = browser.i18n.getMessage("dateMonth");
const LBL_I18N_MONTHS  = browser.i18n.getMessage("dateMonths");
const LB_I18NL_YEAR    = browser.i18n.getMessage("dateYear");
const LBL_I18N_YEARS   = browser.i18n.getMessage("dateYears");
const WEEKDAYS_SHORT = [];
const WEEKDAYS_LONG = [];

class DateUtil {

    /**
     * Get the current system date/time in milliseconds.
     *
     * @return {number}
     *         the current system date/time in milliseconds
     */
    static getCurrentDate() {
        let d = new Date();
        return d.getTime();
    }

    /**
     * Get current date/time as ISO formatted string.
     *
     * @return {String}
     *         the date/time ISO formatted.
     */
    static getCurrentISOdateString() {
        return this.toISOdateString(this.getCurrentDate());
    }

    /**
     * Convert date in milliseconds to string according to current locale, parts
     * are left padded with 0 in order to align nicely when used in columns and
     * fractional seconds are excluded.
     *
     * @param   milliseconds {Number}
     *          the date/time in milliseconds (internal javascript representation)
     *
     * @returns {String}
     *          date+time according to current locale (ie 15-07-2009 12:01:59)
     */
    static toDateString(milliseconds) {
        if (!milliseconds) return "";
        let d = new Date(milliseconds);
        return this.dateToDateString(d);
    }

    /**
     * Convert date in milliseconds to string according to current locale, parts
     * are left padded with 0 in order to align nicely when used in columns and
     * seconds and century is excluded.
     *
     * @param   milliseconds {Number}
     *          the date/time in milliseconds (internal javascript representation)
     *
     * @returns {String}
     *          date+time according to current locale (ie 15-07-17 12:01)
     */
    static toDateStringShorter(milliseconds) {
        if (!milliseconds) return "";
        let d = new Date(milliseconds);
        return this.dateToDateStringShorter(d);
    }

    /**
     * Convert date to string according to current locale, parts
     * are left padded with 0 in order to align nicely when used in columns and
     * fractional seconds are excluded.
     *
     * @param  aDate {Date}
     *         the date/time
     *
     * @param dateformat (String)
     *        the dateformat (see _getCustomDateTimeString)
     *
     * @return {String}
     *         date+time according to current locale (ie 15-07-2009 12:01:59)
     */
    static dateToDateString(aDate, dateformat) {
        if (dateformat && dateformat !== 'automatic') {
            return this._getCustomDateTimeString(aDate, dateformat);
        }
        return this._getShortDateString(aDate) + " " + this._getTimeStringShort(aDate);
    }

    /**
     * Convert date to string according to current locale, parts
     * are left padded with 0 in order to align nicely when used in columns and
     * century, seconds and fractional seconds are excluded.
     *
     * @param  aDate {Date}
     *         the date/time
     *
     * @return {String}
     *         date+time according to current locale (ie 15-07-17 12:01)
     */
    static dateToDateStringShorter(aDate) {
        return this._getShortDateStringShorter(aDate) + " " + this._getTimeStringShorter(aDate);
    }

    /**
     * Convert ISO date/time back to milliseconds.
     *
     * @param  aDateString {String}
     *         the date/time in ISO format (2009-10-19T13:08:34.000)
     *
     * @return {Number}
     *         date in milliseconds (internal representation)
     */
    static fromISOdateString(aDateString) {
        let d = new Date(
            parseInt(aDateString.substr(0, 4), 10),   // year
            parseInt(aDateString.substr(5, 2), 10)-1, // month (zero based!)
            parseInt(aDateString.substr(8, 2), 10),   // day
            parseInt(aDateString.substr(11,2), 10),   // hour
            parseInt(aDateString.substr(14,2), 10),   // minute
            parseInt(aDateString.substr(17,2), 10),   // seconds
            parseInt(aDateString.substr(20,3), 10)    // msec
        );
        return d.getTime(); // msec
    }

    /**
     * Convert a date/time in milliseconds to a date string according to
     * the w3 recommendation (http://www.w3.org/TR/xmlschema-2/#dateTime).
     * (closely related to dates and times described in ISO 8601)
     *
     * Format:
     * '-'? yyyy '-' mm '-' dd 'T' hh ':' mm ':' ss ('.' s+)? (zzzzzz)?
     *
     * Example: 2009-10-19T13:08:34.000
     *
     * @param  milliseconds {Number}
     *         the date/time in milliseconds (internal javascript representation)
     *
     * @return {String}
     *         date formatted according to widely accepted xmlschema standard.
     */
    static toISOdateString(milliseconds) {
        if (!milliseconds) return "";
        let d = new Date(milliseconds);
        return this._padZero(d.getFullYear(), 4) + "-" +
            this._padZero(d.getMonth()+1, 2) + "-" +
            this._padZero(d.getDate(), 2) + "T" +
            this._getTimeString(d);
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
    static getFuzzyAge(aDate) {
        let _getIndDay = function(n) {
            return " " + ((n===1) ? LBL_I18N_DAY : LBL_I18N_DAYS);
        };
        let _getIndHour = function(n) {
            return " " + ((n===1) ? LBL_I18N_HOUR : LBL_I18N_HOURS);
        };
        let _getIndMinute = function(n) {
            return " " + ((n===1) ? LBL_I18N_MINUTE : LBL_I18N_MINUTES);
        };
        let _getIndSecond = function(n) {
            return " " + ((n===1) ? LBL_I18N_SECOND : LBL_I18N_SECONDS);
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
                result = Math.round(noOfMonths / 12) + " " + LBL_I18N_YEARS;
            }
            else if (noOfMonths > 1) {
                result = noOfMonths + " " + LBL_I18N_MONTHS;
                if (noOfMonths > 9) space = "";
            }
            else if (noOfWeeks > 2) {
                result = noOfWeeks + " " + LBL_I18N_WEEKS;
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




    //----------------------------------------------------------------------------
    // Helper methods
    //----------------------------------------------------------------------------

    /**
     * Get short date formatted as string.
     *
     * @param  aDate {Date}
     *         the date to convert
     *
     * @return {String}
     *         date converted to string (15-01-2009)
     */
    static _getShortDateString(aDate) {
        let strLocaleDate = aDate.toLocaleDateString();
        let dateSeparator = strLocaleDate.replace(/[0-9]/g,'').charAt(0);
        let dateParts = strLocaleDate.split(dateSeparator);
        let strPaddedDate = '';
        for(let i=0; i<dateParts.length; i++) {
            strPaddedDate += this._padZero(dateParts[i], 2);
            if (i<dateParts.length-1) {
                strPaddedDate += dateSeparator;
            }
        }
        return strPaddedDate;
    }

    /**
     * Get short date formatted as string without century (20-12-17 or 12/20/17).
     *
     * @param  aDate {Date}
     *         the date to convert
     *
     * @return {String}
     *         date converted to string (15-01-17)
     */
    static _getShortDateStringShorter(aDate) {
        let strLocaleDate = aDate.toLocaleDateString();
        let dateSeparator = strLocaleDate.replace(/[0-9]/g,'').charAt(0);
        let dateParts = strLocaleDate.split(dateSeparator);
        let strPaddedDate = '';
        for(let i=0; i<dateParts.length; i++) {
            if (dateParts[i].length === 4) {
                strPaddedDate += dateParts[i].substring(2,4);
            } else {
                strPaddedDate += this._padZero(dateParts[i], 2);
            }
            if (i<dateParts.length-1) {
                strPaddedDate += dateSeparator;
            }
        }
        return strPaddedDate;
    }

    /**
     * Get time formatted as string in 24hr format without milliseconds.
     *
     * @param  aDate {Date}
     *         the date to convert
     *
     * @return {String}
     *         date converted to time string (13:05:59)
     */
    static _getTimeStringShort(aDate) {
        return this._getTimeStringShorter(aDate) + ":"
             + this._padZero(aDate.getSeconds(), 2);
    }

    /**
     * Get time formatted as string in 24hr format without seconds.
     *
     * @param  aDate {Date}
     *         the date to convert
     *
     * @return {String}
     *         date converted to time string (13:05)
     */
    static _getTimeStringShorter(aDate) {
        return this._padZero(aDate.getHours(), 2) + ":"
            + this._padZero(aDate.getMinutes(), 2);
    }

    /**
     * Get time formatted as string in 24hr format including milliseconds.
     *
     * @param  aDate {Date}
     *         the date to convert
     *
     * @return {String}
     *         date converted to time string (13:05:59)
     */
    static _getTimeString(aDate) {
        return this._padZero(aDate.getHours(), 2) + ":"
             + this._padZero(aDate.getMinutes(), 2) + ":"
             + this._padZero(aDate.getSeconds(), 2) + "."
             + this._padZero(aDate.getMilliseconds(), 3);
    }


    /**
     * Left pad a value with "0" upto the given maxLength. If aValue >= maxLength
     * then aValue is returned unchanged.
     *
     * @param  aValue {Number|String}
     *         the value to pad
     *
     * @param  maxLength {Number}
     *         left pad upto the maxLength
     *
     * @return {String}
     *         aValue leftpadded with "0"
     */
    static _padZero(aValue, maxLength) {
        let result = "" + aValue;
        while (result.length < maxLength) {
            result = "0" + result;
        }
        return result;
    }

    /**
     * Get date + time formatted as string according to a custom DateFormat.
     *
     * yy, yyyy Year                 (96; 1996)
     * M, MM    Month in year        (7; 07; Jul; July)
     * d, dd    Day in month         {1; 01; Sun; Sunday)
     * H, HH    Hour in day (0-23)   (6; 06)
     * h, hh    Hour in am/pm (1-12) (9; 08)
     * a, A     am/pm marker         (am; AM)
     * m, mm    Minute in hour       (3; 03)
     * s, ss    Second in minute     (5; 05)
     * SSS      Millisecond          (978)
     */
    static _getCustomDateTimeString(aDate, customDateFormat)  {
        return customDateFormat.replace(/(yyyy|yy|MMMM|MMM|MM|M|dddd|ddd|dd|d|HH|H|hh|h|mm|m|ss|s|SSS|a|A)/g,
            function($1) {
                let h;
                switch ($1) {
                    case 'yyyy':return aDate.getFullYear();
                    case 'yy':return DateUtil._padZero(aDate.getFullYear() % 100, 2);
                    case 'MM':return DateUtil._padZero(aDate.getMonth()+1, 2);
                    case 'M':return aDate.getMonth()+1;
                    case 'dddd':return WEEKDAYS_LONG[aDate.getDay()];
                    case 'ddd':return WEEKDAYS_SHORT[aDate.getDay()];
                    case 'dd':return DateUtil._padZero(aDate.getDate(), 2);
                    case 'd':return aDate.getDate();
                    case 'H':return aDate.getHours();
                    case 'HH':return DateUtil._padZero(aDate.getHours(), 2);
                    case 'h':return ((h = aDate.getHours() % 12) ? h : 12);
                    case 'hh':return DateUtil._padZero(((h = aDate.getHours() % 12) ? h : 12), 2);
                    case 'm':return aDate.getMinutes();
                    case 'mm':return DateUtil._padZero(aDate.getMinutes(), 2);
                    case 's':return aDate.getSeconds();
                    case 'ss':return DateUtil._padZero(aDate.getSeconds(), 2);
                    case 'SSS':return DateUtil._padZero(aDate.getMilliseconds(), 3);
                    case 'a':return aDate.getHours() < 12 ? 'am' : 'pm';
                    case 'A':return aDate.getHours() < 12 ? 'AM' : 'PM';
                }
                return "";
            }
        );
    }
}

// init weekdays for OS locale
function _initWeekDays() {
    const forLocale = browser.i18n.getUILanguage();
    let baseDate = new Date(Date.UTC(2017, 0, 1)); // just a Sunday
    for(let i = 0; i < 7; i++) {
        WEEKDAYS_SHORT.push(baseDate.toLocaleDateString(forLocale, { weekday: 'short' }));
        WEEKDAYS_LONG.push(baseDate.toLocaleDateString(forLocale, { weekday: 'long' }));
        baseDate.setDate(baseDate.getDate() + 1);
    }
}
_initWeekDays();