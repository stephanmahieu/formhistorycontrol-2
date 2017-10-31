//import {DateUtil} from 'DateUtil.js';

class XmlUtil {

    /**
     * Deserialize an XML string containing formhistory data.
     *
     * @param  xmlString {String}
     *         the string source of the XML
     *
     * @return {Object}
     *         an object with arrays holding formhistory entries
     */
    static parseXMLdata(xmlString) {
        let parsedEntries = [];
        let parsedEditorfield = [];

        let now = DateUtil.getCurrentDate();

        let parser = new DOMParser();
        try {
            let doc = parser.parseFromString(xmlString, "text/xml");

            if ("formhistory" === doc.documentElement.nodeName) {

                // formhistory fields
                let fldElem = doc.getElementsByTagName("field");
                let nameElem, valElem;
                for(let ii=0; ii<fldElem.length; ii++) {
                    if (fldElem[ii].hasChildNodes()) {
                        nameElem = fldElem[ii].getElementsByTagName("name");
                        valElem = fldElem[ii].getElementsByTagName("value");

                        if (1 === valElem.length && 0 < valElem[0].textContent.length) {
                            parsedEntries.push({
                                id:        -1,
                                name:      decodeURIComponent(nameElem[0].textContent),
                                value:     decodeURIComponent(valElem[0].textContent),
                                used:      decodeURIComponent(this._getElementValue(fldElem[ii], "timesUsed", 0)),
                                first:                        this._getElemenDate(  fldElem[ii], "firstUsed", now),
                                last:                         this._getElemenDate(  fldElem[ii], "lastUsed",  now),
                                /* new since 2.0.0. */
                                type:      decodeURIComponent(this._getElementValue(fldElem[ii], "type", "")),
                                host:      decodeURIComponent(this._getElementValue(fldElem[ii], "host", "")),
                                url:       decodeURIComponent(this._getElementValue(fldElem[ii], "url", "")),
                                pagetitle: decodeURIComponent(this._getElementValue(fldElem[ii], "pagetitle", ""))
                            });
                        }
                    }
                }

                // multiline editor fields
                let editorfieldElem = doc.getElementsByTagName("editorField");
                let edFldElem;
                for(let nn=0; nn<editorfieldElem.length; nn++) {
                    if (editorfieldElem[nn].hasChildNodes()) {
                        edFldElem = editorfieldElem[nn];
                        parsedEditorfield.push({
                            id:         decodeURIComponent(this._getElementValue(edFldElem, "id", "")),
                            name:       decodeURIComponent(this._getElementValue(edFldElem, "name", "")),
                            type:       decodeURIComponent(this._getElementValue(edFldElem, "type", "")),
                            formid:     decodeURIComponent(this._getElementValue(edFldElem, "formid", "")),
                            content:    decodeURIComponent(this._getElementValue(edFldElem, "content", "")),
                            host:       decodeURIComponent(this._getElementValue(edFldElem, "host", "")),
                            url:        decodeURIComponent(this._getElementValue(edFldElem, "url", "")),
                            firstsaved:                    this._getElemenDate(edFldElem, "firstsaved", ""),
                            lastsaved:                     this._getElemenDate(edFldElem, "lastsaved", ""),
                            /* new since 2.0.0. */
                            used:                          this._getElementValue(edFldElem, "timesUsed", 1),
                            pagetitle:  decodeURIComponent(this._getElementValue(edFldElem, "pagetitle", ""))
                        });
                    }
                }
            }
        } catch(ex) {
            alert("XML parser exception: " + ex);
        }

        return {
            entries:   parsedEntries,
            multiline: parsedEditorfield
        };
    }

