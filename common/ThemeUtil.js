class ThemeUtil {

    static switchTheme(themeTitle) {
        // disable other alternate stylesheets
        [].forEach.call( document.querySelectorAll("[rel=\"alternate stylesheet\"]"), (elem) => {
            if (themeTitle !==  elem.title && elem.enabled) {
                elem.disabled = true;
            }
        });

        // enable alternate stylesheets
        [].forEach.call( document.querySelectorAll("[rel=\"alternate stylesheet\"]"), (elem) => {
            if (themeTitle ===  elem.title) {
                elem.disabled = false;
            }
        });
    }
}