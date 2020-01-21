/*
 * Copyright (c) 2020. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

class FileUtil {

    /**
     * Download content as exportFilename with type fileType.
     *
     * @param content to be downloaded
     * @param fileType type of file, ie 'text/xml'
     * @param exportFilename suggested filename
     * @returns {Promise<boolean result>} result is true if download succeeded otherwise false
     */
    static download(content, fileType, exportFilename) {
        let file = new Blob([content], {type: fileType});
        const downloadUrl = URL.createObjectURL(file);

        return new Promise((resolve, reject) => {
            browser.downloads.download({
                url: downloadUrl,
                saveAs: true,
                filename: exportFilename,
                conflictAction: 'overwrite'
            }).then(
                (id) => {
                    // console.log(`Download started, id: ${id}`);
                    file = null;
                    resolve(true);
                },
                (error) => {
                    console.error(`Download failed. ${error}`);
                    file = null;
                    resolve(false);
                }
            );
        });
    }

    /**
     * Upload a file of a certain filetype
     *
     * @param fileList taken from an file input element.
     * @param requireFileType accept only file(s) of this type
     * @param progressElmId if present display progress and messages in modal dialogs otherwise log to console
     * @returns {Promise<String content>} resolve file content if upload succeeded, reject with error message otherwise
     */
    static upload(fileList, requireFileType, progressElmId) {
        return new Promise((resolve, reject) => {
            for (let i = 0, f; f = fileList[i]; i++) {
                // console.log(
                //     "Selected file: " + f.name + ", " +
                //     "type " + (f.type || "n/a" ) + ", " +
                //     f.size + " bytes, " +
                //     "last modified: " + (f.lastModified ? new Date(f.lastModified).toISOString() : "n/a")
                // );

                // only process requested type files
                if (requireFileType !== f.type) {
                    if (progressElmId) {
                        WindowUtil.showModalError({titleId: "importErrorTitle", msgId: "importErrorNotXml", args: [requireFileType]});
                    } else {
                        console.log(`Not a ${requireFileType} file, skipping...`);
                    }
                    continue;
                }

                // console.log("Importing file " + f.name + "...");
                const reader = new FileReader();

                reader.onerror = function(evt) {
                    switch(evt.target.error.code) {
                        case evt.target.error.NOT_FOUND_ERR:
                            if (progressElmId) {
                                WindowUtil.showModalError({titleId: "importErrorTitle", msgId: "importErrorNotFound"});
                            } else {
                                console.log('Import file not found.');
                            }
                            break;
                        case evt.target.error.NOT_READABLE_ERR:
                            if (progressElmId) {
                                WindowUtil.showModalError({
                                    titleId: "importErrorTitle",
                                    msgId: "importErrorNotReadable"
                                });
                            } else {
                                console.log('Import file is not readable.');
                            }
                            break;
                        case evt.target.error.ABORT_ERR:
                            break; // noop
                        default:
                            if (progressElmId) {
                                WindowUtil.showModalError({titleId: "importErrorTitle", msgId: "importErrorUnknown"});
                            } else {
                                console.log('An error occurred reading the import file.');
                            }
                    }
                };

                reader.onloadstart = function(/*evt*/) {
                    if (progressElmId) {
                        document.getElementById(progressElmId).value = 0;
                    } else {
                        console.log("- loading...");
                    }
                };

                reader.onprogress = function(evt){
                    let percentLoaded = 0;
                    if (evt.lengthComputable) {
                        percentLoaded = Math.round((evt.loaded / evt.total) * 100);
                    }
                    if (progressElmId) {
                        document.getElementById('import-progress').value = percentLoaded;
                    } else {
                        console.log("- progress ", percentLoaded, "%");
                    }
                };

                reader.onabort = function(/*evt*/) {
                    if (progressElmId) {
                        WindowUtil.showModalError({titleId: "importErrorTitle", msgId: "importErrorUnknown"});
                    } else {
                        console.log("- cancelled");
                    }
                    reject('Upload aborted');
                };

                reader.onload = function(/*evt*/) {
                    resolve(reader.result);
                };

                reader.readAsText(f, "utf-8");
            }
        });
    }

}