    /**
     * Serialize data (formhistory, config, etc) into a XML string representation.
     *
     * @param  entries {Array}
     *         array containing text entries
     *
     * @param  multilines {Array}
     *         array containing multiline entries
     *
     * @return {String}
     *         a pretty printed XML string representation of the entries
     */
    static serializeToXMLString(entries, multilines) {
        // create a DOM tree
        let doc = document.implementation.createDocument("", "", null);
        let rootElem = doc.createElement("formhistory");
        doc.appendChild(rootElem);

        // create a header
        this._appendHeaderElement(doc, rootElem);

        // add formhistory fields
        if (entries && 0 < entries.length) {
            let fieldsElem = doc.createElement("fields");
            rootElem.appendChild(fieldsElem);

            let fieldElem;
            for(let ii=0; ii<entries.length; ii++) {
                fieldElem = this._createFormhistoryElement(doc, entries[ii]);
                fieldsElem.appendChild(fieldElem);
            }
        }

        // add multiline editorfields
        if (multilines && 0 < multilines.length) {
            let editorfieldsElem = doc.createElement("editorFields");
            rootElem.appendChild(editorfieldsElem);

            let editorfieldElem;
            for(let nn=0; nn<multilines.length; nn++) {
                editorfieldElem = this._createEditorfieldElement(doc, multilines[nn]);
                editorfieldsElem.appendChild(editorfieldElem);
            }
        }

        // serialize to string (pretty printed)
        let serializer = new XMLSerializer();

        //return serializer.serializeToString(doc);
        return(this._prettyPrintXML(serializer.serializeToString(doc), "\t"));
    }

    //----------------------------------------------------------------------------
    // Helper methods
    //----------------------------------------------------------------------------
    
    /**
     * Get the textcontent of a DOM Element from a parent by tagname. If no tag
     * is found, the default value is returned.
     *
     * @param  parentElem {Element}
     *         the DOM element containing the child element(s)
     *
     * @param  tagName {String}
     *         the name of the tag to search for inside the parent
     *
     * @param  defaultValue
     *         the value to return if no tag is found
     *
     * @return {String}
     *         the textcontent of the requested child element or the default
     *         value if tag is not found
     */
    static _getElementValue(parentElem, tagName, defaultValue) {
        let result = defaultValue;
        let childElem = parentElem.getElementsByTagName(tagName);
        if (1 === childElem.length && "" !== childElem[0].textContent) {
            result = childElem[0].textContent;
        }
        return result;
    }

    /**
     * Get the date content of a DOM Element from a parent by tagname. If no tag
     * is found, the default value is returned.
     *
     * @param  parentElem {Element}
     *         the DOM element containing the child element(s)
     *
     * @param  tagName {String}
     *         the name of the tag to search for inside the parent
     *
     * @param  defaultValue
     *         the value to return if no tag is found
     *
     * @return {Number}
     *         the date value in milliseconds of the requested child element or
     *         the default value if tag is not found
     */
    static _getElemenDate (parentElem, tagName, defaultValue) {
        let result = defaultValue;
        let childElem = parentElem.getElementsByTagName(tagName);
        if (1 === childElem.length) {
            if (childElem[0].firstElementChild !== null) {
                // found an old microseconds format, convert it to milliseconds
                result = this._microToMillis(this._getElementValue(childElem[0], "date", ""));
            }
            else {
                result = DateUtil.fromISOdateString(childElem[0].textContent);
            }
        }
        return result;
    }

    /**
     *  Convert microseconds to milliseconds.
     */
    static _microToMillis(uSeconds) {
        if (isNaN(uSeconds)) {
            return uSeconds;
        }
        return Math.round(uSeconds/1000);
    }

    /**
     * Encode special characters for use inside an XML document.
     *
     * @param  aString {String}
     *         string which may contain characters which are not allowed inside
     *         a XML document.
     *
     * @return {String}
     *         a string in which all invalid (international) characters are
     *         encoded so they can be safely used inside XML
     */
    static _encode(aString) {
        // use encodeURIComponent() which can handle all international chars but
        // keep it somewhat readable by converting back some safe (for XML) chars
        return encodeURIComponent(aString)
            .replace(/%20/g, " ")
            .replace(/^ /g, "%20") /* keep leading space  */
            .replace(/ $/g, "%20") /* keep trailing space */
            .replace(/%21/g, "!")
            .replace(/%22/g, '"')
            .replace(/%23/g, "#")
            .replace(/%24/g, "$")
            /* do not replace %25 (%) */
            .replace(/%26/g, "&")
            .replace(/%2B/g, "+")
            .replace(/%2C/g, ",")
            .replace(/%2F/g, "/")
            .replace(/%3A/g, ":")
            .replace(/%3B/g, ";")
            .replace(/%3D/g, "=")
            .replace(/%3F/g, "?")
            .replace(/%40/g, "@")
            .replace(/%5B/g, "[")
            .replace(/%5C/g, "\\")
            .replace(/%5D/g, "]")
            .replace(/%5E/g, "^")
            .replace(/%60/g, "`")
            .replace(/%7B/g, "{")
            .replace(/%7C/g, "|")
            .replace(/%7D/g, "}")
            .replace(/%7E/g, "~");
    }

