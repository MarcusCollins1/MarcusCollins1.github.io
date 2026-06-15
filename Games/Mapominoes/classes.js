export class Game {
    constructor({
        gamePin,
        players = [],
        packs = [],
        joinable = true,
        playing = false,
        hands = {},
        transits = {},
        board = {},
        startingCard = null,
        turn = 0,
        finishedOrder = [],
    } = {}) {
        this.gamePin = gamePin;
        this.players = players;
        this.packs = packs;
        this.joinable = joinable;
        this.playing = playing;
        this.hands = hands;
        this.transits = transits;
        this.board = board;
        this.startingCard = startingCard;
        this.turn = turn;
        this.finishedOrder = finishedOrder;
    }
}

export class Player {
    constructor(name, cards = [], numTransits = 2) {
        this.name = name;
        this.cards = cards;
        this.numTransits = numTransits;
    }

    dealCards(cards, numTransits = this.numTransits) {
        this.cards = [...cards];
        this.numTransits = numTransits;
    }

    hasCardByName(cardName) {
        return this.cards.some((card) => card.name === cardName);
    }

    getCardByName(cardName) {
        return this.cards.find((card) => card.name === cardName) ?? null;
    }

    getCardIndexByName(cardName) {
        return this.cards.findIndex((card) => card.name === cardName);
    }

    removeCardFromHandByName(cardName) {
        const index = this.getCardIndexByName(cardName);
        if (index >= 0) {
            this.cards.splice(index, 1);
        }
    }

    toPlainCards() {
        return this.cards.map((card) => {
            if (card && typeof card.toDict === "function") {
                return card.toDict();
            }
            return {
                name: card.name,
                borders: Array.isArray(card.borders) ? [...card.borders] : [],
                seas: Array.isArray(card.seas) ? [...card.seas] : [],
                image: card.image ?? "",
            };
        });
    }
}

export class Card {
    constructor(name, borders, seas, image) {
        this.name = name;
        this.borders = Array.isArray(borders) ? [...borders] : [];
        this.seas = Array.isArray(seas) ? [...seas] : [];
        this.image = image;
        this.isTransit = false;
    }

    toDict() {
        return {
            name: this.name,
            borders: [...this.borders],
            seas: [...this.seas],
            image: this.image,
        };
    }
}

export class Sea {
    constructor(name, image) {
        this.name = name;
        this.image = image;
        this.isTransit = false;
    }

    toDict() {
        return {
            name: this.name,
            image: this.image,
        };
    }
}

export class Pack {
    constructor(name, cards, seas) {
        this.name = name;
        this.cards = cards;
        this.seas = seas;
    }
}
