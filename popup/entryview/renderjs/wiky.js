/**
 * Wiky.js - Javascript library to converts Wiki MarkUp language to HTML.
 * You can do whatever with it. Please give me some credits (Apache License)
 * - Tanin Na Nakorn
 */

let wiky = {
    options: {
        'link-image': true //Preserve backward compat
    }
};


wiky.process = function (wikitext, options) {
    wiky.options = options || wiky.options;

    let lines = wikitext.split(/\r?\n/);
    let html = "";

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.match(/^===/) !== null && line.match(/===$/) !== null) {
            html += "<h2>" + line.substring(3, line.length - 3) + "</h2>";
        }
        else if (line.match(/^==/) !== null && line.match(/==$/) !== null) {
            html += "<h3>" + line.substring(2, line.length - 2) + "</h3>";
        }
        else if (line.match(/^:+/) !== null) {
            // find start line and ending line
            let start = i;
            while (i < lines.length && lines[i].match(/^:+/) !== null) {
                i++;
            }
            i--;

            html += wiky.process_indent(lines, start, i);
        }
        else if (line.match(/^----+(\s*)$/) !== null) {
            html += "<hr/>";
        }
        else if (line.match(/^(\*+) /) !== null) {
            // find start line and ending line
            let start = i;
            while (i < lines.length && lines[i].match(/^(\*+|##+):? /) !== null) i++;
            i--;

            html += wiky.process_bullet_point(lines, start, i);
        }
        else if (line.match(/^(#+) /) !== null) {
            // find start line and ending line
            let start = i;
            while (i < lines.length && lines[i].match(/^(#+|\*\*+):? /) !== null) {
                i++;
            }
            i--;

            html += wiky.process_bullet_point(lines, start, i);
        }
        else {
            html += wiky.process_normal(line);
        }

        html += "<br/>\n";
    }

    return html;
};

wiky.process_indent = function (lines, start, end) {
    let html = "<dl>";
    for (let i = start; i <= end; i++) {
        html += "<dd>";

        let this_count = lines[i].match(/^(:+)/)[1].length;

        html += wiky.process_normal(lines[i].substring(this_count));

        let nested_end = i;
        for (let j = i + 1; j <= end; j++) {
            let nested_count = lines[j].match(/^(:+)/)[1].length;
            if (nested_count <= this_count) {
                break;
            } else {
                nested_end = j;
            }
        }

        if (nested_end > i) {
            html += wiky.process_indent(lines, i + 1, nested_end);
            i = nested_end;
        }

        html += "</dd>";
    }

    html += "</dl>";
    return html;
};

wiky.process_bullet_point = function (lines, start, end) {
    let  html = (lines[start].charAt(0) === '*') ? "<ul>" : "<ol>";
    html += '\n';

    for (let i = start; i <= end; i++) {
        html += "<li>";

        let this_count = lines[i].match(/^(\*+|#+) /)[1].length;

        html += wiky.process_normal(lines[i].substring(this_count + 1));

        // continue previous with #:
        {
            let nested_end = i;
            for (let j = i + 1; j <= end; j++) {
                let nested_count = lines[j].match(/^(\*+|#+):? /)[1].length;

                if (nested_count < this_count)
                    break;
                else {
                    if (lines[j].charAt(nested_count) === ':') {
                        html += "<br/>" + wiky.process_normal(lines[j].substring(nested_count + 2));
                        nested_end = j;
                    } else {
                        break;
                    }
                }

            }
            i = nested_end;
        }

        // nested bullet point
        {
            let nested_end = i;
            for (let j = i + 1; j <= end; j++) {
                let nested_count = lines[j].match(/^(\*+|#+):? /)[1].length;
                if (nested_count <= this_count) {
                    break;
                } else {
                    nested_end = j;
                }
            }

            if (nested_end > i) {
                html += wiky.process_bullet_point(lines, i + 1, nested_end);
                i = nested_end;
            }
        }

        // continue previous with #:
        {
            let nested_end = i;
            for (let j = i + 1; j <= end; j++) {
                let nested_count = lines[j].match(/^(\*+|#+):? /)[1].length;

                if (nested_count < this_count) {
                    break;
                } else {
                    if (lines[j].charAt(nested_count) === ':') {
                        html += wiky.process_normal(lines[j].substring(nested_count + 2));
                        nested_end = j;
                    } else {
                        break;
                    }
                }

            }

            i = nested_end;
        }

        html += "</li>\n";
    }

    html += (lines[start].charAt(0) === '*') ? "</ul>" : "</ol>";
    html += '\n';
    return html;
};

wiky.process_url = function (txt) {
    let index = txt.indexOf(" "),
        url = txt,
        label = txt,
        css = ' style="background: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAFZJREFUeF59z4EJADEIQ1F36k7u5E7ZKXeUQPACJ3wK7UNokVxVk9kHnQH7bY9hbDyDhNXgjpRLqFlo4M2GgfyJHhjq8V4agfrgPQX3JtJQGbofmCHgA/nAKks+JAjFAAAAAElFTkSuQmCC\") no-repeat scroll right center transparent;padding-right: 13px;"';

    if (index !== -1) {
        url = txt.substring(0, index);
        label = txt.substring(index + 1);
    }
    return '<a href="' + url + '"' + (wiky.options['link-image'] ? css : '') + '>' + label + '</a>';
};

wiky.process_image = function (txt) {
    let index = txt.indexOf(" ");
    let url = txt;
    let label = "";

    if (index > -1) {
        url = txt.substring(0, index);
        label = txt.substring(index + 1);
    }

    return "<img src='" + url + "' alt=\"" + label + "\" />";
};

wiky.process_video = function (url) {
    if (url.match(/^(https?:\/\/)?(www.)?youtube.com\//) === null) {
        return "<b>" + url + " is an invalid YouTube URL</b>";
    }

    let result;
    if ((result = url.match(/^(https?:\/\/)?(www.)?youtube.com\/watch\?(.*)v=([^&]+)/)) !== null) {
        url = "http://www.youtube.com/embed/" + result[4];
    }

    return '<iframe width="480" height="390" src="' + url + '" frameborder="0" allowfullscreen></iframe>';
};

wiky.process_normal = function (wikitext) {
    // Image
    {
        let index = wikitext.indexOf("[[File:");
        let end_index = wikitext.indexOf("]]", index + 7);
        while (index > -1 && end_index > -1) {
            wikitext = wikitext.substring(0, index)
                + wiky.process_image(wikitext.substring(index + 7, end_index))
                + wikitext.substring(end_index + 2);

            index = wikitext.indexOf("[[File:");
            end_index = wikitext.indexOf("]]", index + 7);
        }
    }

    // Video
    {
        let index = wikitext.indexOf("[[Video:");
        let end_index = wikitext.indexOf("]]", index + 8);
        while (index > -1 && end_index > -1) {
            wikitext = wikitext.substring(0, index)
                + wiky.process_video(wikitext.substring(index + 8, end_index))
                + wikitext.substring(end_index + 2);

            index = wikitext.indexOf("[[Video:");
            end_index = wikitext.indexOf("]]", index + 8);
        }
    }


    // URL
    let protocols = ["http", "ftp", "news"];

    for (let i = 0; i < protocols.length; i++) {
        let index = wikitext.indexOf("[" + protocols[i] + "://");
        let end_index = wikitext.indexOf("]", index + 1);
        while (index > -1 && end_index > -1) {

            wikitext = wikitext.substring(0, index)
                + wiky.process_url(wikitext.substring(index + 1, end_index))
                + wikitext.substring(end_index + 1);

            index = wikitext.indexOf("[" + protocols[i] + "://", end_index + 1);
            end_index = wikitext.indexOf("]", index + 1);

        }
    }

    let count_b = 0;
    let index = wikitext.indexOf("'''");
    while (index > -1) {

        if ((count_b % 2) === 0) {
            wikitext = wikitext.replace(/'''/, "<b>");
        } else {
            wikitext = wikitext.replace(/'''/, "</b>");
        }

        count_b++;
        index = wikitext.indexOf("'''", index);
    }

    let count_i = 0;
    index = wikitext.indexOf("''");
    while (index > -1) {

        if ((count_i % 2) === 0) wikitext = wikitext.replace(/''/, "<i>");
        else wikitext = wikitext.replace(/''/, "</i>");

        count_i++;

        index = wikitext.indexOf("''", index);
    }

    wikitext = wikitext.replace(/<\/b><\/i>/g, "</i></b>");

    return wikitext;
};

if (typeof exports === 'object') {
    for (let i in wiky) {
        exports[i] = wiky[i];
    }
}
