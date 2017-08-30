document.addEventListener("DOMContentLoaded", function(event) {
    let manifest = browser.runtime.getManifest();
    // document.title += " " + manifest.name;
    document.getElementById("app-name").innerHTML = manifest.name;
    document.getElementById("app-version").innerHTML = manifest.version;
    document.getElementById("app-description").innerHTML = manifest.description;
    document.getElementById("app-developer-name").innerHTML = manifest.developer.name;
    document.getElementById("app-developer-email").href = manifest.developer.url;
    // optional_permissions[]
    // permissions[]
    // web_accessible_resources[] -> folder/example.png
    //console.log("manifest is:" + manifest);
});
