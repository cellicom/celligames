// Elenco giochi: modifica qui (formato JSON).
// I testi tradotti (description e ogni genere) sono oggetti { "it": ..., "en": ... }.
// "genres" è un elenco: ogni genere diventa un chip colorato.
// "video" (facoltativo): link YouTube o file .mp4/.webm. Se c'è, ha la priorità sugli screenshot.
window.GAMES = {
  "games": [
    {
      "id": "cluehunter",
      "name": "Clue Hunter",
      "url": "https://cluehunter.vercel.app",
      "players": 4,
      "genres": [
        { "it": "Avventura", "en": "Adventure" },
        { "it": "Educativo", "en": "Educational" }
      ],
      "languages": ["it", "en"],
      "logo": "assets/cluehunter/logo.svg",
      "video": "https://youtu.be/SfmyL_80xDw",
      "description": {
        "it": "Avventura retrò in pixel art: vola tra oltre 200 città reali, segui gli indizi e trova più di 400 tesori storici prima dei tre rivali controllati dall'AI.",
        "en": "A retro pixel-art travel adventure: fly across 200+ real cities, follow the clues and find over 400 historical treasures before three AI rivals do."
      }
    },
    {
      "id": "wordsquest",
      "name": "Words Quest",
      "url": "https://wordsquest.vercel.app",
      "players": 1,
      "genres": [
        { "it": "Puzzle", "en": "Puzzle" },
        { "it": "Parole", "en": "Words" },
        { "it": "Daily", "en": "Daily" }
      ],
      "languages": ["it", "en"],
      "logo": "assets/wordsquest/logo.svg",
      "description": {
        "it": "Ogni giorno una nuova sfida: indovina le parole in 6 tentativi, con indizi che si sbloccano strada facendo. Solo parole vere, da dizionario.",
        "en": "A new challenge every day: guess the words in 6 attempts, with hints unlocking along the way. Only real words, straight from the dictionary."
      },
      "screens": [
        "assets/wordsquest/screen-1.png"
      ]
    },
    {
      "id": "journey",
      "name": "Journey",
      "url": "https://play.google.com/store/apps/details?id=com.cellicomsoft.rmmv_dnd",
      "players": 1,
      "genres": [
        { "it": "RPG", "en": "RPG" },
        { "it": "A turni", "en": "Turn-based" },
        { "it": "Fantasy", "en": "Fantasy" }
      ],
      "languages": ["it", "en"],
      "logo": "assets/journey/logo.svg",
      "description": {
        "it": "Un master e quattro amici al tavolo di D&D: può succedere di tutto! La mia prima campagna da master trasformata in un RPG classico a turni. Demo per Android.",
        "en": "A Dungeon Master and four friends around a D&D table: anything can happen! My first campaign as a DM turned into a classic turn-based RPG. Android demo."
      },
      "screens": [
        "assets/journey/screen-1.jpg"
      ]
    }
  ]
}
;
