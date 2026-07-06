const visitedCountries = ["GB", "BE", "CA"];
const values = {};
visitedCountries.forEach(code => {
    values[code] = { visited: 1 };
});

new svgMap({
    targetElementID: "svgMap",
    showTooltips: false,
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
