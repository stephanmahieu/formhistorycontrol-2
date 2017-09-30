class OptionsUtil {

    static getInterfaceTheme() {
        return browser.storage.local.get({interfaceTheme: "default"});
    }
}
