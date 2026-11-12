/*
 * stops.js
 * Every stop on the journey, listed in travel order, with the Stand fights at each stop
 * and on the way to it. Fights follow the JoJo Wiki's story order for Stardust Crusaders.
 *
 * Stop fields
 *   id           Unique slug, used internally.
 *   name         Name shown in the journal (uses 1980s names, e.g. "Calcutta").
 *   day          Day of the 50-day countdown when the group arrives.
 *   coords       [latitude, longitude] of the real place.
 *   countryCode  ISO 3166-1 alpha-2 code, used for country info and the flag.
 *   wikiTitle    Exact title of the English Wikipedia article for the real place.
 *   photoTitle   Optional: a different Wikipedia article to take only the place photo
 *                from, for when wikiTitle's own lead image isn't a good photo. The
 *                summary text still comes from wikiTitle. Flags are never used as photos.
 *   enRoute      Optional: ambushes on the way to this stop, in story order (see below).
 *   allies       Optional: allies who join the Crusaders here without a fight, in the
 *                tarot card format below. Each one's tarot stamp is collected on arrival.
 *                Tokyo's allies are introduced, in this order, in the roll call that
 *                deals the Crusaders' cards when the journey begins.
 *   encounters   The Stand battles at this stop, in story order (formats below).
 *                Use an empty array [] for a stop with no Stand battle.
 *   dish         The stop's local dish, shown in the journal's "On the menu" card:
 *                  name         The dish's name, as shown on the card.
 *                  wikiTitle    Exact title of its English Wikipedia article, for the
 *                               photo and the description (the article's first sentence).
 *                  description  Optional: a description to use instead of the article's
 *                               first sentence, when that sentence doesn't say what the
 *                               dish is. Base it on the article.
 *                  note         Joseph's journal note: a sentence or two tying the dish to
 *                               what happened here in the story.
 *                Leave dish out for a stop with no dish; the card is then left out too.
 *
 * Ambushes (enRoute)
 *   Each ambush is one encounter in the formats below, plus where it happened:
 *     where   Short description shown in the journal, e.g. "On the ship to Singapore".
 *     at      [latitude, longitude] of a real place, e.g. Abu Simbel. The route bends
 *             through it on the way to the stop.
 *     along   Or, for a place with no real coordinates: how far along the straight leg
 *             from the previous stop (0) to this stop (1) the ambush happened, e.g. 0.6.
 *     allies  Optional: allies who join the Crusaders at this ambush, as for stops.
 *     day     Optional: the day of the journey the ambush happened, when the story
 *             dates it. It must not be earlier than the stop before the ambush or later
 *             than the stop after it. Without it, the ambush shares the day of the stop
 *             before it.
 *   Pressing Next destination draws the route to the first ambush and stops there; the
 *   journal shows "Ambush on the way to <stop>", and Continue goes on to the next ambush
 *   or the stop. Two or more entries in a row with the same "where" and position share
 *   one ambush, with their cards in story order.
 *
 * Encounter formats (copy one of these for each encounter)
 *   Tarot card:    { type: "tarot", name: "...", code: "ar..", stand: "...", standUser: "..." }
 *   Egyptian god:  { type: "god", name: "...", wikiTitle: "...", stand: "...", standUser: "..." }
 *   Other Stand:   { type: "stand", name: "...", standUser: "...", description: "..." }
 *
 *   name         Card or god name as written in JoJo, or for "stand", the Stand's name.
 *                Shown in the journal and on stamps.
 *   code         Tarot cards only: the tarot API code from the table below.
 *   wikiTitle    Gods only: exact title of the real god's English Wikipedia article,
 *                used to look up its summary and image. Make sure the title opens the
 *                god's own article and not a disambiguation page. For example, the god
 *                Set is "Set (deity)", because "Set" is a disambiguation page.
 *   stand        Tarot cards and gods: name of the Stand.
 *   standUser    Name of the Stand's user.
 *   description  For a "stand": a few words about the Stand, shown on its card in
 *                place of a tarot meaning or god summary. It has no API lookup.
 *                For one of Tokyo's allies: a line introducing them in the roll call.
 *   teaser       Optional, for a Crusader who joins later (an ally, or a Stand user
 *                with becomesAlly): the line on their face-down card in the roll call,
 *                e.g. "Arrives in Hong Kong… friend or foe?". Without it, the card says
 *                where they join, e.g. "Joins in Hong Kong".
 *   image        Optional: the card art shown in the journal, e.g.
 *                image: "assets/cards/the-chariot.webp". Leave it out to show the
 *                encounter without art. All 22 tarot cards and 9 god cards are in
 *                assets/cards/, named after the card (the-fool.webp ... the-world.webp)
 *                or the god as JoJo spells it (osiris, horus, geb, bastet, sethan,
 *                khnum, tohth, anubis, atum), plus cream.webp and tenore-sax.webp.
 *                A "stand" image is shown in a "Not of the Arcana" card frame.
 *                assets/cards/credits.js lists where each came from.
 *   imageAlt     Optional: alt text for the image, when the default ("Cream from
 *                JoJo's Bizarre Adventure", or "The Chariot tarot card art from ...")
 *                doesn't describe what it shows.
 *   photo        Optional: a still from the 2014 anime showing the Stand with its user,
 *                e.g. photo: "assets/stand-photos/silver-chariot.webp". It appears beside
 *                the Stand's name as its card turns over, and at the top of the card's
 *                dossier, where it opens full screen. Stills are cropped to 16:9.
 *                assets/stand-photos/credits.js lists where each came from.
 *   photoAlt     Alt text for photo: what the still shows.
 *   photo2       Optional, for a Stand never shown with its user: a still of the user.
 *                photo is then a still of the Stand alone, and the two are shown side
 *                by side in two frames, like two manga panels. Split-panel stills are
 *                cropped to a tall frame, 0.862 wide for every 1 high.
 *   photo2Alt    Alt text for photo2.
 *                If a photo is left out or can't load, the card simply goes without it.
 *   stats        Optional: the Stand's six ratings from its stat chart, usually "A"
 *                (highest) to "E" (lowest). Some charts show other values, such as "∞",
 *                "None", or "?": write those exactly as the chart shows them. The chart
 *                appears on the card once all six are filled in.
 *                  stats: { power: "A", speed: "A", range: "C",
 *                           durability: "A", precision: "B", potential: "B" }
 *   rematch      Optional: true for a second fight with a Stand already met. Its card
 *                is marked "Rematch" and doesn't add a second stamp.
 *   becomesAlly  Optional: true when the Stand user joins the Crusaders after this fight.
 *                Their stamp goes in the Crusaders' row once the card is turned over.
 *   effect       Optional: "void" turns the card over with Cream's void, which erases the
 *                face-down card instead of flipping it, and makes its stamp a hole
 *                punched through the page.
 *
 * Placeholders
 *   Any value that is still "TODO" is shown in the journal as an unwritten entry
 *   and is never sent to an API. An encounter with type "TODO" is listed as
 *   "not recorded yet" and gets a blank stamp until its type and name are filled in.
 *
 * Tarot API codes for the Major Arcana. The API uses Rider-Waite names for two
 * cards: Strength is listed as "Fortitude" and Judgement as "The Last Judgment".
 *   ar00  The Fool             ar11  Justice
 *   ar01  The Magician         ar12  The Hanged Man
 *   ar02  The High Priestess   ar13  Death
 *   ar03  The Empress          ar14  Temperance
 *   ar04  The Emperor          ar15  The Devil
 *   ar05  The Hierophant       ar16  The Tower
 *   ar06  The Lovers           ar17  The Star
 *   ar07  The Chariot          ar18  The Moon
 *   ar08  Strength             ar19  The Sun
 *   ar09  The Hermit           ar20  Judgement
 *   ar10  Wheel of Fortune     ar21  The World
 */