    /**
     *  Create a DOM element for a date in native format (milliseconds) and append
     *  it to the parentElemen. Also add a comment inside the date tag containing
     *  the date in human readable form.
     *
     *  @param  parentElem {Element}
     *          the DOM element in which to add the data child element
     *
     *  @param  dateElem {Element}
     *          the DOM element representing the child date element
     *
     *  @param  milliseconds {Number}
     *          the date in milliseconds, the content of this element
     */
    static _appendDateElement(parentElem, dateElem, milliseconds) {
        if (milliseconds !== undefined) {
            // ISO date format
            dateElem.textContent = DateUtil.toISOdateString(milliseconds);
            parentElem.appendChild(dateElem);
        }
    }

    /**
     *  Create a DOM element holding a string value and append it to the
     *  parentElem.
     *
     *  @param  parentElem {Element}
     *          the DOM element in which to add the data child element
     *
     *  @param  childElem {Element}
       *          the DOM element representing the child element
       *
     *  @param  aValue {String}
     *          the text value
     */
    static _appendElement(parentElem, childElem, aValue) {
        childElem.textContent = aValue;
        parentElem.appendChild(childElem);
    }

    /**
     *  Create a Header element inside the given parent containing application and
     *  version info elements.
     *
     *  @param doc {Document}
     *         the document object
     *
     *  @param parentElem {Element}
     *         the DOM element in which to add the new child elements
     */
    static _appendHeaderElement(doc, parentElem) {
        let manifest = browser.runtime.getManifest();

        let headerElem = doc.createElement("header");
        parentElem.appendChild(headerElem);

        let appinfoElem = doc.createElement("application");
        appinfoElem.textContent = manifest.name;
        let versionElem = doc.createElement("version");
        versionElem.textContent = manifest.version;
        let dateElem = doc.createElement("exportDate");
        dateElem.textContent = DateUtil.getCurrentISOdateString();

        headerElem.appendChild(appinfoElem);
        headerElem.appendChild(versionElem);
        headerElem.appendChild(dateElem);
    }

    /**
     * Create a formfield element.
     * (cdata for value would be nice but is removed by XML.toXMLString())
     *
     * @param doc {Document}
     *        the document containing DOM-elements
     *
     * @param entry {Object}
     *        the formhistory object
     *
     * @return {Element}
     *         the formhistory element
     */
    static _createFormhistoryElement(doc, entry) {
        let fieldElem = doc.createElement("field");

        this._appendElement(fieldElem, doc.createElement("name"), entry.name);
        this._appendElement(fieldElem, doc.createElement("value"), this._encode(entry.value));
        this._appendElement(fieldElem, doc.createElement("timesUsed"), entry.used);
        this._appendDateElement(fieldElem, doc.createElement("firstUsed"), entry.first);
        this._appendDateElement(fieldElem, doc.createElement("lastUsed"),  entry.last);
        /* Extra since 2.0.0 */
        this._appendElement(fieldElem, doc.createElement("type"), entry.type);
        this._appendElement(fieldElem, doc.createElement("host"), entry.host);
        this._appendElement(fieldElem, doc.createElement("url"), entry.url);
        this._appendElement(fieldElem, doc.createElement("pagetitle"), entry.pagetitle);

        return fieldElem;
    }

