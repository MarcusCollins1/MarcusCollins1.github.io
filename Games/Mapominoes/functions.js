import {
    boardState,
    el,
    player,
    getCardByName,
} from "./mapominoes.js"

import {
    Card,
    Sea
} from "./classes.js"

export function isCountryAllowedAtRowCol(row, col, card) {
    const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    for (const [dRow, dCol] of directions) {
        const key = `${row+dRow}-${col+dCol}`;
        if (key in boardState) {
            if (boardState[key] instanceof Card) {
                if (!(boardState[key].borders.includes(card.name))) return false;
            } else if (boardState[key] instanceof Sea) {
                if (!(card.seas.includes(boardState[key].name))) return false;
            }
        }
    }
    return true;
}

export function bordersTransit(row, col) {
    const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    for (const [dRow, dCol] of directions) {
        const element = getElementByRowCol(row+dRow, col+dCol);
        if (element === undefined) continue;
        if (element.classList.contains("transit-on-board")) return true;
    }
    return false;
}

export function getElementByRowCol(row, col) {
    for (const child of el.board.children) {
        if (parseInt(child.style.gridRow) === row && parseInt(child.style.gridColumn) === col) {
            return child;
        }
    }
}

export function hasCardThatBordersCountry(cardName) {
    for (const card of player.cards) {
        if (card.borders.includes(cardName)) return true;
    }
    return false;
}

export function hasCardThatBordersSea(seaName) {
    for (const card of player.cards) {
        if (card.seas.includes(seaName)) return true;
    }
    return false;
}

export function getAllowedCountriesAt(row, col) {
    const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    const allowedCountries = [];
    for (const [dRow, dCol] of directions) {
        const key = `${row+dRow}-${col+dCol}`;
        if (key in boardState) {
            if (getElementByRowCol(row+dRow, col+dCol).classList.contains("transit-on-board")) return [];
            allowedCountries.push(boardState[key].borders.filter(border => hasCardThatBordersCountry(border)));
        }
    }
    if (allowedCountries.length === 0) return [];
    return allowedCountries.reduce((acc, currArray) => {
        return acc.filter(item => currArray.includes(item));
    }).filter(countryName => {
        const country = getCardByName(countryName);
        const borders = country.borders;
        for (const border of borders) {
            const card = getCardByName(border);
            if (!(player.hasCardByName(border))) continue;
            let isAllowed = false;
            for (const [dRow, dCol] of directions) {
                const key = `${row+dRow}-${col+dCol}`;
                if (key in boardState) continue;
                if (isCountryAllowedAtRowCol(row+dRow, col+dCol, card)) {
                    isAllowed = true;
                    break;
                }
            }
            if (isAllowed) return true;
        }
        return false;
    });
}

export function getAllowedSeasAt(row, col) {
    const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    const allowedSeas = [];
    for (const [dRow, dCol] of directions) {
        const key = `${row+dRow}-${col+dCol}`;
        if (key in boardState) {
            if (getElementByRowCol(row+dRow, col+dCol).classList.contains("transit-on-board")) return [];
            allowedSeas.push(boardState[key].seas.filter(sea => hasCardThatBordersSea(sea)));
        }
    }
    if (allowedSeas.length === 0) return [];
    return allowedSeas.reduce((acc, currArray) => {
        return acc.filter(item => currArray.includes(item));
    }).filter(seaName => {
        for (const card of player.cards) {
            let isAllowed = false;
            if (!(card.seas.includes(seaName))) continue;
            for (const [dRow, dCol] of directions) {
                const key = `${row+dRow}-${col+dCol}`;
                if (key in boardState) continue;
                if (isCountryAllowedAtRowCol(row+dRow, col+dCol)) {
                    isAllowed = true;
                    break;
                }
            }
            if (isAllowed) return true;
        }
    });
}