const STOPS = [
  {
    id: "tokyo",
    name: "Tokyo",
    day: 1,
    coords: [35.6764, 139.65],
    countryCode: "JP",
    wikiTitle: "Tokyo",
    allies: [
      {
        type: "tarot",
        name: "The Star",
        code: "ar17",
        stand: "Star Platinum",
        standUser: "Jotaro Kujo",
        image: "assets/cards/the-star.webp",
        photo: "assets/stand-photos/star-platinum.webp",
        photoAlt: "Jotaro Kujo with Star Platinum at his shoulder",
        stats: { power: "A", speed: "A", range: "C", durability: "A", precision: "A", potential: "A" },
        description: "My grandson: locked himself in jail rather than let his Stand hurt anyone.",
      },
      {
        type: "tarot",
        name: "The Hermit",
        code: "ar09",
        stand: "Hermit Purple",
        standUser: "Joseph Joestar",
        image: "assets/cards/the-hermit.webp",
        photo: "assets/stand-photos/hermit-purple.webp",
        photoAlt: "Joseph Joestar with the thorny vines of Hermit Purple glowing across his chest",
        stats: { power: "D", speed: "C", range: "D", durability: "A", precision: "D", potential: "E" },
        description: "Yours truly: tycoon, trickster, and the dashing author of this journal.",
      },
      {
        type: "tarot",
        name: "The Magician",
        code: "ar01",
        stand: "Magician's Red",
        standUser: "Muhammad Avdol",
        image: "assets/cards/the-magician.webp",
        photo: "assets/stand-photos/magicians-red.webp",
        photoAlt: "Avdol in the desert with Magician's Red, its fist wreathed in flame",
        stats: { power: "B", speed: "B", range: "C", durability: "B", precision: "C", potential: "D" },
        description: "My old friend from Cairo: a fortune teller who met DIO once and lived.",
      },
    ],
    encounters: [
      {
        type: "tarot",
        name: "The Hierophant",
        code: "ar05",
        stand: "Hierophant Green",
        standUser: "Noriaki Kakyoin",
        image: "assets/cards/the-hierophant.webp",
        photo: "assets/stand-photos/hierophant-green.webp",
        photoAlt: "Kakyoin in sunglasses, with Hierophant Green rising behind him",
        stats: { power: "C", speed: "B", range: "A", durability: "B", precision: "C", potential: "D" },
        becomesAlly: true,
        teaser: "Arrives in Tokyo… friend or foe?",
      },
    ],
    dish: {
      name: "Katsudon",
      wikiTitle: "Katsudon",
      note: "Japanese cop shows say a bowl of katsudon coaxes anyone out of a cell; my grandson Jotaro only came out once Avdol filled his cell with fire. Then I smashed a camera at a café so my Stand could print DIO's photo.",
    },
  },
  {
    id: "hong-kong",
    name: "Hong Kong",
    day: 2,
    coords: [22.3193, 114.1694],
    countryCode: "HK",
    wikiTitle: "Hong Kong",
    photoTitle: "Central, Hong Kong", // its lead photo is the skyline across Victoria Harbour
    enRoute: [
      {
        type: "tarot",
        name: "The Tower",
        code: "ar16",
        stand: "Tower of Gray",
        standUser: "Gray Fly",
        image: "assets/cards/the-tower.webp",
        photo: "assets/stand-photos/tower-of-gray.webp", // the Stand
        photoAlt: "Tower of Gray, a Stand like a stag beetle, in flight",
        photo2: "assets/stand-photos/gray-fly.webp", // its user
        photo2Alt: "Gray Fly, an old man in green, covering his mouth",
        stats: { power: "E", speed: "A", range: "A", durability: "C", precision: "E", potential: "E" },
        where: "On the plane, before it crash-lands near Hong Kong",
        along: 0.8,
      },
    ],
    encounters: [
      {
        type: "tarot",
        name: "The Chariot",
        code: "ar07",
        stand: "Silver Chariot",
        standUser: "Jean Pierre Polnareff",
        image: "assets/cards/the-chariot.webp",
        photo: "assets/stand-photos/silver-chariot.webp",
        photoAlt: "Polnareff pointing, with the armored Silver Chariot beside him",
        stats: { power: "C", speed: "A", range: "C", durability: "B", precision: "B", potential: "C" },
        becomesAlly: true,
        teaser: "Arrives in Hong Kong… friend or foe?",
      },
    ],
    dish: {
      name: "Congee",
      wikiTitle: "Congee",
      note: "A French tourist wanted help with the menu, so I bluffed that I read Chinese and got us roasted frogs and century-egg congee. The tourist, Polnareff, was DIO's assassin — until Avdol beat him, Jotaro pulled out DIO's flesh bud, and he joined us.",
    },
  },
  {
    id: "singapore",
    name: "Singapore",
    day: 11,
    coords: [1.3521, 103.8198],
    countryCode: "SG",
    wikiTitle: "Singapore",
    photoTitle: "Marina Bay, Singapore",
    enRoute: [
      {
        type: "tarot",
        name: "The Moon",
        code: "ar18",
        stand: "Dark Blue Moon",
        standUser: "Imposter Captain Tennille",
        image: "assets/cards/the-moon.webp",
        photo: "assets/stand-photos/dark-blue-moon.webp",
        photoAlt: "The impostor Captain Tennille underwater beside Dark Blue Moon",
        stats: { power: "C", speed: "C", range: "C", durability: "B", precision: "C", potential: "D" },
        where: "On the ship to Singapore",
        day: 5, // 2 December in the JoJo Wiki timeline
        along: 0.3,
      },
      {
        type: "tarot",
        name: "Strength",
        code: "ar08",
        stand: "Strength",
        standUser: "Forever",
        image: "assets/cards/strength.webp",
        photo: "assets/stand-photos/strength.webp", // the Stand
        photoAlt: "Strength, the freighter, cutting through the waves",
        photo2: "assets/stand-photos/forever.webp", // its user
        photo2Alt: "Forever, the orangutan, lighting a cigarette",
        stats: { power: "B", speed: "D", range: "D", durability: "A", precision: "E", potential: "E" },
        where: "On an empty freighter",
        day: 5, // 2 December in the JoJo Wiki timeline
        along: 0.6,
      },
    ],
    encounters: [
      {
        type: "tarot",
        name: "The Devil",
        code: "ar15",
        stand: "Ebony Devil",
        standUser: "Devo the Cursed",
        image: "assets/cards/the-devil.webp",
        photo: "assets/stand-photos/ebony-devil.webp",
        photoAlt: "Devo the Cursed below Ebony Devil, wreathed in purple flame",
        stats: { power: "D", speed: "D", range: "A", durability: "B", precision: "D", potential: "B" },
      },
      {
        type: "tarot",
        name: "Temperance",
        code: "ar14",
        stand: "Yellow Temperance",
        standUser: "Rubber Soul",
        image: "assets/cards/temperance.webp",
        photo: "assets/stand-photos/yellow-temperance.webp",
        photoAlt: "Rubber Soul with the yellow flesh of Yellow Temperance rising around his body",
        stats: { power: "D", speed: "C", range: "E", durability: "A", precision: "E", potential: "D" },
      },
    ],
    dish: {
      name: "Laksa",
      wikiTitle: "Laksa",
      note: "Jotaro bought our stowaway and Kakyoin chilled coconut juice — but that Kakyoin was Rubber Soul in disguise, licking a cherry in the creepiest way imaginable. Me, I'd have taken my coconut in a bowl of laksa.",
    },
  },
  {
    id: "calcutta",
    name: "Calcutta",
    day: 16,
    coords: [22.5726, 88.3639],
    countryCode: "IN",
    wikiTitle: "Kolkata",
    encounters: [
      {
        type: "tarot",
        name: "The Hanged Man",
        code: "ar12",
        stand: "Hanged Man",
        standUser: "J. Geil",
        image: "assets/cards/the-hanged-man.webp",
        photo: "assets/stand-photos/hanged-man.webp", // the Stand
        photoAlt: "Hanged Man, a figure wrapped like a mummy, with a blade on its wrist",
        photo2: "assets/stand-photos/j-geil.webp", // its user
        photo2Alt: "J. Geil crouching in the street",
        stats: { power: "C", speed: "A", range: "A", durability: "B", precision: "D", potential: "D" },
      },
      {
        type: "tarot",
        name: "The Emperor",
        code: "ar04",
        stand: "Emperor",
        standUser: "Hol Horse",
        image: "assets/cards/the-emperor.webp",
        photo: "assets/stand-photos/emperor.webp",
        photoAlt: "Hol Horse aiming Emperor, his Stand in the shape of a gun",
        stats: { power: "B", speed: "B", range: "B", durability: "C", precision: "E", potential: "E" },
      },
    ],
    dish: {
      name: "Kati roll",
      wikiTitle: "Kati roll",
      description: "A kati roll is a street-food dish from Kolkata, West Bengal: a skewer-roasted kebab wrapped in paratha flatbread.", // reworded from the article, whose second sentence is long
      note: "Kolkata invented the kati roll, but I'll remember the restaurant that handed Polnareff a stick to fend off the pigs living under its toilet. That day Hol Horse and J. Geil struck Avdol down, and we buried him — or so I told Polnareff.",
    },
  },
  {
    id: "varanasi",
    name: "Varanasi",
    day: 21,
    coords: [25.3176, 82.9739],
    countryCode: "IN",
    wikiTitle: "Varanasi",
    encounters: [
      {
        type: "tarot",
        name: "The Empress",
        code: "ar03",
        stand: "Empress",
        standUser: "Nena",
        image: "assets/cards/the-empress.webp",
        photo: "assets/stand-photos/empress.webp", // the Stand
        photoAlt: "Empress in its full form, a small fleshy figure with its fists raised",
        photo2: "assets/stand-photos/nena.webp", // its user
        photo2Alt: "Nena in a red hood",
        stats: { power: "C", speed: "E", range: "A", durability: "A", precision: "D", potential: "D" },
      },
    ],
    dish: {
      name: "Lassi",
      wikiTitle: "Lassi",
      note: "Varanasi's famous lassi would have hit the spot, but a boil on my arm grew a face, ate a fly, and framed me for murder. A barrel of coal tar finished it — and its user, Nena, the charming girl traveling with us.",
    },
  },
  {
    id: "karachi",
    name: "Karachi",
    day: 26,
    coords: [24.8607, 67.0011],
    countryCode: "PK",
    wikiTitle: "Karachi",
    enRoute: [
      {
        type: "tarot",
        name: "Wheel of Fortune",
        code: "ar10",
        stand: "Wheel of Fortune",
        standUser: "ZZ",
        image: "assets/cards/wheel-of-fortune.webp",
        photo: "assets/stand-photos/wheel-of-fortune.webp", // the Stand
        photoAlt: "Wheel of Fortune, a pink car covered in spikes",
        photo2: "assets/stand-photos/zz.webp", // its user
        photo2Alt: "ZZ, a burly man in a tank top, reaching out",
        stats: { power: "B", speed: "D", range: "D", durability: "A", precision: "E", potential: "D" },
        where: "On the road to Pakistan",
        along: 0.5,
      },
      {
        type: "tarot",
        name: "Justice",
        code: "ar11",
        stand: "Justice",
        standUser: "Enya the Hag",
        image: "assets/cards/justice.webp",
        photo: "assets/stand-photos/justice.webp",
        photoAlt: "Enya the Hag below Justice, a crowned skull looming out of the fog",
        stats: { power: "D", speed: "E", range: "A", durability: "A", precision: "E", potential: "E" },
        where: "In a foggy town in Pakistan",
        along: 0.85,
      },
    ],
    encounters: [
      {
        type: "tarot",
        name: "The Lovers",
        code: "ar06",
        stand: "Lovers",
        standUser: "Steely Dan",
        image: "assets/cards/the-lovers.webp",
        photo: "assets/stand-photos/lovers.webp", // the Stand
        photoAlt: "Lovers, a crowd of tiny golden Stands with red eyes",
        photo2: "assets/stand-photos/steely-dan.webp", // its user
        photo2Alt: "Steely Dan with his arms folded",
        stats: { power: "E", speed: "D", range: "A", durability: "A", precision: "D", potential: "E" },
      },
    ],
    dish: {
      name: "Shish kebab",
      wikiTitle: "Shish kebab",
      note: "I haggled a Karachi kebab seller down under half his price and still paid nearly triple the going rate. Worse, he was Steely Dan, whose tiny Stand crawled into my brain and made Jotaro his servant until Kakyoin and Polnareff drove it out.",
    },
  },
  {
    id: "abu-dhabi",
    name: "Abu Dhabi",
    day: 28,
    coords: [24.4539, 54.3773],
    countryCode: "AE",
    wikiTitle: "Abu Dhabi",
    encounters: [],
    dish: {
      name: "Balaleet",
      wikiTitle: "Balaleet",
      note: "In the Emirates I traded a fancy car for camels and bragged that I could ride them; they made a fool of me in front of everyone. A plate of balaleet, sweet noodles under an omelette, would have soothed my pride.",
    },
  },
  {
    id: "arabian-desert",
    name: "Arabian Desert",
    day: 29,
    coords: [21.5, 51.0], // Draft point in the Rub' al Khali, Saudi Arabia
    countryCode: "SA",
    wikiTitle: "Arabian Desert",
    encounters: [
      {
        type: "tarot",
        name: "The Sun",
        code: "ar19",
        stand: "Sun",
        standUser: "Arabia Fats",
        image: "assets/cards/the-sun.webp",
        photo: "assets/stand-photos/sun.webp", // the Stand
        photoAlt: "Sun, a blazing sun hanging over the desert",
        photo2: "assets/stand-photos/arabia-fats.webp", // its user
        photo2Alt: "Arabia Fats, a heavyset man in a cloak",
        stats: { power: "B", speed: "E", range: "A", durability: "A", precision: "E", potential: "E" },
      },
      {
        type: "tarot",
        name: "Death",
        code: "ar13",
        stand: "Death Thirteen",
        standUser: "Mannish Boy",
        image: "assets/cards/death.webp",
        photo: "assets/stand-photos/death-thirteen.webp", // the Stand
        photoAlt: "Death Thirteen, a grinning reaper in a jester's hat, holding a scythe",
        photo2: "assets/stand-photos/mannish-boy.webp", // its user
        photo2Alt: "Mannish Boy, a baby, smiling",
        stats: { power: "C", speed: "C", range: "E", durability: "B", precision: "D", potential: "B" },
      },
    ],
    dish: {
      name: "Kabsa",
      wikiTitle: "Kabsa",
      note: "The Sun Stand killed our camels and wrecked our water; I'd have sold my hat for a plate of kabsa. Then our baby passenger was secretly a Stand user, so Kakyoin stirred a secret ingredient into his breakfast — and I fed it to him.",
    },
  },
  {
    id: "aswan",
    name: "Aswan",
    day: 40,
    coords: [24.0889, 32.8998],
    countryCode: "EG",
    wikiTitle: "Aswan",
    enRoute: [
      {
        type: "tarot",
        name: "Judgement",
        code: "ar20",
        stand: "Judgement",
        standUser: "Cameo",
        image: "assets/cards/judgement.webp",
        photo: "assets/stand-photos/judgement.webp",
        photoAlt: "Judgement, a huge Stand like a genie, with Cameo at its feet",
        stats: { power: "B", speed: "B", range: "C", durability: "B", precision: "D", potential: "D" },
        where: "On an island in the Red Sea",
        day: 31, // 28 December, with the Red Sea in the JoJo Wiki timeline
        along: 0.76,
      },
      {
        type: "tarot",
        name: "The High Priestess",
        code: "ar02",
        stand: "High Priestess",
        standUser: "Midler",
        image: "assets/cards/the-high-priestess.webp",
        photo: "assets/stand-photos/high-priestess.webp",
        photoAlt: "High Priestess, a masked Stand with a wild mane, bursting out of a wall",
        stats: { power: "C", speed: "B", range: "A", durability: "A", precision: "D", potential: "D" },
        where: "In a submarine crossing the Red Sea",
        day: 31, // 28 December in the JoJo Wiki timeline
        along: 0.82,
      },
      {
        type: "god",
        name: "Geb",
        wikiTitle: "Geb",
        stand: "Geb",
        standUser: "N'Doul",
        image: "assets/cards/geb.webp",
        photo: "assets/stand-photos/geb.webp", // the Stand
        photoAlt: "Geb, a Stand of water shaped like a clawed hand",
        photo2: "assets/stand-photos/ndoul.webp", // its user
        photo2Alt: "N'Doul, a blind man with a cane, sitting in the desert",
        stats: { power: "C", speed: "B", range: "A", durability: "B", precision: "D", potential: "D" },
        where: "In the desert near Abu Simbel",
        day: 37, // around 3 January in the JoJo Wiki timeline
        at: [22.3372, 31.6258], // Abu Simbel, where the group lands in Egypt
        allies: [
          {
            type: "tarot",
            name: "The Fool",
            code: "ar00",
            stand: "The Fool",
            standUser: "Iggy",
            image: "assets/cards/the-fool.webp",
            teaser: "Flies in on the way to Aswan… will work for coffee gum.",
            photo: "assets/stand-photos/the-fool.webp",
            photoAlt: "Iggy the dog, with The Fool rising from the sand behind him",
            stats: { power: "B", speed: "C", range: "D", durability: "C", precision: "D", potential: "C" },
          },
        ],
      },
    ],
    encounters: [
      {
        type: "god",
        name: "Khnum",
        wikiTitle: "Khnum",
        stand: "Khnum",
        standUser: "Oingo",
        image: "assets/cards/khnum.webp",
        photo: "assets/stand-photos/khnum.webp",
        photoAlt: "Oingo's face twisting as Khnum reshapes it",
        stats: { power: "E", speed: "E", range: "E", durability: "A", precision: "E", potential: "E" },
      },
      {
        type: "god",
        name: "Tohth",
        wikiTitle: "Thoth",
        stand: "Tohth",
        standUser: "Boingo",
        image: "assets/cards/tohth.webp",
        photo: "assets/stand-photos/tohth.webp",
        photoAlt: "Boingo crouched over Tohth, his open comic book",
        stats: { power: "E", speed: "E", range: "E", durability: "A", precision: "E", potential: "E" },
      },
    ],
    dish: {
      name: "Hibiscus tea",
      wikiTitle: "Hibiscus tea",
      note: "Aswan is famous for ruby-red hibiscus tea, but ours was black tea poisoned by the café's new waiter, Oingo. We'd already sipped it when Iggy stole a stranger's dessert and startled us into spitting it out.",
    },
  },
  {
    id: "luxor",
    name: "Luxor",
    day: 45,
    coords: [25.6872, 32.6396],
    countryCode: "EG",
    wikiTitle: "Luxor",
    enRoute: [
      {
        type: "god",
        name: "Anubis",
        wikiTitle: "Anubis",
        stand: "Anubis",
        standUser: "Chaka (possessed)",
        image: "assets/cards/anubis.webp",
        photo: "assets/stand-photos/anubis.webp",
        photoAlt: "Chaka holding Anubis, the sword, beside its Egyptian god card",
        stats: { power: "B", speed: "B", range: "E", durability: "A", precision: "E", potential: "C" },
        where: "At the Temple of Kom Ombo",
        at: [24.4521, 32.9285], // Temple of Kom Ombo
      },
      {
        type: "god",
        name: "Anubis",
        wikiTitle: "Anubis",
        stand: "Anubis",
        standUser: "Khan, then Polnareff (both possessed)",
        image: "assets/cards/anubis.webp",
        photo: "assets/stand-photos/anubis-khan.webp",
        photoAlt: "Khan, possessed by Anubis, holding the sword to Polnareff",
        stats: { power: "B", speed: "B", range: "E", durability: "A", precision: "E", potential: "C" },
        rematch: true,
        where: "At a barber's in Edfu",
        at: [24.9781, 32.8734], // Edfu
      },
    ],
    encounters: [
      {
        type: "god",
        name: "Bastet",
        wikiTitle: "Bastet",
        stand: "Bastet",
        standUser: "Mariah",
        image: "assets/cards/bastet.webp",
        photo: "assets/stand-photos/bastet.webp", // the Stand
        photoAlt: "Bastet, an electrical outlet set in a rock",
        photo2: "assets/stand-photos/mariah.webp", // its user
        photo2Alt: "Mariah in a red hooded coat, sitting",
        stats: { power: "E", speed: "E", range: "B", durability: "A", precision: "E", potential: "E" },
      },
      {
        type: "god",
        name: "Sethan",
        wikiTitle: "Set (deity)",
        stand: "Sethan",
        standUser: "Alessi",
        image: "assets/cards/sethan.webp",
        photo: "assets/stand-photos/sethan.webp",
        photoAlt: "Alessi raising an axe, with Sethan's shadow watching from the wall",
        stats: { power: "D", speed: "D", range: "E", durability: "C", precision: "D", potential: "D" },
      },
    ],
    dish: {
      name: "Ful medames",
      wikiTitle: "Ful medames",
      note: "Egyptians start the day with ful medames, but I couldn't lift a spoon without Luxor's loose metal flying at me — Mariah's Stand had made me a magnet. Meanwhile Alessi's Stand shrank Polnareff and Jotaro into kids, and Jotaro beat him anyway.",
    },
  },
  {
    id: "cairo",
    name: "Cairo",
    day: 50,
    coords: [30.0444, 31.2357],
    countryCode: "EG",
    wikiTitle: "Cairo",
    enRoute: [
      {
        type: "god",
        name: "Osiris",
        wikiTitle: "Osiris",
        stand: "Osiris",
        standUser: "Daniel J. D'Arby",
        image: "assets/cards/osiris.webp",
        photo: "assets/stand-photos/osiris.webp",
        photoAlt: "Daniel J. D'Arby with Osiris looming behind him, its hands reaching out",
        stats: { power: "E", speed: "D", range: "D", durability: "C", precision: "D", potential: "D" },
        where: "At a café on the outskirts of Cairo",
        along: 0.9,
      },
    ],
    encounters: [
      {
        type: "tarot",
        name: "The Emperor",
        code: "ar04",
        stand: "Emperor",
        standUser: "Hol Horse",
        image: "assets/cards/the-emperor.webp",
        photo: "assets/stand-photos/emperor.webp",
        photoAlt: "Hol Horse aiming Emperor, his Stand in the shape of a gun",
        stats: { power: "B", speed: "B", range: "B", durability: "C", precision: "E", potential: "E" },
        rematch: true,
      },
      {
        type: "god",
        name: "Tohth",
        wikiTitle: "Thoth",
        stand: "Tohth",
        standUser: "Boingo",
        image: "assets/cards/tohth.webp",
        photo: "assets/stand-photos/tohth.webp",
        photoAlt: "Boingo crouched over Tohth, his open comic book",
        stats: { power: "E", speed: "E", range: "E", durability: "A", precision: "E", potential: "E" },
        rematch: true,
      },
      {
        type: "god",
        name: "Horus",
        wikiTitle: "Horus",
        stand: "Horus",
        standUser: "Pet Shop",
        image: "assets/cards/horus.webp",
        photo: "assets/stand-photos/horus.webp",
        photoAlt: "Pet Shop and Horus in a storm of ice",
        stats: { power: "B", speed: "B", range: "D", durability: "C", precision: "E", potential: "C" },
      },
      {
        type: "god",
        name: "Atum",
        wikiTitle: "Atum",
        stand: "Atum",
        standUser: "Telence T. D'Arby",
        image: "assets/cards/atum.webp",
        photo: "assets/stand-photos/atum.webp",
        photoAlt: "Telence T. D'Arby beside Atum",
        stats: { power: "D", speed: "C", range: "D", durability: "B", precision: "D", potential: "D" },
      },
      {
        type: "stand",
        name: "Tenore Sax",
        standUser: "Kenny G.",
        description: "Kenny G.'s Stand turned DIO's mansion into an endless maze of illusions, until Avdol's flames sniffed him out.",
        image: "assets/cards/tenore-sax.webp",
        imageAlt:
          "Tenore Sax's illusion: a maze of stairs and arches inside DIO's mansion, from JoJo's Bizarre Adventure",
        photo: "assets/stand-photos/tenore-sax.webp", // the Stand
        photoAlt: "Tenore Sax's illusion: a long, smoky hallway in DIO's mansion",
        photo2: "assets/stand-photos/kenny-g.webp", // its user
        photo2Alt: "Kenny G., beaten, crying out",
        stats: { power: "E", speed: "E", range: "D", durability: "A", precision: "E", potential: "E" },
      },
      {
        type: "stand",
        name: "Cream",
        standUser: "Vanilla Ice",
        description: "Vanilla Ice hides inside it as it swallows itself, then it rolls through walls and people alike, erasing everything into nothing.",
        image: "assets/cards/cream.webp",
        photo: "assets/stand-photos/cream.webp",
        photoAlt: "Cream lunging with its mouth gaping open, with Vanilla Ice beside it and Polnareff below",
        stats: { power: "B", speed: "B", range: "D", durability: "C", precision: "C", potential: "D" },
        effect: "void",
      },
      {
        type: "tarot",
        name: "The World",
        code: "ar21",
        stand: "The World",
        standUser: "DIO",
        image: "assets/cards/the-world.webp",
        photo: "assets/stand-photos/the-world.webp",
        photoAlt: "DIO with The World in front of him",
        stats: { power: "A", speed: "A", range: "C", durability: "A", precision: "B", potential: "B" },
      },
    ],
    dish: {
      name: "Koshari",
      wikiTitle: "Koshari",
      note: "I meant to toast Cairo with a plate of koshari, but a gambler named D'Arby won my soul by cheating with a melting square of chocolate. Jotaro won us all back at poker with a bluff so bold that D'Arby lost his mind.",
    },
  },
];
