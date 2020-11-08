/*
 * Copyright (c) 2020. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

//import {DateUtil} from 'DateUtil.js';

class JsonUtil {

    /**
     * Deserialize a JSON string containing formhistory data.
     *
     * @param  jsonString {String}
     *         the string source of the XML
     *
     * @return {Object}
     *         an object with arrays holding formhistory entries
     */
    static parseJSONdata(jsonString) {
        let parsedEntries = [];
        let parsedEditorfield = [];

        const jsonData = JSON.parse(jsonString);

        if (jsonData.fields && jsonData.fields.length) {
            for (let i=0; i<jsonData.fields.length; i++) {
                const entry = jsonData.fields[i];
                parsedEntries.push({
                    id:        -1,
                    name:      entry.name,
                    value:     entry.value,
                    used:      entry.timesUsed,
                    first:     DateUtil.fromISOdateString(entry.firstUsed),
                    last:      DateUtil.fromISOdateString(entry.lastUsed),
                    type:      entry.type,
                    host:      entry.host,
                    url:       entry.url,
                    pagetitle: entry.pagetitle
                });
            }
        }
        if (jsonData.editorFields && jsonData.editorFields.length > 0) {
            for (let i=0; i<jsonData.editorFields.length; i++) {
                const entry = jsonData.editorFields[i];
                parsedEditorfield.push({
                    id:         entry.id,
                    name:       entry.name,
                    content:    entry.content,
                    used:       entry.timesUsed,
                    firstsaved: DateUtil.fromISOdateString(entry.firstsaved),
                    lastsaved:  DateUtil.fromISOdateString(entry.lastsaved),
                    formid:     entry.formid,
                    type:       entry.type,
                    host:       entry.host,
                    url:        entry.url,
                    pagetitle:  entry.pagetitle
                });
            }
        }

        return {
            entries:   parsedEntries,
            multiline: parsedEditorfield
        };
    }


    /**
     * Serialize data (formhistory) into a JSON string representation.
     *
     * @param  entries {Array}
     *         array containing text entries
     *
     * @param  multilines {Array}
     *         array containing multiline entries
     *
     * @return {String}
     *         a JSON string representation of the entries
     */
    static serializeToJson(textEntries, multilines) {
        const manifest = browser.runtime.getManifest();

        const fhc_json = {}
        fhc_json.header = {
            "application": manifest.name,
            "version": manifest.version,
            "exportDate": DateUtil.getCurrentISOdateString()
        }
        fhc_json.fields = [];
        fhc_json.editorFields = [];
        textEntries.forEach(entry => {
            fhc_json.fields.push({
                "name":      entry.name,
                "value":     entry.value,
                "timesUsed": entry.used,
                "firstUsed": DateUtil.toISOdateString(entry.first),
                "lastUsed":  DateUtil.toISOdateString(entry.last),
                "type":      entry.type,
                "host":      entry.host,
                "url":       entry.url,
                "pagetitle": entry.pagetitle
            });
        });
        multilines.forEach(editorField => {
            fhc_json.editorFields.push({
                "id":         editorField.id,
                "name":       editorField.name,
                "content":    editorField.content,
                "timesUsed":  editorField.used,
                "firstsaved": DateUtil.toISOdateString(editorField.first),
                "lastsaved":  DateUtil.toISOdateString(editorField.last),
                "formid":     editorField.formid,
                "type":       editorField.type,
                "host":       editorField.host,
                "url":        editorField.url,
                "pagetitle":  editorField.pagetitle
            });
        });
        return JSON.stringify(fhc_json);
    }
}