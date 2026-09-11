async function getFileNames(owner, repo, path="") {
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    );

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    const files = await response.json();

    return files.map(file => file.name);
}

getFileNames("MarcusCollins1", "advent-of-code")
    .then(names => console.log(names));