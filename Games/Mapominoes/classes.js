export class Game {
    constructor(gamePin, players, packs, joinable) {
        this.gamePin = gamePin;
        this.players = players;
        this.packs = packs;
        this.joinable = joinable;
    }
}

export class Player {
    constructor(name) {
        this.name = name;
        this.cards = [];
        this.numTransits = 0;
    }
    
    dealCards(cards, numTransits) {
        this.cards = cards;
        this.numTransits = numTransits;
    }

    hasCardByName(cardName) {
        for (let card of this.cards) {
            if (card.name === cardName) return true;
        }
        return false;
    }

    getCardByName(cardName) {
        for (let card of this.cards) {
            if (card.name === cardName) return card;
        }
        return null;
    }

    getCardIndexByName(cardName) {
        for (let i = 0; i < this.cards.length; i++) {
            if (this.cards[i].name === cardName) return i;
        }
        return -1;
    }

    removeCardFromHandByName(cardName) {
        this.cards.splice(this.getCardIndexByName(cardName), 1);
    }
}

export class Card {
    constructor(name, borders, seas, image) {
        this.name = name;
        this.borders = borders;
        this.seas = seas;
        this.image = image;
    }
}

export class Sea {
    constructor (name, image) {
        this.name = name;
        this.image = image;
    }
}

export class Pack {
    constructor(name, cards, seas) {
        this.name = name;
        this.cards = cards;
        this.seas = seas;
    }
}
