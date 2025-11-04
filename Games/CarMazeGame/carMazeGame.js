(function() {
    const LEVELS_FOLDER = "Levels/";
    
    const levelsList = document.getElementById('levels-list');

    // helpers
    async function getLevelFolders() {
        try {
            const response = await fetch(LEVELS_FOLDER);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const folders = Array.from(doc.querySelectorAll('a'))
                .map(a => a.href)
                .filter(href => href.endsWith('/'))
                .map(href => href.split('/').slice(-2)[0]);
            return folders;
        } catch (error) {
            console.error('Error getting level folders:', error);
            return [];
        }
    }


    (function init() {
        getLevelFolders().then(folders => {
            folders.forEach(folder => {
                console.log('Found level folder:', folder);
                const li = document.createElement('li');
                li.textContent = folder;
                levelsList.appendChild(li);
            });
        });
    })();
})();