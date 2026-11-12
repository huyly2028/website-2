/* Where each Stand photo came from. A script rather than JSON, so the page can read it even
   when opened straight from the file system. Listed in the Sources and credits dialog. */
const STAND_PHOTO_CREDITS = {
  "credit": "Screenshots from the 2014 anime JoJo's Bizarre Adventure: Stardust Crusaders (David Production), based on the manga by Hirohiko Araki, via the JoJo Wiki.",
  "license": "Copyrighted screenshots, marked as fair use on the JoJo Wiki. Used here in an unpublished student project.",
  "source": "https://jojowiki.com/",
  "processing": "Downloaded at up to 1280 px wide and cropped to fill their frames: 16:9 for a single photo, and a tall frame for each half of a split panel (the Stand in one, its user in the other). Saved as WebP.",
  "files": [
    {
      "file": "star-platinum.webp",
      "shows": "Star Platinum and Jotaro Kujo",
      "originalFile": "JoJos bizarre adventure stardust crusaders-05-jotaro-star platinum-stand.jpg",
      "filePage": "https://jojowiki.com/File:JoJos_bizarre_adventure_stardust_crusaders-05-jotaro-star_platinum-stand.jpg"
    },
    {
      "file": "magicians-red.webp",
      "shows": "Magician's Red and Muhammad Avdol",
      "originalFile": "GebdefeatedAvdol.png",
      "filePage": "https://jojowiki.com/File:GebdefeatedAvdol.png"
    },
    {
      "file": "hermit-purple.webp",
      "shows": "Hermit Purple and Joseph Joestar",
      "originalFile": "Joseph protects himself with the Ripple Anime.png",
      "filePage": "https://jojowiki.com/File:Joseph_protects_himself_with_the_Ripple_Anime.png"
    },
    {
      "file": "hierophant-green.webp",
      "shows": "Hierophant Green and Noriaki Kakyoin",
      "originalFile": "KakyoinGlasses hierophant.png",
      "filePage": "https://jojowiki.com/File:KakyoinGlasses_hierophant.png"
    },
    {
      "file": "silver-chariot.webp",
      "shows": "Silver Chariot and Jean Pierre Polnareff",
      "originalFile": "SCep11-22.png",
      "filePage": "https://jojowiki.com/File:SCep11-22.png"
    },
    {
      "file": "dark-blue-moon.webp",
      "shows": "Dark Blue Moon and Imposter Captain Tennille",
      "originalFile": "TenilleDBM.png",
      "filePage": "https://jojowiki.com/File:TenilleDBM.png"
    },
    {
      "file": "ebony-devil.webp",
      "shows": "Ebony Devil and Devo the Cursed",
      "originalFile": "EbonyDevil-and-Devo-A08.png",
      "filePage": "https://jojowiki.com/File:EbonyDevil-and-Devo-A08.png"
    },
    {
      "file": "yellow-temperance.webp",
      "shows": "Yellow Temperance and Rubber Soul",
      "originalFile": "Rubbervsstar.png",
      "filePage": "https://jojowiki.com/File:Rubbervsstar.png"
    },
    {
      "file": "emperor.webp",
      "shows": "Emperor and Hol Horse",
      "originalFile": "Hol Horse Anime Gun.jpg",
      "filePage": "https://jojowiki.com/File:Hol_Horse_Anime_Gun.jpg"
    },
    {
      "file": "justice.webp",
      "shows": "Justice and Enya the Hag",
      "originalFile": "Justice with Enya.png",
      "filePage": "https://jojowiki.com/File:Justice_with_Enya.png"
    },
    {
      "file": "judgement.webp",
      "shows": "Judgement and Cameo",
      "originalFile": "JudgementReveal.PNG",
      "filePage": "https://jojowiki.com/File:JudgementReveal.PNG"
    },
    {
      "file": "high-priestess.webp",
      "shows": "High Priestess",
      "originalFile": "HighPriestess first.jpg",
      "filePage": "https://jojowiki.com/File:HighPriestess_first.jpg"
    },
    {
      "file": "the-fool.webp",
      "shows": "The Fool and Iggy",
      "originalFile": "Iggy's last stand Anime.png",
      "filePage": "https://jojowiki.com/File:Iggy%27s_last_stand_Anime.png"
    },
    {
      "file": "khnum.webp",
      "shows": "Khnum and Oingo",
      "originalFile": "Khnum Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Khnum_Infobox_Anime.png"
    },
    {
      "file": "tohth.webp",
      "shows": "Tohth and Boingo",
      "originalFile": "Boingo explains how to kill Jotaro.png",
      "filePage": "https://jojowiki.com/File:Boingo_explains_how_to_kill_Jotaro.png"
    },
    {
      "file": "anubis.webp",
      "shows": "Anubis and Chaka",
      "originalFile": "Chaka Anubis God Card Anime.png",
      "filePage": "https://jojowiki.com/File:Chaka_Anubis_God_Card_Anime.png"
    },
    {
      "file": "anubis-khan.webp",
      "shows": "Anubis and Khan, with Polnareff",
      "originalFile": "Khan2.png",
      "filePage": "https://jojowiki.com/File:Khan2.png"
    },
    {
      "file": "sethan.webp",
      "shows": "Sethan and Alessi",
      "originalFile": "Alessi Sethan summon.png",
      "filePage": "https://jojowiki.com/File:Alessi_Sethan_summon.png"
    },
    {
      "file": "osiris.webp",
      "shows": "Osiris and Daniel J. D'Arby",
      "originalFile": "Osiris_emerges.png",
      "filePage": "https://jojowiki.com/File:Osiris_emerges.png"
    },
    {
      "file": "horus.webp",
      "shows": "Horus and Pet Shop",
      "originalFile": "Pet Shop and Horus.png",
      "filePage": "https://jojowiki.com/File:Pet_Shop_and_Horus.png"
    },
    {
      "file": "atum.webp",
      "shows": "Atum and Telence T. D'Arby",
      "originalFile": "Telence Atum.png",
      "filePage": "https://jojowiki.com/File:Telence_Atum.png"
    },
    {
      "file": "cream.webp",
      "shows": "Cream and Vanilla Ice",
      "originalFile": "Cream's last attempt.png",
      "filePage": "https://jojowiki.com/File:Cream%27s_last_attempt.png"
    },
    {
      "file": "the-world.webp",
      "shows": "The World and DIO",
      "originalFile": "DIO WRYYYYYYYYY Anime.png",
      "filePage": "https://jojowiki.com/File:DIO_WRYYYYYYYYY_Anime.png"
    },
    {
      "file": "tower-of-gray.webp",
      "shows": "Tower of Gray",
      "originalFile": "Tower of Gray Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Tower_of_Gray_Infobox_Anime.png"
    },
    {
      "file": "gray-fly.webp",
      "shows": "Gray Fly",
      "originalFile": "Gray Fly Infobox Anime.jpg",
      "filePage": "https://jojowiki.com/File:Gray_Fly_Infobox_Anime.jpg"
    },
    {
      "file": "strength.webp",
      "shows": "Strength",
      "originalFile": "StrengthAv.png",
      "filePage": "https://jojowiki.com/File:StrengthAv.png"
    },
    {
      "file": "forever.webp",
      "shows": "Forever",
      "originalFile": "Foreversmokinganime.png",
      "filePage": "https://jojowiki.com/File:Foreversmokinganime.png"
    },
    {
      "file": "hanged-man.webp",
      "shows": "Hanged Man",
      "originalFile": "Hanged Man Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Hanged_Man_Infobox_Anime.png"
    },
    {
      "file": "j-geil.webp",
      "shows": "J. Geil",
      "originalFile": "JGeil Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:JGeil_Infobox_Anime.png"
    },
    {
      "file": "empress.webp",
      "shows": "Empress",
      "originalFile": "Empress Anime01.png",
      "filePage": "https://jojowiki.com/File:Empress_Anime01.png"
    },
    {
      "file": "nena.webp",
      "shows": "Nena",
      "originalFile": "Nena Disguise Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Nena_Disguise_Infobox_Anime.png"
    },
    {
      "file": "wheel-of-fortune.webp",
      "shows": "Wheel of Fortune",
      "originalFile": "Woffullview.png",
      "filePage": "https://jojowiki.com/File:Woffullview.png"
    },
    {
      "file": "zz.webp",
      "shows": "ZZ",
      "originalFile": "ZZ Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:ZZ_Infobox_Anime.png"
    },
    {
      "file": "lovers.webp",
      "shows": "Lovers",
      "originalFile": "Lovers Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Lovers_Infobox_Anime.png"
    },
    {
      "file": "steely-dan.webp",
      "shows": "Steely Dan",
      "originalFile": "Steely Dan Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Steely_Dan_Infobox_Anime.png"
    },
    {
      "file": "sun.webp",
      "shows": "Sun",
      "originalFile": "Sun Desert.png",
      "filePage": "https://jojowiki.com/File:Sun_Desert.png"
    },
    {
      "file": "arabia-fats.webp",
      "shows": "Arabia Fats",
      "originalFile": "Arabia Fats Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Arabia_Fats_Infobox_Anime.png"
    },
    {
      "file": "death-thirteen.webp",
      "shows": "Death Thirteen",
      "originalFile": "Death Thirteen Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Death_Thirteen_Infobox_Anime.png"
    },
    {
      "file": "mannish-boy.webp",
      "shows": "Mannish Boy",
      "originalFile": "Mannish Boy Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Mannish_Boy_Infobox_Anime.png"
    },
    {
      "file": "geb.webp",
      "shows": "Geb",
      "originalFile": "Geb Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Geb_Infobox_Anime.png"
    },
    {
      "file": "ndoul.webp",
      "shows": "N'Doul",
      "originalFile": "N'Doul Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:N%27Doul_Infobox_Anime.png"
    },
    {
      "file": "bastet.webp",
      "shows": "Bastet",
      "originalFile": "Bastet Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Bastet_Infobox_Anime.png"
    },
    {
      "file": "mariah.webp",
      "shows": "Mariah",
      "originalFile": "Mariah Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Mariah_Infobox_Anime.png"
    },
    {
      "file": "tenore-sax.webp",
      "shows": "Tenore Sax (its illusion of DIO's mansion)",
      "originalFile": "Tenore Sax Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Tenore_Sax_Infobox_Anime.png"
    },
    {
      "file": "kenny-g.webp",
      "shows": "Kenny G.",
      "originalFile": "Kenny G. Infobox Anime.png",
      "filePage": "https://jojowiki.com/File:Kenny_G._Infobox_Anime.png"
    }
  ]
};
