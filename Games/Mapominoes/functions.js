import { boardState, el, player, getCardByName } from "./mapominoes.js";
import { Card, Sea } from "./classes.js";

const directions = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
];

export function getElementByRowCol(row, col) {
    for (const child of el.board.children) {
        const childRow = Number(child.dataset.row);
        const childCol = Number(child.dataset.col);
        if (childRow === row && childCol === col) {
            return child;
        }
    }
    return null;
}

export function bordersTransit(row, col) {
    for (const [dRow, dCol] of directions) {
        const element = getElementByRowCol(row + dRow, col + dCol);
        if (element && element.classList.contains("transit-on-board")) {
            return true;
        }
    }
    return false;
}

export function isCountryAllowedAtRowCol(row, col, card) {
    if (!(card instanceof Card)) {
        return false;
    }

    for (const [dRow, dCol] of directions) {
        const key = `${row + dRow}-${col + dCol}`;
        const neighbor = boardState[key];
        if (!neighbor) {
            continue;
        }

        if (neighbor instanceof Card) {
            if (!neighbor.borders.includes(card.name)) {
                return false;
            }
        } else if (neighbor instanceof Sea) {
            if (!card.seas.includes(neighbor.name)) {
                return false;
            }
        }
    }

    return true;
}

export function hasCardThatBordersCountry(cardName) {
    return Boolean(player) && player.cards.some((card) => card.borders.includes(cardName));
}

export function hasCardThatBordersSea(seaName) {
    return Boolean(player) && player.cards.some((card) => card.seas.includes(seaName));
}

function hasAnyEmptyNeighbor(row, col) {
    return directions.some(([dRow, dCol]) => {
        const key = `${row + dRow}-${col + dCol}`;
        return !boardState[key];
    });
}

export function getAllowedCountriesAt(row, col) {
    if (!player) {
        return [];
    }

    const candidateLists = [];

    for (const [dRow, dCol] of directions) {
        const key = `${row + dRow}-${col + dCol}`;
        const neighbor = boardState[key];
        if (!neighbor) {
            continue;
        }

        const element = getElementByRowCol(row + dRow, col + dCol);
        if (element && element.classList.contains("transit-on-board")) {
            return [];
        }

        if (neighbor instanceof Card) {
            candidateLists.push(neighbor.borders.filter((border) => hasCardThatBordersCountry(border)));
        } else if (neighbor instanceof Sea) {
            candidateLists.push(neighbor.seas.filter((sea) => hasCardThatBordersSea(sea)));
        }
    }

    if (candidateLists.length === 0) {
        return [];
    }

    const intersection = candidateLists.reduce((acc, curr) => acc.filter((item) => curr.includes(item)));
    if (intersection.length === 0 || !hasAnyEmptyNeighbor(row, col)) {
        return [];
    }

    return intersection.filter((countryName) => {
        const country = getCardByName(countryName);
        if (!country) {
            return false;
        }

        return country.borders.some((borderName) => {
            if (!player.hasCardByName(borderName)) {
                return false;
            }

            const borderCard = getCardByName(borderName);
            if (!(borderCard instanceof Card)) {
                return false;
            }

            return directions.some(([dRow, dCol]) => {
                const key = `${row + dRow}-${col + dCol}`;
                return !boardState[key] && isCountryAllowedAtRowCol(row + dRow, col + dCol, borderCard);
            });
        });
    });
}

export function getAllowedSeasAt(row, col) {
    if (!player) {
        return [];
    }

    const candidateLists = [];

    for (const [dRow, dCol] of directions) {
        const key = `${row + dRow}-${col + dCol}`;
        const neighbor = boardState[key];
        if (!neighbor) {
            continue;
        }

        const element = getElementByRowCol(row + dRow, col + dCol);
        if (element && element.classList.contains("transit-on-board")) {
            return [];
        }

        if (neighbor instanceof Card) {
            candidateLists.push(neighbor.seas.filter((sea) => hasCardThatBordersSea(sea)));
        } else if (neighbor instanceof Sea) {
            candidateLists.push([neighbor.name]);
        }
    }

    if (candidateLists.length === 0) {
        return [];
    }

    const intersection = candidateLists.reduce((acc, curr) => acc.filter((item) => curr.includes(item)));
    if (intersection.length === 0 || !hasAnyEmptyNeighbor(row, col)) {
        return [];
    }

    return intersection.filter((seaName) => player.cards.some((card) => card.seas.includes(seaName)));
}
