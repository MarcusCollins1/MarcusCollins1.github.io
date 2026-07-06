const visitedCountries = ["GB", "DE"];
const values = {};
visitedCountries.forEach(code => {
    values[code] = { visited: 1 };
});

new svgMap({
    targetElementID: "svgMap",
    showToolTips: false,
    data: {
        data: {
            visited: {
                name: "Visited"
            }
        },

        applyData: "visited",

        values
    }
});