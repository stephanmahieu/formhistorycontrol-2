/*
    JavaScript autoComplete v2.0.0

    Forked: 13 oct 2017
    GitHub: https://github.com/stephanmahieu/JavaScript-autoComplete

    This adaptation is specifically tailored for use by a Firefox/Chrome plugin.

    Original version:
    Copyright (c) 2014 Simon Steinberger / Pixabay
    GitHub : https://github.com/Pixabay/JavaScript-autoComplete
    License: http://www.opensource.org/licenses/mit-license.php
*/

class AutoComplete {

    constructor(customOptions) {
        const options = {
            selector: 0,
            source: 0,
            minChars: 3,
            delay: 150,
            offsetLeft: 0,
            offsetTop: 1,
            minWidth: 100,
            cache: 1,
            menuClass: '',
            renderItem: (item, search) => {
                // escape special characters
                search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");

                const div = document.createElement('div');
                div.classList.add('autocomplete-suggestion');
                div.setAttribute('data-val', item);

                if (search) {
                    search = search.toLowerCase();
                    item.split(re).forEach(term => {
                        if (term.toLowerCase() === search) {
                            let b = document.createElement('b');
                            b.appendChild(document.createTextNode(term));
                            div.appendChild(b);
                        } else if (term) {
                            div.appendChild(document.createTextNode(term));
                        }
                    });
                } else {
                    div.appendChild(document.createTextNode(item));
                }
                // '<div class="autocomplete-suggestion" data-val="' + item + '">' + item.replace(re, "<b>$1</b>") + '</div>';
                return div;
            },
            onSelect: (e, term, item) => {}
        };

        // add custom options to defaultOptions
        for (let k in customOptions) {
            if (customOptions.hasOwnProperty(k)) {
                options[k] = customOptions[k];
            }
        }

        // init
        this.elems = typeof options.selector === 'object' ? [options.selector] : document.querySelectorAll(options.selector);
        this.elems.forEach(elem => {
            // create suggestions container "sc"
            elem.sc = document.createElement('div');
            elem.sc.classList.add('autocomplete-suggestions');
            if (options.menuClass) {
                elem.sc.classList.add(options.menuClass);
            }

            elem.autocompleteAttr = elem.getAttribute('autocomplete');
            elem.setAttribute('autocomplete', 'off');
            elem.cache = {};
            elem.last_val = '';

            elem.updateSC = (resize, next) => {
                const rect = elem.getBoundingClientRect();
                elem.sc.style.left = Math.round(rect.left + (window.pageXOffset || document.documentElement.scrollLeft) + options.offsetLeft) + 'px';
                elem.sc.style.top = Math.round(rect.bottom + (window.pageYOffset || document.documentElement.scrollTop) + options.offsetTop) + 'px';
                elem.sc.style.width = Math.max(options.minWidth, Math.round(rect.right - rect.left)) + 'px'; // outerWidth (SJM: minimum width 100px)
                if (!resize) {
                    elem.sc.style.display = 'block';
                    if (!elem.sc.maxHeight) {
                        elem.sc.maxHeight = parseInt((window.getComputedStyle ? getComputedStyle(elem.sc, null) : elem.sc.currentStyle).maxHeight);
                    }
                    if (!elem.sc.suggestionHeight) {
                        elem.sc.suggestionHeight = elem.sc.querySelector('.autocomplete-suggestion').offsetHeight;
                    }
                    if (elem.sc.suggestionHeight) {
                        if (!next) {
                            elem.sc.scrollTop = 0;
                        } else {
                            const scrTop = elem.sc.scrollTop, selTop = next.getBoundingClientRect().top - elem.sc.getBoundingClientRect().top;
                            if (selTop + elem.sc.suggestionHeight - elem.sc.maxHeight > 0) {
                                elem.sc.scrollTop = selTop + elem.sc.suggestionHeight + scrTop - elem.sc.maxHeight;
                            }
                            else if (selTop < 0) {
                                elem.sc.scrollTop = selTop + scrTop;
                            }
                        }
                    }
                }
            };
            this._addEvent(window, 'resize', elem.updateSC);
            document.body.appendChild(elem.sc);

            this._live('autocomplete-suggestion', 'mouseleave', () => {
                const sel = elem.sc.querySelector('.autocomplete-suggestion.selected');
                if (sel) {
                    setTimeout(()=>{ sel.classList.remove('selected'); }, 20);
                }
            }, elem.sc);


            this._live('autocomplete-suggestion', 'mouseover', event => {
                const sel = elem.sc.querySelector('.autocomplete-suggestion.selected');
                if (sel) {
                    sel.classList.remove('selected');
                }
                // event.target might be the <b>...</b> part, in that case we need the parent
                const item = this._getSuggestionNode(event.target);
                item.classList.add('selected');
            }, elem.sc);

            this._live('autocomplete-suggestion', 'mousedown', event => {
                // event.target might be the <b>...</b> part, in that case we need the parent
                const item = this._getSuggestionNode(event.target);
                if (item.classList.contains('autocomplete-suggestion')) { // else outside click
                    const v = item.getAttribute('data-val');
                    elem.value = v;
                    options.onSelect(event, v, item);
                    elem.sc.style.display = 'none';
                }
            }, elem.sc);

            this._live('autocomplete-suggestion', 'touchstart', event => {
                // event.target might be the <b>...</b> part, in that case we need the parent
                const item = this._getSuggestionNode(event.target);
                if (item.classList.contains('autocomplete-suggestion')) { // else outside touch
                    const v = item.getAttribute('data-val');
                    elem.value = v;
                    options.onSelect(event, v, item);
                    elem.sc.style.display = 'none';
                }
            }, elem.sc);

            elem.blurHandler = () => {
                let over_sb;
                try {
                    over_sb = document.querySelector('.autocomplete-suggestions:hover');
                } catch(e) {
                    over_sb = 0;
                }
                if (!over_sb) {
                    elem.last_val = elem.value;
                    elem.sc.style.display = 'none';
                    setTimeout(()=>{ elem.sc.style.display = 'none'; }, 350); // hide suggestions on fast input
                } else if (elem !== document.activeElement) {
                    setTimeout(()=>{ elem.focus(); }, 20);
                }
            };
            this._addEvent(elem, 'blur', elem.blurHandler);

            const suggest = data => {
                const val = elem.value;
                elem.cache[val] = data;
                if (data.length && val.length >= options.minChars) {
                    while (elem.sc.firstChild) {
                        elem.sc.removeChild(elem.sc.firstChild);
                    }
                    data.forEach(item => {
                        elem.sc.appendChild(options.renderItem(item, val));
                    });
                    elem.updateSC(0);
                }
                else {
                    elem.sc.style.display = 'none';
                }
            };

            elem.keydownHandler = event => {
                const key = window.event ? event.keyCode : event.which;
                // down (40), up (38)
                if ((key === 40 || key === 38) && elem.sc.innerHTML) {
                    let next, sel = elem.sc.querySelector('.autocomplete-suggestion.selected');
                    if (!sel) {
                        next = (key === 40) ? elem.sc.querySelector('.autocomplete-suggestion') : elem.sc.childNodes[elem.sc.childNodes.length - 1]; // first : last
                        next.classList.add('selected');
                        elem.value = next.getAttribute('data-val');
                    } else {
                        next = (key === 40) ? sel.nextSibling : sel.previousSibling;
                        if (next) {
                            sel.classList.remove('selected');
                            next.classList.add('selected');
                            elem.value = next.getAttribute('data-val');
                        }
                        else {
                            sel.classList.remove('selected');
                            elem.value = elem.last_val; next = 0;
                        }
                    }
                    elem.updateSC(0, next);
                    return false;
                }
                // down arrow with purpose to display suggestions
                else if (key === 40 && !elem.sc.innerHTML) {
                    console.log('Please display SC choices');
                    options.source(elem.value, elem, suggest);
                }
                // esc
                else if (key === 27) {
                    elem.value = elem.last_val;
                    elem.sc.style.display = 'none';
                }
                // enter or tab
                else if (key === 13 || key === 9) {
                    const sel = elem.sc.querySelector('.autocomplete-suggestion.selected');
                    if (sel && elem.sc.style.display !== 'none') {
                        options.onSelect(event, sel.getAttribute('data-val'), sel);
                        setTimeout(()=>{ elem.sc.style.display = 'none'; }, 20);
                        // prevent submit when selecting a value
                        event.preventDefault();
                    }
                }
            };
            this._addEvent(elem, 'keydown', elem.keydownHandler);

            elem.keyupHandler = event => {
                const key = window.event ? event.keyCode : event.which;
                if (!key || (key < 35 || key > 40) && key !== 13 && key !== 27 && key !== 16) {
                    const val = elem.value;
                    if (val.length >= options.minChars) {
                        if (key === 9 && !elem.sc.innerHTML) {
                            // tabbing into a field should not immediately display suggestions
                            elem.last_val = val;
                            return;
                        }
                        if (val !== elem.last_val) {
                            elem.last_val = val;
                            clearTimeout(elem.timer);
                            if (options.cache) {
                                if (val in elem.cache) {
                                    suggest(elem.cache[val]);
                                    return;
                                }
                                // no requests if previous suggestions were empty
                                for (let i=1; i<val.length-options.minChars; i++) {
                                    let part = val.slice(0, val.length-i);
                                    if (part in elem.cache && !elem.cache[part].length) {
                                        suggest([]);
                                        return;
                                    }
                                }
                            }
                            elem.timer = setTimeout(()=>{ options.source(val, elem, suggest) }, options.delay);
                        }
                    } else {
                        elem.last_val = val;
                        elem.sc.style.display = 'none';
                    }
                }
            };
            this._addEvent(elem, 'keyup', elem.keyupHandler);

            elem.focusHandler = event => {
                elem.last_val = '\n';
                elem.keyupHandler(event)
            };
            if (!options.minChars) {
                this._addEvent(elem, 'focus', elem.focusHandler);
            }

            elem.mouseDownHandler = event => {
                // toggle, only display choices every other click
                if (elem.sc) {
                    if (!elem.sc.style.display || elem.sc.style.display === 'none') {
                        elem.last_val = '\n';
                        elem.keyupHandler(event)
                    } else {
                        elem.sc.style.display = 'none';
                    }
                }
            };
            this._addEvent(elem, 'mousedown', elem.mouseDownHandler);
        });
    }

