class ThemeUtil {

    static switchTheme(themeTitle) {
        // disable other alternate stylesheets
        document.querySelectorAll("[rel=\"alternate stylesheet\"]").forEach( (elem) => {
            if (themeTitle !==  elem.title && elem.enabled) {
                elem.disabled = true;
            }
        });

        // enable alternate stylesheets
        document.querySelectorAll("[rel=\"alternate stylesheet\"]").forEach( (elem) => {
            if (themeTitle ===  elem.title) {
                elem.disabled = false;
            }
        });
    }
}