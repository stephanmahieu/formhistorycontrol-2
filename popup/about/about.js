'use strict';

document.addEventListener("DOMContentLoaded", function(/*event*/) {
    ThemeUtil.switchTheme(OptionsUtil.getThema());

    let manifest = browser.runtime.getManifest();
    // document.title += " " + manifest.name;
    document.getElementById("app-name").textContent = manifest.name;
    document.getElementById("app-version").textContent = manifest.version;
    document.getElementById("app-description").textContent = manifest.description;
    document.getElementById("app-developer-name").textContent = manifest.developer.name;
    document.getElementById("app-developer-url").href = manifest.developer.url;
    // optional_permissions[]
    // permissions[]
    // web_accessible_resources[] -> folder/example.png
    //console.log("manifest is:" + manifest);

    document.getElementById("app-developer-url").addEventListener("click", openDeveloperURL);
});


function openDeveloperURL() {
    console.log("Opening developer URL in new window...");
    let developerURL = browser.runtime.getManifest().developer.url;
    browser.windows.create({
        url: developerURL,
        type: "normal"
    });
}