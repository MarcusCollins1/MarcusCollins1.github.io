const visitedCountries = ["BE", "CA", "CR", "HR", "CU", "DK", "FJ", "FR", "GR", "VA", "HK", "IN", "IT", "JE", "LI", "LU", "MO", "MX", "ME", "MA", "NL", "NO", "PT", "ZA", "ES", "SE", "CH", "GB", "US"];
const values = {};
visitedCountries.forEach(code => {
    values[code] = { color: "#8b5cf6" };
});

new svgMap({
    targetElementID: "svgMap",
    showTooltips: true,
    tooltipTrigger: "click",
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
