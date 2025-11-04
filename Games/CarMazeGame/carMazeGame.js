(function() {
    const fs = require('fs');
    const LEVELS_FOLDER = "Levels/";
    
    const levelsList = document.getElementById('levels-list');

    // helpers
    async function getLevelNames() {
        try {
            const files = fs.readdirSync(LEVELS_FOLDER);
            return files
        }
        catch (error) {
            console.error('Error reading levels directory:', error);
            return [];
        }
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