    /**
     * Create an editorfield element for a multiline field.
     *
     * @param doc {Document}
     *        the document containing DOM-elements
     *
     * @param editorField {Object}
     *        the multiline object
     *
     * @return {Element}
     *         the editorField element
     */
    static _createEditorfieldElement(doc, editorField) {
        let editorElem = doc.createElement("editorField");

        this._appendElement(    editorElem, doc.createElement("id"), this._encode(editorField.id));
        this._appendElement(    editorElem, doc.createElement("name"), this._encode(editorField.name));
        this._appendElement(    editorElem, doc.createElement("type"), this._encode(editorField.type));
        this._appendElement(    editorElem, doc.createElement("formid"), this._encode(editorField.formid));
        this._appendElement(    editorElem, doc.createElement("host"), this._encode(editorField.host));
        this._appendElement(    editorElem, doc.createElement("url"), this._encode(editorField.url));
        this._appendDateElement(editorElem, doc.createElement("firstsaved"), editorField.first);
        this._appendDateElement(editorElem, doc.createElement("lastsaved"), editorField.last);
        this._appendElement(    editorElem, doc.createElement("content"), this._encode(editorField.content));
        /* Extra since 2.0.0 */
        this._appendElement(    editorElem, doc.createElement("timesUsed"), editorField.used);
        this._appendElement(    editorElem, doc.createElement("pagetitle"), editorField.pagetitle);

        return editorElem;
    }

    /**
     * Pretty print XML.
     * Adapted from vkBeautify by Vadim Kiryukhin (http://www.eslinstructor.net/vkbeautify/).
     *
     * @param text {String}
     *        the XML text
     *
     * @param indent {String}
     *        the text to use for indentation
     *
     * @return {String}
     *         pretty printed XML
     */
    static _prettyPrintXML(text, indent) {
        let shift = ['\n'];
        let maxNestingLevel = 6;
        for (let i=0; i<maxNestingLevel; i++) {
            shift.push(shift[i]+indent);
        }

        let ar = text.replace(/>\s*</g,"><")
                .replace(/</g,"~::~<")
                .replace(/\s*xmlns:/g,"~::~xmlns:")
                .replace(/\s*xmlns=/g,"~::~xmlns=")
                .split('~::~'),
            len = ar.length,
            inComment = false,
            deep = 0,
            str = '';

        for(let i=0;i<len;i++) {
            // start comment or <![CDATA[...]]> or <!DOCTYPE //
            if(ar[i].search(/<!/) > -1) {
                str += shift[deep]+ar[i];
                inComment = true;
                // end comment  or <![CDATA[...]]> //
                if(ar[i].search(/-->/) > -1 || ar[i].search(/]>/) > -1 || ar[i].search(/!DOCTYPE/) > -1 ) {
                    inComment = false;
                }
            } else
            // end comment  or <![CDATA[...]]> //
            if(ar[i].search(/-->/) > -1 || ar[i].search(/]>/) > -1) {
                str += ar[i];
                inComment = false;
            } else
            // <elm></elm> //
            if( /^<\w/.exec(ar[i-1]) && /^<\/\w/.exec(ar[i]) &&
                /^<[\w:\-.,]+/.exec(ar[i-1]) == /^<\/[\w:\-.,]+/.exec(ar[i])[0].replace('/','')) {
                str += ar[i];
                if(!inComment) deep--;
            } else
            // <elm> //
            if(ar[i].search(/<\w/) > -1 && ar[i].search(/<\//) === -1 && ar[i].search(/\/>/) === -1 ) {
                str = !inComment ? str += shift[deep++]+ar[i] : str += ar[i];
            } else
            // <elm>...</elm> //
            if(ar[i].search(/<\w/) > -1 && ar[i].search(/<\//) > -1) {
                str = !inComment ? str += shift[deep]+ar[i] : str += ar[i];
            } else
            // </elm> //
            if(ar[i].search(/<\//) > -1) {
                str = !inComment ? str += shift[--deep]+ar[i] : str += ar[i];
            } else
            // <elm/> //
            if(ar[i].search(/\/>/) > -1 ) {
                str = !inComment ? str += shift[deep]+ar[i] : str += ar[i];
            } else
            // <? xml ... ?> //
            if(ar[i].search(/<\?/) > -1) {
                str += shift[deep]+ar[i];
            } else
            // xmlns //
            if( ar[i].search(/xmlns:/) > -1 || ar[i].search(/xmlns=/) > -1) {
                str += shift[deep]+ar[i];
            }
            else {
                str += ar[i];
            }
        }
        return  (str[0] === '\n') ? str.slice(1) : str;
    }
}
