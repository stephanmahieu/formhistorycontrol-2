class OptionsUtil {

    static getInterfaceTheme() {
        const defaultValue = "default";
        return new Promise((resolve, reject) => {
            browser.storage.local.get({prefInterfaceTheme: defaultValue}).then(
                result => {
                    resolve(result.prefInterfaceTheme);
                },
                () => {
                    resolve(defaultValue);
                }
            );
        });
    }
}