    // public destroy method
    destroy() {
        this.elems.forEach(elem => {
            this._removeEvent(window, 'resize', elem.updateSC);
            this._removeEvent(elem, 'blur', elem.blurHandler);
            this._removeEvent(elem, 'focus', elem.focusHandler);
            this._removeEvent(elem, 'keydown', elem.keydownHandler);
            this._removeEvent(elem, 'keyup', elem.keyupHandler);
            this._removeEvent(elem, 'mousedown', elem.mouseDownHandler);
            if (elem.autocompleteAttr) {
                elem.setAttribute('autocomplete', elem.autocompleteAttr);
            }
            else {
                elem.removeAttribute('autocomplete');
            }
            document.body.removeChild(elem.sc);
            elem = null;
        });
    }


    // helpers
    _addEvent(el, type, handler) {
        el.addEventListener(type, handler);
    }
    _removeEvent(el, type, handler) {
        el.removeEventListener(type, handler);
    }
    _live(elClass, eventType, cb, context){
        this._addEvent(context || document, eventType, event => {
            let found, el = event.target || event.srcElement;
            while (el && !(found = el.classList.contains(elClass))) {
                el = el.parentElement;
            }
            if (found) {
                cb.call(el, event);
            }
        });
    }
    _getSuggestionNode(element) {
        while (element && !element.classList.contains('autocomplete-suggestion')) {
            element = element.parentNode;
        }
        return element;
    }
}
