(function() {
    const LEVELS_JSON = "Levels/index.json";
    
    const levelsList = document.getElementById('levels-list');

    // helpers
    async function getLevelNames() {
        fetch(LEVELS_JSON)
        .then(response => response.json())
        .then(data => {
            return data;
        });
    }


    (function init() {
        // Populate levels list
        getLevelNames().then(names => {
            names.forEach(name => {
                console.log('Found level folder:', name);
                const li = document.createElement('li');
                const button = document.createElement('button');
                button.textContent = name;
                button.onclick = () => {
                    // Load the selected level
                    loadLevel(LEVELS_FOLDER + `/${name.toLowerCase()}.json`);
                }
                li.appendChild(button);
                levelsList.appendChild(li);
            });
        });
    })();
})();