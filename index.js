async function getAOCRepoFiles() {
    const response = await fetch(
        "https://api.github.com/repos/MarcusCollins1/advent-of-code/contents"
    );

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
}

getAOCRepoFiles().then(files => {
    console.log(files);

    for (const file of files) {
        console.log(file.name);
    }
})