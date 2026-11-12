/* global STOPS, L, CARD_CREDITS, STAND_PHOTO_CREDITS */
// STOPS comes from stops.js, L from the Leaflet script, and the credits from assets/*/credits.js;
// all load first
"use strict";

/* ==========================================================================
   50 Days to Cairo
   Behavior for the interactive journey map. Stop data lives in stops.js.
   1. Configuration
   2. State and page elements
   3. Helpers
   4. Map
   5. Stand encounters
   6. Journal panel
   7. Live data
   8. Your position and sharing
   9. Journey flow
   10. Start-up
   ========================================================================== */

/* 1. Configuration
   ========================================================================== */

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";
const WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/";
// Wikimedia asks browser apps to identify themselves with this header
const WIKI_HEADERS = { "Api-User-Agent": "FiftyDaysToCairo/1.0 (student fan project)" };
const COUNTRY_API_URL = "https://countries.trevorblades.com/graphql";
const COUNTRY_QUERY =
  "query Country($code: ID!) { country(code: $code) { name emoji currency languages { name } } }";
const FLAG_URL = "https://flagcdn.com/";
const TAROT_API_URL = "https://tarotapi.dev/api/v1/cards/";
const GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search";

const TOTAL_DAYS = 50;
const LAST_STOP_INDEX = STOPS.length - 1;
const DIO_MANSION = STOPS[LAST_STOP_INDEX].coords; // DIO waits in Cairo, the last stop
// A location up to 10 minutes old is fine for distances measured in thousands of km
const GEOLOCATION_OPTIONS = { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 };

const MAP_PADDING = [40, 40];
const MARKER_SIZE = 32;
const AMBUSH_MARKER_SIZE = 18;
// The Joestar star, the same shape as the favicon (24 × 24 viewBox)
const STAR_PATH = "M12 2l2.9 6.9 7.1.4-5.5 4.7 1.7 7-6.2-3.7-6.2 3.7 1.7-7L2 9.3l7.1-.4z";
const STOP_ZOOM = 6;
const FLY_DURATION_S = 1.2; // Leaflet animation durations are in seconds
const ROUTE_DRAW_MS = 1600;
const FLIP_HALF_MS = 230; // each half of turning a card over: back edge-on, then face in
const BURST_MS = 1000; // the color burst and ゴゴゴゴ after a card turns over
const REVEAL_ALL_GAP_MS = 250; // Reveal all turns cards over one after another
const VOID_MS = 800; // Cream's void: it swallows the face-down card, then opens onto the face
const CAPTION_MS = 3000; // a Stand's name flashing across the screen as its card turns over
const CAPTION_PHOTO_MIN_PX = 56; // on a short screen the flash's photo shrinks to fit, but no smaller
const TIME_STOP_SPREAD_MS = 500; // The World's sphere spreading over the page, and pulling back
const TIME_STOP_HOLD_MS = 3000; // how long time stays stopped before the ending
const SOURCES_AT_ONCE = 3; // the Sources dialog looks up Wikipedia's image credits a few at a time

// Stand stat charts: the six ratings, clockwise from the top in the order JoJo's charts use
const STAT_AXES = [
  { key: "power", label: "Power" },
  { key: "speed", label: "Speed" },
  { key: "range", label: "Range" },
  { key: "durability", label: "Durability" },
  { key: "precision", label: "Precision" },
  { key: "potential", label: "Potential" },
];
const STAT_GRADES = { A: 5, B: 4, C: 3, D: 2, E: 1 }; // how many rings out each grade sits
const STAT_CHART_RADIUS = 60; // the A ring, in the chart's own units
const SVG_NS = "http://www.w3.org/2000/svg";
const EARTH_RADIUS_KM = 6371;
const FETCH_TIMEOUT_MS = 10000;
// The tarot API's free host sleeps when idle, so its first answer can take a while
const TAROT_TIMEOUT_MS = 30000;
const CLOCK_TICK_MS = 1000; // the clock shows seconds, so the time stop visibly freezes it
const PLACE_SUMMARY_SENTENCES = 3;
const DISH_DESCRIPTION_SENTENCES = 1;
const VIEWER_IMAGE_PX = 1280; // the photo viewer swaps in a copy of a Wikipedia photo up to this wide
const GOD_SUMMARY_SENTENCES = 2;

const ENCOUNTER_LABELS = {
  tarot: "tarot card",
  god: "Egyptian god",
  stand: "Stand not of the Arcana",
};

// WMO weather codes used by Open-Meteo
const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Light freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Violent showers",
  85: "Light snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

const MESSAGES = {
  todo: "TODO: not written yet",
  todoEncounter: "TODO: encounter not recorded yet",
  mapLibraryFailed:
    "The atlas never made it into the luggage (the map couldn't load). Your journal still works, so check your connection and reload to bring the map back.",
  tilesFailed:
    "Some pages of the atlas are missing (map tiles didn't load). The route is still marked, so try reloading if the map stays blank.",
  weatherLoading: "Checking the skies…",
  weatherFailed:
    "The weather report never arrived. An enemy Stand may have cut the telegraph line. (Weather and local time couldn't load.)",
  placeLoading: "Leafing through the guidebook…",
  placeFailed:
    "The guidebook pages for this place are stuck together. (The Wikipedia summary couldn't load.)",
  dishLoading: "Reading the menu…",
  dishFailed: "The kitchen is closed for now. (This dish's photo and description couldn't load.)",
  viewPhotoOf: (name) => `View photo of ${name} full screen`,
  photoLoading: "Loading the full-size photo…",
  godLoading: "Consulting the temple archives…",
  godFailed: "The temple archives are sealed for now. (This god's Wikipedia summary couldn't load.)",
  wikiTitleTodo: "TODO: add the Wikipedia title (wikiTitle in stops.js) to show a summary here.",
  wikiDisambiguation: (title) =>
    `The archives list several pages called “${title}”. TODO: use the exact Wikipedia article title in stops.js.`,
  wikiMissing: (title) =>
    `The archives have no page called “${title}”. TODO: check the Wikipedia title in stops.js.`,
  wikiNoExtract: "Wikipedia has no short summary for this page.",
  countryLoading: "Checking passports at the border…",
  countryFailed: "The border office is closed for now. (Country details couldn't load.)",
  countryCodeTodo: "TODO: add the country code (countryCode in stops.js) to show country details.",
  tarotLoading: "Shuffling the deck…",
  tarotFailed: "The cards refuse to be read right now. (The tarot meaning couldn't load.)",
  tarotCodeTodo: "TODO: add the card's tarot API code (code in stops.js) to show its meaning.",
  tarotCodeInvalid: (code) =>
    `“${code}” isn't a tarot card code. TODO: use ar00 to ar21 (see the table in stops.js).`,
  tarotMissing: (code) => `The deck has no card “${code}”. TODO: check the code in stops.js.`,
  tarotWaiteName: (name) => `In Waite's deck: ${name}`,
  positionLocating: "Looking for you on the map…",
  positionDenied:
    "Your position is a mystery, like a Stand user in hiding (location access was blocked). Type your city instead.",
  positionUnavailable:
    "The compass is spinning (your location couldn't be found). Type your city instead.",
  positionTimeout: "Finding you took too long. Type your city instead.",
  positionUnsupported: "This browser can't share its location. Type your city instead.",
  cityTooShort: "Type at least two letters of your city's name.",
  citySearching: (city) => `Searching the atlas for “${city}”…`,
  cityNotFound: (city) =>
    `The atlas has no place called “${city}”. Check the spelling and try again.`,
  cityFailed:
    "The atlas is out of reach right now (the city search couldn't load). Press Find to try again.",
  distanceFromDio: (distance) => `You are ${distance} from DIO`,
  measuredFromDevice: "measured from your current location",
  measuredFromPlace: (place) => `measured from ${place}`,
  distanceToStop: (distance) => `${distance} from you`,
  shareText: (distance) =>
    `I'm ${distance} from DIO's mansion in Cairo. How far are you? (50 Days to Cairo)`,
  shareShared: "Shared!",
  shareCopied: "Copied to your clipboard. Paste it anywhere to share.",
  countryUnknown: (code) =>
    `The border office has no record of a country “${code}”. TODO: check countryCode in stops.js.`,
  newTab: " (opens in a new tab)",
  sourceLoading: (name) => `${name}: looking it up…`,
  sourceFailed: (name) => `${name}: the article's details couldn't load.`,
  viewFullScreen: "View full screen: ",
  rollCallFaceDown: "A face-down card: ",
  rollCallJoinsAt: (place) => (place.kind === "stop" ? `Joins in ${place.stop.name}` : `Joins on the way to ${place.to.name}`),
  timeStopped: "Time has stopped.",
  timeResumed: "Time moves again.",
};

/* 2. State and page elements
   ========================================================================== */

// The journey place by place: every stop, with the ambushes on the way to it just before it
const PLACES = buildPlaces();
const LAST_PLACE_INDEX = PLACES.length - 1;

const state = {
  reachedIndex: 0, // furthest place (stop or ambush) reached so far
  viewingIndex: 0, // place currently shown in the journal
  isTraveling: false, // true while the route animation is running
  travelerPosition: null, // { coords: [lat, lng], place } once known; place is null for the device's location
  isLocating: false, // true while the browser looks up the traveler's location
  revealed: new Set(), // encounters turned face up, as "placeIndex:encounterIndex"
  isRevealingAll: false,
  isTimeStopped: false, // true during The World's time stop before the ending
  hasOpenedCardView: false, // the "tap a card" hint goes away once a card has been read
  cardView: null, // while the card view is open: { cards: [encounters], position, opener }
  photoViewerOpener: null, // the photo that opened the full-screen photo viewer
  rollCall: null, // while the roll call is open: { members, dealt }
};

const elements = {
  mapNotice: document.querySelector("#map-notice"),
  dayNumber: document.querySelector("#day-number"),
  entryMeta: document.querySelector("#entry-meta"),
  entryName: document.querySelector("#entry-name"),
  entryWhere: document.querySelector("#entry-where"),
  stopSections: document.querySelectorAll(".entry__section--stop"),
  entryHeader: document.querySelector(".entry__header"),
  entryMenace: document.querySelector("#entry-menace"),
  revealAllButton: document.querySelector("#reveal-all"),
  encounterBackTemplate: document.querySelector("#encounter-back-template"),
  cardHint: document.querySelector("#card-hint"),
  stampCounter: document.querySelector("#stamp-counter"),
  stampCounterCount: document.querySelector(".stamp-counter__count"),
  stampCounterLabel: document.querySelector("#stamp-counter-label"),
  standCaption: document.querySelector("#stand-caption"),
  standCaptionPhoto: document.querySelector(".stand-caption__photo"),
  photoViewer: document.querySelector("#photo-viewer"),
  photoViewerTitle: document.querySelector("#photo-viewer-title"),
  photoViewerPhoto: document.querySelector("#photo-viewer-photo"),
  photoViewerStatus: document.querySelector("#photo-viewer-status"),
  photoViewerClose: document.querySelector("#photo-viewer-close"),
  rollCall: document.querySelector("#roll-call"),
  rollCallKicker: document.querySelector(".roll-call__kicker"),
  rollCallList: document.querySelector("#roll-call-list"),
  rollCallStatus: document.querySelector("#roll-call-status"),
  rollCallSkip: document.querySelector("#roll-call-skip"),
  rollCallDeal: document.querySelector("#roll-call-deal"),
  rollCallMemberTemplate: document.querySelector("#roll-call-member-template"),
  sources: document.querySelector("#sources"),
  sourcesButton: document.querySelector("#sources-button"),
  sourcesHeading: document.querySelector("#sources-heading"),
  sourcesWiki: document.querySelector("#sources-wiki"),
  sourcesJojo: document.querySelector("#sources-jojo"),
  cardView: document.querySelector("#card-view"),
  cardViewTitle: document.querySelector("#card-view-title"),
  cardViewCount: document.querySelector("#card-view-count"),
  cardViewCard: document.querySelector("#card-view-card"),
  cardViewFront: document.querySelector("#card-view-front"),
  cardViewBack: document.querySelector("#card-view-back"),
  cardViewDossier: document.querySelector("#card-view-dossier"),
  cardViewSide: document.querySelector("#card-view-side"),
  cardViewPrev: document.querySelector("#card-view-prev"),
  cardViewNext: document.querySelector("#card-view-next"),
  cardViewTurn: document.querySelector("#card-view-turn"),
  cardViewClose: document.querySelector("#card-view-close"),
  entryDistance: document.querySelector("#entry-distance"),
  positionStatus: document.querySelector("#position-status"),
  locateButton: document.querySelector("#locate-button"),
  cityToggle: document.querySelector("#city-toggle"),
  cityForm: document.querySelector("#city-form"),
  cityInput: document.querySelector("#city-input"),
  shareButton: document.querySelector("#share-button"),
  shareStatus: document.querySelector("#share-status"),
  shareFallback: document.querySelector("#share-fallback"),
  shareText: document.querySelector("#share-text"),
  entry: document.querySelector(".entry"),
  dishSection: document.querySelector("#dish-section"),
  dishName: document.querySelector("#dish-name"),
  dishPanel: document.querySelector("#dish-panel"),
  dishNote: document.querySelector("#dish-note"),
  weatherPanel: document.querySelector("#weather-panel"),
  placePanel: document.querySelector("#place-panel"),
  countryPanel: document.querySelector("#country-panel"),
  encounterList: document.querySelector("#encounter-list"),
  encountersEmpty: document.querySelector("#encounters-empty"),
  nextButton: document.querySelector("#next-button"),
  collection: document.querySelector("#collection"),
  crusaderStamps: document.querySelector("#crusader-stamps"),
  crusaderStampsEmpty: document.querySelector("#crusader-stamps-empty"),
  tarotStamps: document.querySelector("#tarot-stamps"),
  tarotStampsEmpty: document.querySelector("#tarot-stamps-empty"),
  godStamps: document.querySelector("#god-stamps"),
  godStampsEmpty: document.querySelector("#god-stamps-empty"),
  standStamps: document.querySelector("#stand-stamps"),
  standStampsEmpty: document.querySelector("#stand-stamps-empty"),
  unrecordedStamps: document.querySelector("#unrecorded-stamps"),
  unrecordedStampsGroup: document.querySelector("#unrecorded-stamps-group"),
  announcer: document.querySelector("#announcer"),
  timeStop: document.querySelector("#time-stop"),
  pageRegions: document.querySelectorAll("body > header, body > main, body > footer"),
  intro: document.querySelector("#intro"),
  ending: document.querySelector("#ending"),
  endingDay: document.querySelector("#ending-day"),
  endingStops: document.querySelector("#ending-stops"),
  endingDistance: document.querySelector("#ending-distance"),
  endingTarot: document.querySelector("#ending-tarot"),
  endingGods: document.querySelector("#ending-gods"),
  endingStands: document.querySelector("#ending-stands"),
  spreadCardTemplate: document.querySelector("#spread-card-template"),
  dossierTemplate: document.querySelector("#dossier-template"),
  statsTemplate: document.querySelector("#stats-template"),
  stampTemplate: document.querySelector("#stamp-template"),
  loadingTemplate: document.querySelector("#loading-template"),
  errorTemplate: document.querySelector("#error-template"),
  weatherTemplate: document.querySelector("#weather-template"),
  wikiTemplate: document.querySelector("#wiki-template"),
  countryTemplate: document.querySelector("#country-template"),
  dishTemplate: document.querySelector("#dish-template"),
  tarotTemplate: document.querySelector("#tarot-template"),
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* 3. Helpers
   ========================================================================== */

/** True if a value from stops.js hasn't been written yet. */
function isTodo(value) {
  return typeof value !== "string" || value.trim().toUpperCase().startsWith("TODO");
}

/** Puts a stops.js value into an element, or a visible TODO note if it's missing. */
function fillText(element, value) {
  const missing = isTodo(value);
  element.textContent = missing ? MESSAGES.todo : value;
  element.classList.toggle("is-todo", missing);
}

/** Makes a copy of a <template>'s first element. */
function cloneTemplate(template) {
  return template.content.firstElementChild.cloneNode(true);
}

/** Converts a tarot API code like "ar07" into the card's Roman numeral ("VII"). */
function tarotNumeral(code) {
  const match = /^ar(\d{2})$/.exec(code);
  if (!match) return "?";

  let number = Number(match[1]);
  if (number === 0) return "0"; // The Fool

  const numerals = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let roman = "";
  for (const [value, numeral] of numerals) {
    while (number >= value) {
      roman += numeral;
      number -= value;
    }
  }
  return roman;
}

/** Distance in km between two [lat, lng] points, using the haversine formula. */
function distanceKm([lat1, lng1], [lat2, lng2]) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function formatKm(km) {
  return `${Math.round(km).toLocaleString()} km`;
}

/** Length of the whole route, adding up each leg from place to place. */
function routeLengthKm() {
  return PLACES.slice(1).reduce(
    (total, place, index) => total + distanceKm(PLACES[index].coords, place.coords),
    0
  );
}

/** Joins the sentences of an announcement, skipping any that came out empty. */
function joinSentences(...sentences) {
  return sentences.filter(Boolean).join(" ");
}

/** "A, B and C", for announcing several names at once. */
function formatList(items) {
  return new Intl.ListFormat("en", { type: "conjunction" }).format(items);
}

function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

function setAriaCurrent(element, isCurrent) {
  if (isCurrent) {
    element.setAttribute("aria-current", "true");
  } else {
    element.removeAttribute("aria-current");
  }
}

/** Resolves after a pause. */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Tells screen reader users about changes they can't see happen. */
function announce(message) {
  elements.announcer.textContent = message;
}

/* Places on the journey */

/** The objects in a stops.js list. A missing list counts as empty, and stray non-objects are skipped. */
function listEntries(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((entry) => typeof entry === "object" && entry !== null);
}

function isLatLng(value) {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
}

/**
 * Where an ambush happened: its own coordinates if stops.js gives them, otherwise its
 * fraction of the way along the leg (the middle if that's missing too). The fraction is
 * measured in map (Mercator) space, so the point sits on the straight line the map draws.
 */
function ambushCoords(entry, from, to) {
  if (isLatLng(entry.at)) return entry.at;

  const fraction = Number.isFinite(entry.along) ? Math.min(Math.max(entry.along, 0), 1) : 0.5;
  const mercatorY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const y = mercatorY(from[0]) + (mercatorY(to[0]) - mercatorY(from[0])) * fraction;
  return [(Math.atan(Math.exp(y)) * 360) / Math.PI - 90, from[1] + (to[1] - from[1]) * fraction];
}

/**
 * Lays the journey out as one list of places: every stop, with the ambushes on the way to
 * it (its enRoute list) just before it. Ambush entries in a row with the same "where" and
 * position become one ambush with several cards.
 */
function buildPlaces() {
  const places = [];

  STOPS.forEach((stop, stopIndex) => {
    const from = STOPS[stopIndex - 1];
    if (from) {
      for (const entry of listEntries(stop.enRoute)) {
        const coords = ambushCoords(entry, from.coords, stop.coords);
        const last = places.at(-1);
        const sameAmbush =
          last.kind === "ambush" && last.where === entry.where && last.coords.every((value, i) => value === coords[i]);

        if (sameAmbush) {
          last.encounters.push(entry);
          last.allies.push(...listEntries(entry.allies));
        } else {
          places.push({
            kind: "ambush",
            from,
            to: stop,
            day: Number.isInteger(entry.day) ? entry.day : null,
            where: entry.where,
            coords,
            encounters: [entry],
            allies: listEntries(entry.allies),
          });
        }
      }
    }
    places.push({
      kind: "stop",
      stop,
      stopIndex,
      coords: stop.coords,
      encounters: listEntries(stop.encounters),
      allies: listEntries(stop.allies),
    });
  });
  return places;
}

/** "Hong Kong", or for an ambush, "Ambush on the way to Hong Kong". */
function placeName(place) {
  return place.kind === "stop" ? place.stop.name : `Ambush on the way to ${place.to.name}`;
}

/** The stop a place belongs to: the stop itself, or the one an ambush is on the way to. */
function destinationOf(place) {
  return place.kind === "stop" ? place.stop : place.to;
}

/**
 * The day of the countdown at a place. An ambush has its own day when the story dates it;
 * otherwise it keeps the day it set out.
 */
function dayAt(place) {
  if (place.kind === "stop") return place.stop.day;
  return place.day ?? place.from.day;
}

/* 4. Map
   ========================================================================== */

const markers = []; // one per place, in journey order
let map;
let traveledLine; // the Hermit Purple vine along the route traveled so far
let traveledThorns; // its thorns: a second, wider line with sparse dashes
let isMapMoving = false; // true while the map pans, zooms, or flies

/** Shows a message over the map, for when the map library or tiles fail. */
function showMapNotice(message) {
  elements.mapNotice.textContent = message;
  elements.mapNotice.hidden = false;
}

/** Creates the Leaflet map with OpenStreetMap tiles. */
function initMap() {
  map = L.map("map", { zoomSnap: 0.25 });

  const tiles = L.tileLayer(TILE_URL, {
    maxZoom: 19,
    attribution: TILE_ATTRIBUTION,
  });

  // A failed tile fires once per tile, so only show the notice the first time
  tiles.once("tileerror", () => showMapNotice(MESSAGES.tilesFailed));
  tiles.addTo(map);

  // Leaflet measures its container only on window resizes, so also re-measure
  // whenever the page layout changes the map's size
  new ResizeObserver(() => map.invalidateSize()).observe(map.getContainer());

  // The time stop needs to know whether the map is mid-flight
  map.on("movestart", () => {
    isMapMoving = true;
  });
  map.on("moveend", () => {
    isMapMoving = false;
  });
}

/** Coordinates of the route from Tokyo up to and including the given place. */
function routeUpTo(index) {
  return PLACES.slice(0, index + 1).map((place) => place.coords);
}

/** Draws the whole planned route faintly, plus a Hermit Purple vine for the part traveled. */
function drawRoute() {
  const plannedLine = L.polyline(routeUpTo(LAST_PLACE_INDEX), {
    className: "route-line route-line--planned",
    interactive: false,
  }).addTo(map);

  traveledLine = L.polyline(routeUpTo(state.reachedIndex), {
    className: "route-line route-line--vine",
    interactive: false,
  }).addTo(map);
  traveledThorns = L.polyline(routeUpTo(state.reachedIndex), {
    className: "route-line route-line--thorns",
    interactive: false,
  }).addTo(map);

  map.fitBounds(plannedLine.getBounds(), { padding: MAP_PADDING });
}

/** Sets the traveled route: the vine and its thorns always follow the same points. */
function setTraveledRoute(latLngs) {
  if (!traveledLine) return;
  traveledLine.setLatLngs(latLngs);
  traveledThorns.setLatLngs(latLngs);
}

/** Builds a stop's marker: a Joestar star with the stop number (a dashed circle while locked). */
function createStopIcon(stopNumber) {
  const half = MARKER_SIZE / 2;

  return L.divIcon({
    className: "stop-marker",
    html: `<span class="stop-marker__pin"><svg class="stop-marker__star" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${STAR_PATH}"/></svg><span class="stop-marker__number">${stopNumber}</span></span>`,
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [half, half],
    tooltipAnchor: [0, -half],
  });
}

/** An ambush point's marker: a small red diamond, shown only once the ambush is reached. */
function createAmbushIcon() {
  const half = AMBUSH_MARKER_SIZE / 2;

  return L.divIcon({
    className: "ambush-marker",
    html: '<span class="ambush-marker__pin"></span>',
    iconSize: [AMBUSH_MARKER_SIZE, AMBUSH_MARKER_SIZE],
    iconAnchor: [half, half],
    tooltipAnchor: [0, -half],
  });
}

/** Adds a marker for each place: numbered stars for stops, diamonds for ambushes. Reached places can be reopened. */
function addPlaceMarkers() {
  PLACES.forEach((place, index) => {
    const icon = place.kind === "stop" ? createStopIcon(place.stopIndex + 1) : createAmbushIcon();
    const marker = L.marker(place.coords, { icon })
      .bindTooltip(placeName(place), { direction: "top", className: "stop-tooltip" })
      .addTo(map);

    marker.on("click", () => revisitPlace(index));

    // Leaflet makes markers focusable buttons but doesn't activate them from the keyboard
    marker.getElement().addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        revisitPlace(index);
      }
    });

    markers.push(marker);
  });
}

/** What a marker is called: "Stop 2: Hong Kong", or "Ambush on the way to Hong Kong: On the plane". */
function describeMarker(place, isLocked) {
  if (place.kind === "ambush") return `${placeName(place)}: ${place.where}`;
  const stopNumber = place.stopIndex + 1;
  return isLocked ? `Stop ${stopNumber}: not reached yet` : `Stop ${stopNumber}: ${place.stop.name}`;
}

/** Marks each marker as locked, reached, or currently being viewed. Locked ambushes stay hidden. */
function updateMarkers() {
  markers.forEach((marker, index) => {
    const place = PLACES[index];
    const element = marker.getElement();
    const isLocked = index > state.reachedIndex;
    const isCurrent = index === state.viewingIndex;

    element.classList.toggle("is-locked", isLocked);
    element.classList.toggle("is-current", isCurrent);
    element.tabIndex = isLocked ? -1 : 0;
    element.setAttribute("aria-disabled", String(isLocked));
    element.setAttribute("aria-label", describeMarker(place, isLocked));
    if (place.kind === "ambush") element.setAttribute("aria-hidden", String(isLocked));
    setAriaCurrent(element, isCurrent);
    marker.setZIndexOffset(isCurrent ? 1000 : 0);
    marker.setTooltipContent(describePlaceForTooltip(place));
  });
}

/** A marker's tooltip: the place's name, plus its distance from the traveler once that's known. */
function describePlaceForTooltip(place) {
  const name = place.kind === "stop" ? place.stop.name : `Ambush: ${place.where}`;
  if (!state.travelerPosition) return name;
  return `${name} · ${MESSAGES.distanceToStop(formatKm(distanceKm(state.travelerPosition.coords, place.coords)))}`;
}

/** Stops the map right where it is. Returns true if it was moving, so the move can finish later. */
function freezeMap() {
  if (!map || !isMapMoving) return false;
  map.setView(map.getCenter(), map.getZoom(), { animate: false }); // cancels the flight mid-air
  return true;
}

/** Flies the map to a place, or jumps straight there if the user prefers less motion. */
function flyToPlace(index) {
  if (!map) return;

  map.flyTo(PLACES[index].coords, STOP_ZOOM, {
    animate: !reducedMotion.matches,
    duration: FLY_DURATION_S,
  });
}

/** Flies the map to show a whole leg of the trip. Resolves when the map stops moving. */
function flyToLeg(fromIndex, toIndex) {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(fallbackTimer);
      map.off("moveend", finish);
      resolve();
    };

    // Dragging the map mid-flight cancels the flight, so don't wait on moveend forever
    const fallbackTimer = setTimeout(finish, FLY_DURATION_S * 1000 + 500);
    map.on("moveend", finish);
    map.flyToBounds([PLACES[fromIndex].coords, PLACES[toIndex].coords], {
      padding: MAP_PADDING,
      duration: FLY_DURATION_S,
    });
  });
}

/** Extends the traveled line from one place to the next, a little more each frame. */
function drawLeg(fromIndex, toIndex) {
  return new Promise((resolve) => {
    // Interpolating in projected (Mercator) space keeps the growing line straight on screen
    const crs = L.CRS.EPSG3857;
    const start = crs.project(L.latLng(PLACES[fromIndex].coords));
    const end = crs.project(L.latLng(PLACES[toIndex].coords));
    const traveledSoFar = routeUpTo(fromIndex);
    let startTime;

    function frame(now) {
      startTime ??= now;
      const progress = Math.min((now - startTime) / ROUTE_DRAW_MS, 1);
      const tip = crs.unproject(start.add(end.subtract(start).multiplyBy(easeInOutCubic(progress))));
      setTraveledRoute([...traveledSoFar, tip]);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

/* 5. Stand encounters
   ========================================================================== */

/**
 * Sorts an encounter into "tarot", "god", or "stand" once its type and name are filled in.
 * Anything else (a TODO placeholder, a missing name, an unknown type) is "unrecorded".
 */
function encounterKind(encounter) {
  const hasKnownType = encounter.type in ENCOUNTER_LABELS;
  return hasKnownType && !isTodo(encounter.name) ? encounter.type : "unrecorded";
}

/** Identifies one encounter at one place, for remembering which cards are face up. */
function encounterKey(placeIndex, encounterIndex) {
  return `${placeIndex}:${encounterIndex}`;
}

function isRevealed(placeIndex, encounterIndex) {
  return state.revealed.has(encounterKey(placeIndex, encounterIndex));
}

/** The first card at a place still face down (story order), or -1 once they're all face up. */
function nextFaceDown(placeIndex) {
  return PLACES[placeIndex].encounters.findIndex((_, encounterIndex) => !isRevealed(placeIndex, encounterIndex));
}

/**
 * Every stamp there is to collect, in story order: each ally's tarot card as they join
 * (collected on arriving where they join), and each Stand met. Rematches add no stamp.
 */
function allStamps() {
  return PLACES.flatMap((place, placeIndex) => [
    ...place.allies.map((card, allyIndex) => ({ card, placeIndex, key: `${placeIndex}:ally${allyIndex}`, isAlly: true })),
    ...place.encounters
      .map((card, encounterIndex) => ({ card, placeIndex, key: encounterKey(placeIndex, encounterIndex), encounterIndex }))
      .filter(({ card }) => !card.rematch),
  ]);
}

function isCollected(stamp) {
  return stamp.isAlly ? stamp.placeIndex <= state.reachedIndex : isRevealed(stamp.placeIndex, stamp.encounterIndex);
}

/** How many cards of a kind there are to collect on the whole journey (e.g. all 22 tarot cards). */
function countCards(kind) {
  return allStamps().filter(({ card }) => encounterKind(card) === kind).length;
}

/** How many cards of a kind the traveler has collected so far. */
function countCollected(kind) {
  return allStamps().filter((stamp) => encounterKind(stamp.card) === kind && isCollected(stamp)).length;
}

/** "Stamp collected, 12 of 33." after new stamps arrive (nothing if none did). */
function describeStampsCollected(newStamps) {
  if (newStamps === 0) return "";
  const progress = `${allStamps().filter(isCollected).length} of ${allStamps().length}`;
  return newStamps === 1 ? `Stamp collected, ${progress}.` : `${newStamps} stamps collected, ${progress}.`;
}

/** A Crusader's stamp: an ally who joined without a fight, or a Stand user won over in one. */
function isCrusaderStamp(stamp) {
  return stamp.isAlly || Boolean(stamp.card.becomesAlly);
}

/** "Iggy joins the Crusaders.", for the allies who join at a place without a fight. */
function describeJoins(placeIndex) {
  const users = PLACES[placeIndex].allies.map((ally) => ally.standUser).filter((user) => !isTodo(user));
  if (users.length === 0) return "";
  return `${formatList(users)} ${users.length === 1 ? "joins" : "join"} the Crusaders.`;
}

/** One sentence describing a list of face-up encounters, for screen reader announcements. */
function describeEncounters(encounters) {
  const recorded = encounters.filter((encounter) => encounterKind(encounter) !== "unrecorded");
  const unrecordedCount = encounters.length - recorded.length;
  const sentences = [];

  if (recorded.length > 0) {
    const names = recorded
      .map((encounter) => `${encounter.name}, ${ENCOUNTER_LABELS[encounter.type]}`)
      .join("; ");
    sentences.push(`${pluralize(recorded.length, "Stand encounter")}: ${names}.`);
  }
  if (unrecordedCount > 0) {
    sentences.push(`${pluralize(unrecordedCount, "encounter")} not yet recorded.`);
  }
  return sentences.join(" ");
}

/** A place's encounters for an announcement: the face-up ones by name, the rest only counted. */
function describePlaceEncounters(placeIndex) {
  const encounters = PLACES[placeIndex].encounters;
  if (encounters.length === 0) return "No Stand encounters recorded here.";

  const faceUp = encounters.filter((_, encounterIndex) => isRevealed(placeIndex, encounterIndex));
  const faceDown = encounters.length - faceUp.length;
  const sentences = [];

  if (faceUp.length > 0) sentences.push(describeEncounters(faceUp));
  if (faceDown > 0) sentences.push(`${pluralize(faceDown, "encounter")} waiting face down.`);
  return sentences.join(" ");
}

/** "The Chariot, tarot card", or a plain description for an encounter still to be written. */
function describeReveal(encounter) {
  if (encounterKind(encounter) === "unrecorded" && isTodo(encounter.name)) {
    return "an encounter that isn't recorded yet";
  }
  const rematch = encounter.rematch ? ", a rematch" : "";
  return `${encounter.name}, ${ENCOUNTER_LABELS[encounter.type] ?? "encounter"}${rematch}`;
}

/** " Stand: Silver Chariot, used by Jean Pierre Polnareff." with whatever's filled in. */
function describeStand(encounter) {
  const stand = isTodo(encounter.stand) ? null : encounter.stand;
  const user = isTodo(encounter.standUser) ? null : encounter.standUser;

  const end = (name) => (name.endsWith(".") ? name : `${name}.`); // "Kenny G." already ends one

  if (stand && user) return ` Stand: ${stand}, used by ${end(user)}`;
  if (stand) return ` Stand: ${end(stand)}`;
  if (user) return ` Stand user: ${end(user)}`;
  return "";
}

/**
 * Alt text for card art: "The Chariot tarot card art from JoJo's Bizarre Adventure", or for a
 * Stand outside the deck, "Cream from JoJo's Bizarre Adventure". stops.js can give its own.
 */
function describeCardArt(encounter) {
  if (!isTodo(encounter.imageAlt)) return encounter.imageAlt;
  if (isTodo(encounter.name)) return "Card art from JoJo's Bizarre Adventure";
  if (encounter.type === "stand") return `${encounter.name} from JoJo's Bizarre Adventure`;

  const cardType = { tarot: "tarot card", god: "Egyptian god card" }[encounter.type] ?? "card";
  return `${encounter.name} ${cardType} art from JoJo's Bizarre Adventure`;
}

/** A card-shaped blank, for an encounter with no art (or art that failed to load). */
function createBlankArt() {
  const blank = document.createElement("span");
  blank.className = "card-art card-art--blank";
  blank.setAttribute("aria-hidden", "true");
  blank.innerHTML = `<svg viewBox="0 0 24 24" focusable="false"><path d="${STAR_PATH}"/></svg>`;
  return blank;
}

/** The large version of a card file (assets/cards/large/), kept for the card view. */
function largeImagePath(path) {
  return path.replace(/^assets\/cards\//, "assets/cards/large/");
}

/**
 * The encounter's card art: its image, or for a Stand outside the tarot and gods, its
 * picture in a card frame of its own, like an extra card that isn't part of the deck.
 * Missing or broken art becomes a blank card. `large` starts with the journal-size image
 * (usually already loaded) and swaps in the large one once it arrives.
 */
function createCardArt(encounter, { large = false } = {}) {
  if (isTodo(encounter.image)) return createBlankArt();

  const image = document.createElement("img");
  image.src = encounter.image;
  image.alt = describeCardArt(encounter);
  image.decoding = "async";

  let art = image;
  if (encounter.type === "stand") {
    const label = document.createElement("span");
    const name = document.createElement("span");
    label.className = "stand-card__label";
    label.textContent = "Not of the Arcana";
    name.className = "stand-card__name";
    name.textContent = encounter.name;
    // The frame's lettering repeats the card's own text, so only the picture is read out
    label.setAttribute("aria-hidden", "true");
    name.setAttribute("aria-hidden", "true");
    art = document.createElement("div");
    art.className = "stand-card";
    image.className = "stand-card__image";
    art.append(label, image, name);
  }

  art.classList.add("card-art");
  image.addEventListener("error", () => art.replaceWith(createBlankArt()));

  if (large) {
    art.classList.add("is-sharpening");
    const sharp = new Image();
    sharp.src = largeImagePath(encounter.image);
    sharp
      .decode()
      .then(() => {
        image.src = sharp.src;
      })
      .catch(() => {}) // the journal-size image stays
      .finally(() => art.classList.remove("is-sharpening"));
  }
  return art;
}

/* Stand photos */

/**
 * The encounter's anime still: one frame of the Stand with its user, or for a Stand never
 * shown with its user, two frames side by side like manga panels (the Stand, then the user).
 * `tag` is the element that holds the frames. A frame whose image is missing or won't load
 * is dropped, and once none are left `onEmpty` runs, which by default removes the photo.
 * Returns null when stops.js gives no photo.
 */
function createStandPhoto(encounter, { tag = "span", onEmpty = (photo) => photo.remove() } = {}) {
  const stills = [
    [encounter.photo, encounter.photoAlt],
    [encounter.photo2, encounter.photo2Alt],
  ].filter(([source]) => !isTodo(source));
  if (stills.length === 0) return null;

  const photo = document.createElement(tag);
  photo.className = "stand-photo";
  photo.classList.toggle("stand-photo--split", stills.length === 2);

  stills.forEach(([source, alt]) => {
    const frame = document.createElement("span");
    const image = document.createElement("img");
    frame.className = "stand-photo__frame";
    image.className = "stand-photo__image";
    image.src = source;
    image.alt = isTodo(alt) ? "" : alt;
    image.decoding = "async";
    image.addEventListener("error", () => {
      frame.remove();
      const framesLeft = photo.querySelectorAll(".stand-photo__frame").length;
      photo.classList.toggle("stand-photo--split", framesLeft === 2);
      if (framesLeft === 0) onEmpty(photo);
    });
    frame.append(image);
    photo.append(frame);
  });
  return photo;
}

/** Starts loading a place's Stand photos, so each is ready to flash up as its card turns over. */
function preloadStandPhotos(placeIndex) {
  PLACES[placeIndex].encounters
    .flatMap((encounter) => [encounter.photo, encounter.photo2])
    .filter((source) => !isTodo(source))
    .forEach((source) => {
      new Image().src = source;
    });
}

/** "Silver Chariot · Jean Pierre Polnareff", naming whatever's filled in. */
function describeStandAndUser(encounter) {
  const stand = encounter.type === "stand" ? encounter.name : encounter.stand;
  return [stand, encounter.standUser].filter((name) => !isTodo(name)).join(" · ");
}

/* Stand stat charts */

/**
 * Reads an encounter's six ratings, or returns null unless every one is filled in.
 * Each keeps its value exactly as written, plus how it's plotted: a letter grade A–E,
 * "∞" (beyond A), "None" (at the centre), or anything else, like "?", as unknown.
 */
function readStats(stats) {
  if (typeof stats !== "object" || stats === null) return null;

  const values = STAT_AXES.map(({ key }) => stats[key]);
  if (values.some(isTodo)) return null;

  return STAT_AXES.map(({ label }, index) => {
    const text = values[index].trim();
    const grade = STAT_GRADES[text.toUpperCase()];
    let kind = "unknown";
    if (grade) kind = "grade";
    else if (text === "∞") kind = "infinite";
    else if (text.toLowerCase() === "none") kind = "none";
    return { index, label, text, kind, grade };
  });
}

/** How far out a rating sits, or null for an unknown value, which stays off the shape. */
function statRadius(stat) {
  if (stat.kind === "grade") return (STAT_CHART_RADIUS * stat.grade) / 5;
  if (stat.kind === "infinite") return STAT_CHART_RADIUS * 1.12;
  if (stat.kind === "none") return 0;
  return null;
}

/** A point on axis `index` (0 is the top, then clockwise), `radius` units from the centre. */
function chartPoint(index, radius) {
  const angle = ((index * 60 - 90) * Math.PI) / 180;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

function formatPoints(points) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

function svgElement(name, attributes, text) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([attribute, value]) => element.setAttribute(attribute, value));
  if (text !== undefined) element.textContent = text;
  return element;
}

/**
 * Draws the hexagonal stat chart. Letter grades make a solid shape; ∞ sits just past the
 * A ring and None at the centre, each with its own marker; unknown values like "?" stay
 * off the shape and get a dashed "?" marker on the middle ring. Any edge that touches ∞ or
 * None, or skips over an unknown, is dashed. The chart is decorative: the list beside it
 * gives the same ratings as text.
 */
function createStatChart(stats) {
  const svg = svgElement("svg", {
    class: "stats__chart",
    viewBox: "-95 -95 190 190",
    "aria-hidden": "true",
    focusable: "false",
  });
  const at = (stat) => chartPoint(stat.index, statRadius(stat));

  // Rings for grades E (inside) to A (outside), and the six axes
  for (let grade = 1; grade <= 5; grade++) {
    const ring = STAT_AXES.map((_, index) => chartPoint(index, (STAT_CHART_RADIUS * grade) / 5));
    svg.append(svgElement("polygon", { class: "stats__ring", points: formatPoints(ring) }));
  }
  STAT_AXES.forEach((_, index) => {
    const [x, y] = chartPoint(index, STAT_CHART_RADIUS);
    svg.append(svgElement("line", { class: "stats__axis", x1: 0, y1: 0, x2: x.toFixed(1), y2: y.toFixed(1) }));
  });

  // The shape and its edges
  const plotted = stats.filter((stat) => statRadius(stat) !== null);
  if (plotted.length >= 3) {
    svg.append(svgElement("polygon", { class: "stats__shape", points: formatPoints(plotted.map(at)) }));
  }
  const edgeCount = plotted.length >= 3 ? plotted.length : plotted.length - 1;
  for (let n = 0; n < edgeCount; n++) {
    const from = plotted[n];
    const to = plotted[(n + 1) % plotted.length];
    const skipsAnAxis = (to.index - from.index + 6) % 6 !== 1;
    const uncertain = from.kind !== "grade" || to.kind !== "grade" || skipsAnAxis;
    const [[x1, y1], [x2, y2]] = [at(from), at(to)];
    svg.append(
      svgElement("line", {
        class: uncertain ? "stats__edge stats__edge--uncertain" : "stats__edge",
        x1: x1.toFixed(1),
        y1: y1.toFixed(1),
        x2: x2.toFixed(1),
        y2: y2.toFixed(1),
      })
    );
  }

  // A dot for each grade, a distinct marker for ∞, None, and unknown values
  stats.forEach((stat) => {
    const [x, y] = stat.kind === "unknown" ? chartPoint(stat.index, STAT_CHART_RADIUS * 0.6) : at(stat);
    if (stat.kind === "grade") {
      svg.append(svgElement("circle", { class: "stats__point", cx: x.toFixed(1), cy: y.toFixed(1), r: 3 }));
      return;
    }
    svg.append(
      svgElement("circle", {
        class: `stats__special stats__special--${stat.kind}`,
        cx: x.toFixed(1),
        cy: y.toFixed(1),
        r: stat.kind === "none" ? 4.5 : 7,
      })
    );
    const symbol = { infinite: "∞", unknown: "?" }[stat.kind];
    if (symbol) {
      svg.append(svgElement("text", { class: "stats__symbol", x: x.toFixed(1), y: y.toFixed(1) }, symbol));
    }
  });

  // Each value, as written, at the end of its axis
  stats.forEach((stat) => {
    const [x, y] = chartPoint(stat.index, STAT_CHART_RADIUS + 26);
    svg.append(svgElement("text", { class: "stats__grade", x: x.toFixed(1), y: y.toFixed(1) }, stat.text));
  });

  return svg;
}

/** The stats figure: the chart, plus the six ratings written out in a list. */
function createStats(stats) {
  const figure = cloneTemplate(elements.statsTemplate);
  const list = figure.querySelector(".stats__list");

  figure.querySelector(".stats__body").prepend(createStatChart(stats));
  stats.forEach((stat) => {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const value = document.createElement("dd");
    item.className = `stats__item stats__item--${stat.kind}`;
    term.textContent = stat.label;
    value.textContent = stat.text;
    item.append(term, value);
    list.append(item);
  });
  return figure;
}

/** "View The Chariot card", the label of a face-up card in the spread. */
function describeSpreadCard(encounter) {
  const name = isTodo(encounter.name) ? "the unrecorded encounter" : `${encounter.name} card`;
  return `View ${name}${encounter.rematch ? ", a rematch" : ""}`;
}

/**
 * A face-up card in the spread: its art, its name, and "Rematch" if it is one. It's a
 * button that opens the card view, where everything else about the Stand lives.
 */
function createSpreadCard(encounter, encounterIndex) {
  const item = cloneTemplate(elements.spreadCardTemplate);
  const button = item.querySelector(".spread-card");
  const name = item.querySelector(".spread-card__name");

  button.classList.add(`spread-card--${encounterKind(encounter)}`);
  button.dataset.index = encounterIndex;
  button.setAttribute("aria-label", describeSpreadCard(encounter));
  name.textContent = isTodo(encounter.name) ? "Unrecorded" : encounter.name;
  item.querySelector(".spread-card__rematch").hidden = !encounter.rematch;
  button.prepend(createCardArt(encounter));
  return item;
}

/**
 * The back of a card in the card view: what it is, the Stand and its user, the stat chart,
 * and its lookup (a tarot reading or a god's summary) or, for a Stand outside the deck,
 * its description.
 */
function createDossier(encounter) {
  const dossier = cloneTemplate(elements.dossierTemplate);
  const typeLabel = dossier.querySelector(".dossier__type");
  const facts = dossier.querySelector(".fact-list");

  dossier.classList.add(`dossier--${encounterKind(encounter)}`);

  // The Stand's photo heads the dossier; pressing it opens the photo full screen
  const photo = createStandPhoto(encounter, { tag: "button" });
  if (photo) {
    const label = document.createElement("span");
    label.className = "visually-hidden";
    label.textContent = MESSAGES.viewFullScreen; // the stills' alt text follows
    photo.type = "button";
    photo.classList.add("dossier__photo");
    photo.prepend(label);
    dossier.prepend(photo);
  }
  fillText(dossier.querySelector(".dossier__stand"), encounter.stand);
  fillText(dossier.querySelector(".dossier__user"), encounter.standUser);

  if (encounter.type === "tarot") {
    const numeral = tarotNumeral(encounter.code);
    typeLabel.textContent = numeral === "?" ? "Tarot card" : `Tarot card · ${numeral}`;
  } else if (encounter.type === "god") {
    typeLabel.textContent = "Egyptian god";
  } else if (encounter.type === "stand") {
    // A Stand outside the deck: its name is the card's title, and a description (no lookup) follows
    typeLabel.textContent = "Not of the Arcana";
    dossier.querySelector(".dossier__stand").parentElement.remove();
    const description = dossier.querySelector(".dossier__description");
    fillText(description, encounter.description);
    description.hidden = false;
  } else {
    typeLabel.textContent = MESSAGES.todoEncounter;
    typeLabel.classList.add("is-todo");
  }

  if (encounter.rematch) typeLabel.textContent += " · Rematch";

  // The stat chart only appears once all six ratings are filled in
  const stats = readStats(encounter.stats);
  if (stats) facts.after(createStats(stats));
  return dossier;
}

/**
 * A face-down card: a button that turns it over, labeled "Reveal encounter 2 of 3". A rematch
 * says so on its back. Whether it can be turned over yet is set by renderFaceDownOrder.
 */
function createFaceDownItem(encounter, encounterIndex, total) {
  const item = cloneTemplate(elements.encounterBackTemplate);
  const back = item.querySelector(".encounter__back");
  back.dataset.index = encounterIndex;
  back.dataset.total = total;
  back.dataset.rematch = Boolean(encounter.rematch);
  item.querySelector(".encounter__back-count").textContent = `${encounterIndex + 1} of ${total}`;
  item.querySelector(".encounter__back-rematch").hidden = !encounter.rematch;
  return item;
}

/**
 * Builds one passport stamp: a tarot card, a god's cartouche, a Stand outside the deck (a
 * hole punched through the page for Cream), or a blank. An ambush's stamp names its leg; a
 * Crusader's names who joined and when. Pressing a stamp opens its card.
 */
function createStamp(encounter, place, placeIndex, { key, isAlly = false, isCrusader = false } = {}) {
  const kind = encounterKind(encounter);
  const stamp = cloneTemplate(elements.stampTemplate);
  const button = stamp.querySelector(".stamp__button");
  const isAmbush = place.kind === "ambush";
  const where = isAmbush
    ? `in an ambush between ${place.from.name} and ${place.to.name}`
    : `in ${place.stop.name} on day ${place.stop.day}`;
  const marks = { tarot: tarotNumeral(encounter.code), god: "", stand: "", unrecorded: "?" };
  const names = { tarot: encounter.name, god: encounter.name, stand: encounter.name, unrecorded: "Unrecorded" };
  const labels = {
    tarot: isCrusader
      ? `${encounter.name}, tarot card, collected when ${encounter.standUser} joined the Crusaders ${where}`
      : `${encounter.name}, tarot card, collected ${where}`,
    god: `${encounter.name}, Egyptian god, encountered ${where}`,
    stand: `${encounter.name}, a Stand not of the Arcana, encountered ${where}`,
    unrecorded: `the unrecorded encounter ${where}`,
  };

  stamp.classList.add(`stamp--${kind}`);
  stamp.classList.toggle("stamp--void", encounter.effect === "void");
  stamp.querySelector(".stamp__mark").textContent = marks[kind];
  stamp.querySelector(".stamp__name").textContent = names[kind];
  if (isCrusader) {
    fillText(stamp.querySelector(".stamp__place"), encounter.standUser);
    stamp.querySelector(".stamp__day").textContent = `Joined day ${dayAt(place)}`;
  } else {
    stamp.querySelector(".stamp__place").textContent = isAmbush ? `${place.from.name} to ${place.to.name}` : place.stop.name;
    stamp.querySelector(".stamp__day").textContent = isAmbush ? "Ambush" : `Day ${place.stop.day}`;
  }
  stamp.classList.toggle("stamp--crusader", isCrusader);
  button.dataset.index = placeIndex;
  button.dataset.key = key;
  button.setAttribute("aria-label", `View ${labels[kind]}`);

  // The card art printed faintly in ink, inside the cartouche for gods. Cream's stamp is a hole.
  if (kind !== "unrecorded" && encounter.effect !== "void" && !isTodo(encounter.image)) {
    const ink = document.createElement("img");
    ink.className = "stamp__ink";
    ink.src = encounter.image;
    ink.alt = ""; // decorative: the stamp's label already names the card
    ink.addEventListener("error", () => ink.remove());
    (kind === "god" ? stamp.querySelector(".stamp__face") : button).prepend(ink);
  }

  return stamp;
}

/* 6. Journal panel
   ========================================================================== */

/**
 * Fills the journal entry for a place, with its encounters face up or face down. A stop has
 * its live data and story sections; an ambush has its heading, where it happened, and its cards.
 */
function renderEntry(index) {
  const place = PLACES[index];
  const isStop = place.kind === "stop";
  const encounters = place.encounters;
  const encounterItems = encounters.map((encounter, encounterIndex) =>
    isRevealed(index, encounterIndex)
      ? createSpreadCard(encounter, encounterIndex)
      : createFaceDownItem(encounter, encounterIndex, encounters.length)
  );

  elements.entryMeta.textContent = isStop
    ? `Stop ${place.stopIndex + 1} of ${STOPS.length} · Day ${place.stop.day}`
    : `${place.from.name} to ${place.to.name} · Day ${dayAt(place)}`;
  elements.entryName.textContent = placeName(place);
  elements.entryWhere.hidden = isStop;
  if (!isStop) fillText(elements.entryWhere, place.where);
  elements.stopSections.forEach((section) => {
    section.hidden = !isStop;
  });
  // The dish card: its name and Joseph's note come from stops.js; its photo and description load
  const dish = isStop ? place.stop.dish : null;
  elements.dishSection.hidden = !dish;
  if (dish) {
    fillText(elements.dishName, dish.name);
    fillText(elements.dishNote, dish.note);
  }

  elements.encounterList.replaceChildren(...encounterItems);
  elements.encounterList.hidden = encounterItems.length === 0;
  elements.encountersEmpty.hidden = encounterItems.length > 0;
  renderFaceDownOrder();
  renderRevealAll();
  renderCardHint();
}

/**
 * Cards turn over in story order: only the next face-down card can be turned over, and it
 * shows a "Turn over" hint. The ones after it wait their turn.
 */
function renderFaceDownOrder() {
  elements.encounterList.querySelectorAll(".encounter__back").forEach((back, faceDownIndex) => {
    const isNext = faceDownIndex === 0;
    const { index, total, rematch } = back.dataset;
    const name = `encounter ${Number(index) + 1} of ${total}${rematch === "true" ? ", a rematch" : ""}`;

    back.disabled = !isNext;
    back.classList.toggle("is-next", isNext);
    back.querySelector(".encounter__back-action").textContent = isNext ? "Reveal" : "Face down";
    back.querySelector(".encounter__back-hint").hidden = !isNext;
    back.setAttribute(
      "aria-label",
      isNext ? `Reveal ${name}` : `${name[0].toUpperCase()}${name.slice(1)}, face down until the cards before it are turned over`
    );
  });
}

/** "Reveal all" appears while at least two cards at the place are still face down. */
function renderRevealAll() {
  const placeIndex = state.viewingIndex;
  const faceDown = PLACES[placeIndex].encounters.filter(
    (_, encounterIndex) => !isRevealed(placeIndex, encounterIndex)
  ).length;
  elements.revealAllButton.hidden = faceDown < 2;
}

/**
 * ドドドド looms beside the stop's name in Egypt, stronger at Cairo. It only animates as
 * the traveler arrives; revisits show it already settled.
 */
function renderMenace(index, { loom = false } = {}) {
  const place = PLACES[index];
  const inEgypt = place.kind === "stop" && place.stop.countryCode === "EG";
  const atCairo = inEgypt && index === LAST_PLACE_INDEX;
  const menace = elements.entryMenace;

  menace.hidden = !inEgypt;
  menace.classList.toggle("entry__menace--cairo", atCairo);
  elements.entryHeader.classList.toggle("entry__header--menaced", inEgypt);
  elements.entryHeader.classList.toggle("entry__header--cairo", atCairo);

  menace.classList.remove("is-looming");
  if (inEgypt && loom && !reducedMotion.matches) {
    void menace.offsetWidth; // restarts the animation if it ran before
    menace.classList.add("is-looming");
  }
}

/** The day counter follows how far the journey has gotten, not the place being viewed. */
function renderDayCounter() {
  elements.dayNumber.textContent = dayAt(PLACES[state.reachedIndex]);
}

/**
 * Labels the Next button with the stop it heads for (an ambush on the way stops it short).
 * After an ambush, or when looking back, it continues the journey.
 */
function renderNextButton() {
  const button = elements.nextButton;
  const next = PLACES[state.reachedIndex + 1];
  const destination = next && destinationOf(next);

  // aria-disabled (not disabled) keeps keyboard focus on the button while traveling
  button.setAttribute("aria-disabled", String(state.isTraveling));

  if (state.isTraveling) {
    button.textContent = `Traveling to ${destination.name}…`;
  } else if (!next) {
    button.textContent = "Face DIO";
  } else if (PLACES[state.reachedIndex].kind === "ambush" || state.viewingIndex < state.reachedIndex) {
    button.textContent = `Continue to ${destination.name}`;
  } else {
    button.textContent = `Next destination: ${destination.name}`;
  }
}

/**
 * Rebuilds the collected stamps in five rows: the Crusaders, tarot cards, gods, other Stands,
 * and encounters not recorded yet. A card's stamp is collected when it's turned over, an
 * ally's when they join; new ones get the "stamped" animation.
 */
function renderCollection({ animateKeys = [] } = {}) {
  const rows = { crusader: [], tarot: [], god: [], stand: [], unrecorded: [] };

  allStamps()
    .filter(isCollected)
    .forEach((collected) => {
      const { card, placeIndex, key, isAlly } = collected;
      const isCrusader = isCrusaderStamp(collected);
      const stamp = createStamp(card, PLACES[placeIndex], placeIndex, { key, isAlly, isCrusader });
      if (animateKeys.includes(key)) stamp.classList.add("is-new");
      rows[isCrusader ? "crusader" : encounterKind(card)].push(stamp);
    });

  elements.crusaderStamps.replaceChildren(...rows.crusader);
  elements.tarotStamps.replaceChildren(...rows.tarot);
  elements.godStamps.replaceChildren(...rows.god);
  elements.standStamps.replaceChildren(...rows.stand);
  elements.unrecordedStamps.replaceChildren(...rows.unrecorded);

  elements.crusaderStampsEmpty.hidden = rows.crusader.length > 0;
  elements.tarotStampsEmpty.hidden = rows.tarot.length > 0;
  elements.godStampsEmpty.hidden = rows.god.length > 0;
  elements.standStampsEmpty.hidden = rows.stand.length > 0;
  elements.unrecordedStampsGroup.hidden = rows.unrecorded.length === 0;

  const isNew = Object.values(rows).flat().some((stamp) => stamp.classList.contains("is-new"));
  renderStampCounter({ bump: isNew });
}

/**
 * The stamp counter in the Next bar ("★ 12/33"), a link to the stamps panel, which is
 * often off screen. It gives a small bump when a stamp lands.
 */
function renderStampCounter({ bump = false } = {}) {
  const collected = allStamps().filter(isCollected).length;
  const total = allStamps().length;
  const counter = elements.stampCounter;

  elements.stampCounterCount.textContent = `${collected}/${total}`;
  elements.stampCounterLabel.textContent = `${collected} of ${total} stamps collected. Go to the stamps.`;
  if (bump) {
    counter.classList.remove("is-bumped");
    void counter.offsetWidth; // restarts the bump if one is still running
    counter.classList.add("is-bumped");
  }
}

/** "Tap or click a card to read it", until the traveler has opened a card view once. */
function renderCardHint() {
  const placeIndex = state.viewingIndex;
  const hasFaceUp = PLACES[placeIndex].encounters.some((_, encounterIndex) => isRevealed(placeIndex, encounterIndex));
  elements.cardHint.hidden = state.hasOpenedCardView || !hasFaceUp;
}

function highlightCurrentStamps() {
  elements.collection.querySelectorAll(".stamp__button").forEach((button) => {
    setAriaCurrent(button, Number(button.dataset.index) === state.viewingIndex);
  });
}

/** Shows a place in the journal, updates everything that depends on it, and loads live data. */
function renderPlace(index, { arriving = false } = {}) {
  state.viewingIndex = index;
  renderEntry(index);
  elements.entry.scrollTop = 0; // a new page starts at the top (it scrolls on its own on wide screens)
  renderMenace(index, { loom: arriving });
  renderStopDistance();
  renderDayCounter();
  renderNextButton();
  updateMarkers();
  highlightCurrentStamps();
  loadLiveData(index);
  preloadStandPhotos(index);
}

/* Turning encounter cards over */

/** The first half of a flip: the card's back turns edge-on. */
function turnEdgeOn(back) {
  back.classList.add("is-flipping");
  return back.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(90deg)" }], {
    duration: FLIP_HALF_MS,
    easing: "ease-in",
  }).finished;
}

/**
 * The second half: the face turns in, with the card's moment: a color burst, speed lines
 * behind it, and ゴゴゴゴ rumbling over its corner. Then all of that fades away.
 */
function turnFaceIn(card) {
  const lines = document.createElement("span");
  const sfx = document.createElement("span");
  lines.className = "spread__lines";
  sfx.className = "spread__sfx";
  sfx.textContent = "ゴゴゴゴ";
  lines.setAttribute("aria-hidden", "true");
  sfx.setAttribute("aria-hidden", "true");
  card.prepend(lines);
  card.append(sfx);

  card.classList.add("is-flipping", "is-bursting");
  card
    .animate([{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0deg)" }], {
      duration: FLIP_HALF_MS,
      easing: "ease-out",
    })
    .finished.then(() => card.classList.remove("is-flipping"));
  setTimeout(() => {
    card.classList.remove("is-bursting");
    lines.remove();
    sfx.remove();
  }, BURST_MS);
}

/**
 * The Stand's photo, name, and user flash across the screen in big lettering, like an anime's
 * Stand introduction, in whichever half of the screen keeps the card's own moment in view.
 * Decorative: the reveal announcement already says the same for screen readers.
 */
function flashStandCaption(encounter, card) {
  const stand = encounter.type === "stand" ? encounter.name : encounter.stand;
  if (isTodo(stand)) return;

  const caption = elements.standCaption;
  const photo = createStandPhoto(encounter);
  elements.standCaptionPhoto.replaceChildren(...(photo ? [photo] : []));
  caption.querySelector(".stand-caption__stand").textContent = stand;
  caption.querySelector(".stand-caption__user").textContent = isTodo(encounter.standUser)
    ? ""
    : `Stand user: ${encounter.standUser}`;
  caption.style.setProperty("--caption-ms", `${CAPTION_MS}ms`); // the sweep lasts as long as the caption
  caption.classList.remove("is-showing");
  caption.hidden = false;
  placeStandCaption(caption, card);
  void caption.offsetWidth; // restarts the animation if a caption is still showing
  caption.classList.add("is-showing");
  clearTimeout(flashStandCaption.timer);
  flashStandCaption.timer = setTimeout(() => {
    caption.hidden = true;
    caption.classList.remove("is-showing");
  }, CAPTION_MS);
}

/**
 * Puts the caption on whichever side of the card has more room (usually the other half of
 * the screen), clear of the card. Where even that side is short, the photo shrinks to fit,
 * and below CAPTION_PHOTO_MIN_PX it's left out. The band is tilted, so it reaches a little
 * above and below its own top and bottom; everything here is measured as it's drawn.
 */
function placeStandCaption(caption, card) {
  const gap = 12;
  const screen = window.innerHeight;
  const cardBox = card.getBoundingClientRect();
  const photo = elements.standCaptionPhoto;
  const above = cardBox.top - 2 * gap;
  const below = screen - cardBox.bottom - 2 * gap;
  const room = Math.max(above, below);

  caption.style.setProperty("--caption-top", "0px");
  photo.style.width = "";
  photo.hidden = false;
  let box = caption.getBoundingClientRect();
  for (let tries = 0; tries < 2 && box.height > room && photo.childElementCount > 0; tries++) {
    const height = photo.offsetHeight - (box.height - room); // its own height, not tilted
    if (height < CAPTION_PHOTO_MIN_PX) {
      photo.hidden = true;
    } else {
      photo.style.width = `${(height * 16) / 9}px`;
    }
    box = caption.getBoundingClientRect();
  }

  const top =
    below >= above
      ? Math.min(Math.max(screen * 0.62, cardBox.bottom + gap), screen - box.height - gap)
      : Math.max(Math.min(screen * 0.14, cardBox.top - box.height - gap), gap);
  caption.style.setProperty("--caption-top", `${Math.round(top - box.top)}px`); // box.top: how far the tilt reaches up
}

/** Cream's void, first half: a black void spreads from the middle of the face-down card and swallows it. */
function spreadVoid(back) {
  const button = back.querySelector(".encounter__back");
  const { width, height } = button.getBoundingClientRect();
  const darkness = document.createElement("span");

  darkness.className = "encounter__void";
  darkness.setAttribute("aria-hidden", "true");
  darkness.style.setProperty("--void-size", `${Math.hypot(width, height)}px`);
  button.classList.add("is-voiding");
  button.append(darkness);
  return darkness.animate([{ scale: 0 }, { scale: 1 }], {
    duration: VOID_MS / 2,
    easing: "ease-in",
    fill: "forwards",
  }).finished;
}

/** Second half: the void opens from the middle outward, leaving the card that was underneath. */
function openVoid(card) {
  const { width, height } = card.getBoundingClientRect();
  const size = `${Math.hypot(width, height)}px`;
  const opening = document.createElement("span");

  opening.className = "encounter__void encounter__void--opening";
  opening.setAttribute("aria-hidden", "true");
  card.classList.add("is-voiding");
  card.append(opening);
  opening
    .animate([{ width: "0px", height: "0px" }, { width: size, height: size }], {
      duration: VOID_MS / 2,
      easing: "ease-out",
    })
    .finished.then(() => {
      opening.remove();
      card.classList.remove("is-voiding");
    });
}

/**
 * Turns the next card face up: it flips (Cream's void erases it instead), then its stamp is
 * collected, its lookup loads, and an ally who fought here joins the Crusaders. Cards turn
 * over in story order, so any other card is ignored. `quiet` skips the announcement and
 * focus move, for Reveal all to do once at the end.
 */
async function revealEncounter(encounterIndex, { quiet = false } = {}) {
  const placeIndex = state.viewingIndex;
  if (encounterIndex !== nextFaceDown(placeIndex)) return null;

  const key = encounterKey(placeIndex, encounterIndex);
  const encounter = PLACES[placeIndex].encounters[encounterIndex];
  const back = elements.encounterList.children[encounterIndex];
  const animate = !reducedMotion.matches;
  const isVoid = encounter.effect === "void";
  state.revealed.add(key);

  if (animate) await (isVoid ? spreadVoid(back) : turnEdgeOn(back));

  renderCollection({ animateKeys: [key] });
  highlightCurrentStamps();

  // The traveler may have moved to another place mid-flip; the stamp still counts
  if (state.viewingIndex !== placeIndex || !back.isConnected) return encounter;

  const card = createSpreadCard(encounter, encounterIndex);
  back.replaceWith(card);
  renderFaceDownOrder();
  renderRevealAll();
  renderCardHint();

  if (animate) {
    if (isVoid) openVoid(card);
    else turnFaceIn(card);
  }

  if (!quiet) {
    announce(
      joinSentences(
        `Revealed: ${describeReveal(encounter)}.${describeStand(encounter)}${describeAllyJoining(encounter)}`,
        describeStampsCollected(encounter.rematch ? 0 : 1)
      )
    );
    card.querySelector(".spread-card").focus(); // first, since it can scroll the card into view
    flashStandCaption(encounter, card);
  }
  return encounter;
}

/** " Noriaki Kakyoin joins the Crusaders." when a fight ends with the Stand user joining. */
function describeAllyJoining(encounter) {
  return encounter.becomesAlly && !isTodo(encounter.standUser) ? ` ${encounter.standUser} joins the Crusaders.` : "";
}

/** Turns over every face-down card at the place, one after another in story order, each with its moment. */
async function revealAllEncounters() {
  if (state.isRevealingAll) return;

  const placeIndex = state.viewingIndex;
  const faceDown = PLACES[placeIndex].encounters
    .map((_, encounterIndex) => encounterIndex)
    .filter((encounterIndex) => !isRevealed(placeIndex, encounterIndex));
  const revealed = [];

  state.isRevealingAll = true;
  for (const encounterIndex of faceDown) {
    if (state.viewingIndex !== placeIndex) break;
    const encounter = await revealEncounter(encounterIndex, { quiet: true });
    if (encounter) revealed.push(encounter);
    if (!reducedMotion.matches) await wait(REVEAL_ALL_GAP_MS);
  }
  state.isRevealingAll = false;

  if (revealed.length > 0 && state.viewingIndex === placeIndex) {
    const joining = revealed.map(describeAllyJoining).join("");
    announce(
      joinSentences(
        `Revealed ${pluralize(revealed.length, "encounter")}: ${revealed.map(describeReveal).join("; ")}.${joining}`,
        describeStampsCollected(revealed.filter((encounter) => !encounter.rematch).length)
      )
    );
    elements.encounterList.children[faceDown[0]]?.querySelector(".spread-card")?.focus();
  }
}

/* The card view: a card lifted out of the spread (or the stamps), with the Stand dossier on its back */

/** Opens the card view on one of a list of cards; the arrows move through the rest. */
function openCardView(cards, position, opener) {
  state.cardView = { cards, position: Math.max(position, 0), opener };
  state.hasOpenedCardView = true;
  renderCardHint();
  showCardInView();
  elements.cardView.showModal();
  elements.cardViewFront.focus();
}

/** Opens a face-up card in the spread, with the other face-up cards at the place beside it. */
function openSpreadCard(encounterIndex, opener) {
  const placeIndex = state.viewingIndex;
  const faceUp = PLACES[placeIndex].encounters
    .map((_, index) => index)
    .filter((index) => isRevealed(placeIndex, index));
  const cards = faceUp.map((index) => PLACES[placeIndex].encounters[index]);
  openCardView(cards, faceUp.indexOf(encounterIndex), opener);
}

/** Opens a stamp's card, with the other stamps in its row (say, all the Crusaders) beside it. */
function openStampCard(stampButton) {
  const cardsByKey = new Map(allStamps().map((stamp) => [stamp.key, stamp.card]));
  const row = [...stampButton.closest(".collection__list").querySelectorAll(".stamp__button")];
  const cards = row.map((button) => cardsByKey.get(button.dataset.key));
  openCardView(cards, row.indexOf(stampButton), stampButton);
}

/** Shows the card at the view's current position, front up, and starts loading its lookup. */
function showCardInView() {
  const { cards, position } = state.cardView;
  const encounter = cards[position];
  const dossier = createDossier(encounter);
  const hasNeighbours = cards.length > 1;

  elements.cardViewTitle.textContent = isTodo(encounter.name) ? "Unrecorded encounter" : encounter.name;
  elements.cardViewCount.textContent = hasNeighbours ? `${position + 1} of ${cards.length}` : "";
  elements.cardViewPrev.hidden = !hasNeighbours;
  elements.cardViewNext.hidden = !hasNeighbours;
  elements.cardViewFront.replaceChildren(createCardArt(encounter, { large: true }));
  elements.cardViewDossier.replaceChildren(dossier);
  elements.cardViewBack.scrollTop = 0;
  loadEncounterLookup(encounter, dossier);
  showCardSide("front");
}

/** Turns the card in the view to one side. Only the side showing can be reached. */
function showCardSide(side) {
  const isBack = side === "back";
  elements.cardViewCard.classList.toggle("is-turned", isBack);
  elements.cardViewFront.inert = isBack;
  elements.cardViewBack.inert = !isBack;
}

/**
 * Turns the card over and says which side is showing. If focus was on the side that just
 * turned away, it follows to the side now showing.
 */
function turnCardView() {
  const isBack = !elements.cardViewCard.classList.contains("is-turned");
  const focusWasOnCard = elements.cardViewCard.contains(document.activeElement);
  const name = elements.cardViewTitle.textContent;

  showCardSide(isBack ? "back" : "front");
  elements.cardViewSide.textContent = isBack ? `Showing the back: the Stand dossier for ${name}.` : `Showing the front: ${name}.`;
  if (focusWasOnCard) (isBack ? elements.cardViewBack : elements.cardViewFront).focus();
}

/** Moves to the previous (-1) or next (1) card in the view's list, wrapping around. */
function stepCardView(direction) {
  const view = state.cardView;
  if (!view || view.cards.length < 2) return;

  // A new card always shows its front, so focus on the old card's back follows to the new front
  const focusWasOnCard = elements.cardViewCard.contains(document.activeElement);
  view.position = (view.position + direction + view.cards.length) % view.cards.length;
  showCardInView();
  if (focusWasOnCard) elements.cardViewFront.focus();
  elements.cardViewSide.textContent = `${elements.cardViewCount.textContent}: ${elements.cardViewTitle.textContent}, front showing.`;
}

/** After the card view closes, focus goes back to the card that opened it. */
function closedCardView() {
  const opener = state.cardView?.opener;
  state.cardView = null;
  elements.cardViewSide.textContent = "";
  if (opener?.isConnected) opener.focus();
}

/** The encounter whose card is showing in the card view. */
function cardInView() {
  return state.cardView.cards[state.cardView.position];
}

/* The photo viewer: a photo full screen, over the page or the card view */

/** Shows a photo full screen under a title, and remembers what to give focus back to. */
function openPhotoViewer(title, photo, opener) {
  state.photoViewerOpener = opener;
  elements.photoViewerTitle.textContent = title;
  elements.photoViewerPhoto.replaceChildren(photo);
  elements.photoViewer.showModal();
  elements.photoViewerClose.focus();
}

/** Opens an encounter's Stand photo full screen. If its stills all fail to load, it closes again. */
function openStandPhotoViewer(encounter, opener) {
  const photo = createStandPhoto(encounter, { onEmpty: () => elements.photoViewer.close() });
  if (photo) openPhotoViewer(describeStandAndUser(encounter), photo, opener);
}

/**
 * Opens a Wikipedia photo full screen. The journal-size copy (already loaded) shows at once,
 * a little soft, while the larger one loads; if that fails, the journal-size one stays.
 */
function openWikiPhotoViewer({ title, small, large, alt }, opener) {
  const image = document.createElement("img");
  const status = elements.photoViewerStatus;
  image.className = "photo-viewer__image";
  image.src = small;
  image.alt = alt;
  openPhotoViewer(title, image, opener);
  if (!large || large === small) return;

  const sharp = new Image();
  sharp.src = large;
  image.classList.add("is-sharpening");
  status.textContent = MESSAGES.photoLoading;
  sharp
    .decode()
    .then(() => {
      if (image.isConnected) image.src = sharp.src;
    })
    .catch(() => {}) // the journal-size photo stays
    .finally(() => {
      image.classList.remove("is-sharpening");
      if (image.isConnected) status.textContent = "";
    });
}

/** After the photo viewer closes, focus goes back to the photo that opened it. */
function closedPhotoViewer() {
  const opener = state.photoViewerOpener;
  state.photoViewerOpener = null;
  elements.photoViewerPhoto.replaceChildren();
  elements.photoViewerStatus.textContent = "";
  if (opener?.isConnected) opener.focus();
}

/* 7. Live data
   Every API section loads on its own, so one failure never blocks the others.
   ========================================================================== */

// Each panel remembers its newest request, so a slow, older response can't
// overwrite the data for the stop the traveler is looking at now
const latestRequests = new WeakMap();
let clockTimer;
let clockTick = null; // updates the shown clock; kept while time is stopped so it can catch up

/**
 * Fetches JSON, treating HTTP errors and slow responses as failures.
 * A failed response's HTTP status is kept on the error as `status`.
 */
async function fetchJson(url, { headers, timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}: ${url}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

/**
 * Runs `load` once per key: later calls share its promise, even while the first request is
 * still on its way. A failed load is forgotten, so Try again makes a fresh request.
 */
function cachedLoad(cache, key, load) {
  if (!cache.has(key)) {
    const promise = load();
    cache.set(key, promise);
    promise.catch(() => cache.delete(key));
  }
  return cache.get(key);
}

function showLoading(panel, text) {
  const loading = cloneTemplate(elements.loadingTemplate);
  loading.querySelector(".data-panel__loading-text").textContent = text;
  panel.replaceChildren(loading);
  panel.setAttribute("aria-busy", "true");
}

function showError(panel, text, retry) {
  const error = cloneTemplate(elements.errorTemplate);
  error.querySelector(".data-panel__error-text").textContent = text;
  error.querySelector("button").addEventListener("click", () => {
    panel.focus(); // the button is about to disappear, so keep keyboard focus nearby
    retry();
  });
  panel.replaceChildren(error);
  panel.removeAttribute("aria-busy");
}

/** A short note shown instead of data, for a value in stops.js that needs fixing. */
function createNote(text) {
  const note = document.createElement("p");
  note.className = "data-panel__note is-todo";
  note.textContent = text;
  return note;
}

/** Shows a note in a panel, so a request still on its way can no longer replace it. */
function showNote(panel, text) {
  latestRequests.set(panel, {});
  panel.replaceChildren(createNote(text));
  panel.removeAttribute("aria-busy");
}

/**
 * Loads one API section: shows a loading message, then the rendered result, or an
 * on-theme error with a Try again button. `render` turns the data into an element
 * and may throw if the data isn't in the expected shape.
 */
async function loadIntoPanel(panel, { loadingText, errorText, fetchData, render }) {
  const request = {};
  latestRequests.set(panel, request);
  showLoading(panel, loadingText);

  try {
    const data = await fetchData();
    if (latestRequests.get(panel) !== request) return;
    panel.replaceChildren(render(data));
    panel.removeAttribute("aria-busy");
  } catch {
    if (latestRequests.get(panel) !== request) return;
    showError(panel, errorText, () =>
      loadIntoPanel(panel, { loadingText, errorText, fetchData, render })
    );
  }
}

/* Weather and local time (Open-Meteo) */

function fetchWeather(stop) {
  const [latitude, longitude] = stop.coords;
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,weather_code,is_day",
    timezone: "auto", // also returns the stop's time zone, used for the local clock
  });
  return fetchJson(`${WEATHER_API_URL}?${params}`);
}

function describeWeather(code, isDay) {
  if (code === 0 && !isDay) return "Clear night";
  return WEATHER_CODES[code] ?? "Unknown conditions";
}

function formatTemperature(celsius) {
  const fahrenheit = (celsius * 9) / 5 + 32;
  return `${Math.round(celsius)}°C · ${Math.round(fahrenheit)}°F`;
}

function stopClock() {
  clearInterval(clockTimer);
  clockTick = null;
}

/** Shows the current time in a time zone and keeps it ticking (unless time has stopped). */
function startClock(element, timeZone) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  stopClock();
  clockTick = () => {
    element.textContent = formatter.format(new Date());
  };
  clockTick();
  if (!state.isTimeStopped) clockTimer = setInterval(clockTick, CLOCK_TICK_MS);
}

/** Stops the clock on the second it shows. */
function freezeClock() {
  clearInterval(clockTimer);
}

/** Starts the clock again, jumping straight to the real time. */
function unfreezeClock() {
  if (!clockTick) return;
  clockTick();
  clockTimer = setInterval(clockTick, CLOCK_TICK_MS);
}

function renderWeather(data) {
  const current = data.current;
  if (typeof current?.temperature_2m !== "number" || typeof data.timezone !== "string") {
    throw new Error("Unexpected weather data");
  }

  const conditions = cloneTemplate(elements.weatherTemplate);
  conditions.querySelector(".weather__summary").textContent = describeWeather(
    current.weather_code,
    current.is_day
  );
  conditions.querySelector(".weather__temperature").textContent = formatTemperature(
    current.temperature_2m
  );
  startClock(conditions.querySelector(".weather__time"), data.timezone);
  return conditions;
}

function loadWeather(stop) {
  stopClock();
  loadIntoPanel(elements.weatherPanel, {
    loadingText: MESSAGES.weatherLoading,
    errorText: MESSAGES.weatherFailed,
    fetchData: () => fetchWeather(stop),
    render: renderWeather,
  });
}

/* Place and god summaries (Wikipedia) */

const wikiCache = new Map(); // title -> summary, so revisiting a stop doesn't refetch

/** Fetches a Wikipedia page summary. A page that doesn't exist comes back as { type: "missing" }. */
function fetchWikiSummary(title) {
  return cachedLoad(wikiCache, title, async () => {
    const url = WIKI_SUMMARY_URL + encodeURIComponent(title.trim().replaceAll(" ", "_"));
    try {
      const summary = await fetchJson(url, { headers: WIKI_HEADERS });
      // Checked here, before caching, so a malformed response is never remembered
      if (typeof summary.title !== "string") throw new Error("Unexpected Wikipedia data");
      return summary;
    } catch (error) {
      if (error.status === 404) return { type: "missing" };
      throw error;
    }
  });
}

/**
 * Tidies punctuation that Wikipedia leaves behind when it strips pronunciations from a
 * summary: ",," or a space before a comma, and empty brackets like "()" or "( ; )".
 * The wording itself is never changed.
 */
function tidyExtract(text) {
  return text
    .replace(/\s*\(\s*(?:[,;:]\s*)*\)/g, "") // empty or leftover brackets
    .replace(/\s+([,;])/g, "$1") // stray space before a comma or semicolon
    .replace(/\s+\.(?=\s|$)/g, ".") // stray space before a sentence-ending period
    .replace(/([,;])(?:\s*[,;])+/g, "$1") // doubled punctuation
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** The first few sentences of a text, or all of it if the browser can't split sentences. */
function firstSentences(text, count) {
  if (!Intl.Segmenter) return text;

  const sentences = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)];
  return sentences
    .slice(0, count)
    .map(({ segment }) => segment)
    .join("")
    .trim();
}

/**
 * Finds an image's file name and its file page (which lists the author and license)
 * from a Wikimedia image URL such as
 * https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Name.jpg/330px-Name.jpg
 * Returns null if the URL isn't in that format.
 */
function wikimediaFile(imageUrl) {
  try {
    const segments = new URL(imageUrl).pathname.split("/");
    const thumbIndex = segments.indexOf("thumb");
    const fileName = thumbIndex === -1 ? segments.at(-1) : segments[thumbIndex + 3];
    const host = segments[2] === "commons" ? "commons.wikimedia.org" : "en.wikipedia.org";

    if (!fileName) return null;
    return { name: decodeURIComponent(fileName), page: `https://${host}/wiki/File:${fileName}` };
  } catch {
    return null;
  }
}

/** Turns an image file name into readable alt text: "Flag_of_Singapore.svg" becomes "Flag of Singapore". */
function describeFileName(fileName) {
  return fileName
    .replace(/\.[a-z0-9]+$/i, "") // file extension
    .replace(/\([^)]*\)|\bpanoramio\b/gi, "") // upload notes like "(cropped)"
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // split CamelCase words
    .replace(/\s+/g, " ")
    .trim();
}

/** True for a flag image. The place section skips flags; the Country section shows the flag. */
function isFlagImage(imageUrl) {
  return /^Flag of /i.test(describeFileName(wikimediaFile(imageUrl)?.name ?? ""));
}

/** A link that opens in a new tab, so the journey isn't lost, and says so to screen readers. */
function createExternalLink(href, text) {
  const link = document.createElement("a");
  const notice = document.createElement("span");

  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = text;
  notice.className = "visually-hidden";
  notice.textContent = MESSAGES.newTab;
  link.append(notice);
  return link;
}

/**
 * A larger copy of an article's lead image, for the photo viewer: the original if it's at
 * most VIEWER_IMAGE_PX wide, otherwise Wikimedia's copy at that width.
 */
function largeWikiImage(thumbnail, original) {
  if (original?.source && original.width <= VIEWER_IMAGE_PX) return original.source;
  return thumbnail.source.replace(/\/\d+px-(?=[^/]*$)/, `/${VIEWER_IMAGE_PX}px-`);
}

/**
 * A Wikipedia photo as a button that opens it full screen, labeled "View photo of Aswan full
 * screen". The image keeps its own alt text (`imageAlt`) when it says more than the label;
 * `alt` describes the photo in the viewer. If the image fails to load, the button removes
 * itself, leaving no broken-image icon.
 */
function createPhotoButton(thumbnail, { name, alt, imageAlt = "", className }) {
  const button = document.createElement("button");
  const label = document.createElement("span");
  const image = document.createElement("img");

  button.type = "button";
  button.className = `photo-button ${className}`;
  label.className = "visually-hidden";
  label.textContent = MESSAGES.viewPhotoOf(name);
  image.src = thumbnail.source;
  image.alt = imageAlt;
  image.loading = "lazy";
  if (thumbnail.width && thumbnail.height) {
    image.width = thumbnail.width; // reserves space, so the text doesn't jump when it loads
    image.height = thumbnail.height;
  }
  image.addEventListener("error", () => button.remove());
  button.append(label, image);
  button.addEventListener("click", () =>
    openWikiPhotoViewer(
      { title: name, small: image.currentSrc || image.src, large: largeWikiImage(thumbnail, thumbnail.original), alt },
      button
    )
  );
  return button;
}

/**
 * A Wikipedia image. Its file page, which credits its author, is listed in the Sources and
 * credits dialog. If the image fails to load, it removes itself.
 */
function createWikiFigure(thumbnail, describeImage) {
  const file = wikimediaFile(thumbnail.source);
  const figure = document.createElement("figure");
  const image = document.createElement("img");

  figure.className = "wiki__figure";
  image.className = "wiki__image";
  image.src = thumbnail.source;
  image.alt = describeImage(file?.name ?? "");
  image.loading = "lazy";
  if (thumbnail.width && thumbnail.height) {
    image.width = thumbnail.width; // reserves space, so the text doesn't jump when it loads
    image.height = thumbnail.height;
  }

  // A broken image leaves just the text, never a broken-image icon
  image.addEventListener("error", () => figure.remove());
  figure.append(image);
  return figure;
}

/**
 * Builds a summary: image (if any) and the first few sentences. Its credit is in the Sources
 * and credits dialog. Titles that don't lead to a single article get a note instead. The
 * image is the summary's own unless another `thumbnail` (or null for none) is passed in.
 */
function renderWikiSummary(
  summary,
  { title, variant, sentences, describeImage, thumbnail = summary.thumbnail, zoomName = null }
) {
  if (summary.type === "disambiguation") return createNote(MESSAGES.wikiDisambiguation(title));
  if (summary.type === "missing") return createNote(MESSAGES.wikiMissing(title));

  const wiki = cloneTemplate(elements.wikiTemplate);
  wiki.classList.add(`wiki--${variant}`);
  wiki.querySelector(".wiki__extract").textContent = summary.extract
    ? firstSentences(tidyExtract(summary.extract), sentences)
    : MESSAGES.wikiNoExtract;

  if (thumbnail?.source) {
    const figure = createWikiFigure(thumbnail, describeImage);
    // A place's photo opens full screen: the figure holds a button instead of the bare image
    if (zoomName) {
      const image = figure.querySelector("img");
      const button = createPhotoButton(thumbnail, {
        name: zoomName,
        alt: image.alt,
        imageAlt: image.alt, // a skyline, a street, a map: the file name says what's in it
        className: "wiki__photo-button",
      });
      const zoomed = button.querySelector("img");
      zoomed.className = image.className;
      zoomed.addEventListener("error", () => figure.remove()); // no empty photo frame left behind
      image.replaceWith(button);
    }
    wiki.prepend(figure);
  }
  return wiki;
}

/**
 * A place's summary plus its photo. The photo comes from the stop's photoTitle article if
 * it names one, otherwise from the summary's own lead image, and is never a flag. The
 * photo is optional: if its article fails to load, the summary still shows without it.
 */
async function fetchPlace(stop) {
  const hasPhotoTitle = !isTodo(stop.photoTitle);
  const [summary, photoPage] = await Promise.all([
    fetchWikiSummary(stop.wikiTitle),
    hasPhotoTitle ? fetchWikiSummary(stop.photoTitle).catch(() => null) : null,
  ]);

  const source = hasPhotoTitle ? photoPage : summary;
  const thumbnail = source?.type === "standard" && source.thumbnail ? { ...source.thumbnail, original: source.originalimage } : null;
  return { summary, photo: thumbnail?.source && !isFlagImage(thumbnail.source) ? thumbnail : null };
}

/**
 * The dish card's photo (a button that opens it full screen) and description: the article's
 * first sentence, unless stops.js gives the dish a description of its own.
 */
function renderDish(summary, dish) {
  if (summary.type === "disambiguation") return createNote(MESSAGES.wikiDisambiguation(dish.wikiTitle));
  if (summary.type === "missing") return createNote(MESSAGES.wikiMissing(dish.wikiTitle));

  const body = cloneTemplate(elements.dishTemplate);
  const description = body.querySelector(".dish__description");
  if (!isTodo(dish.description)) description.textContent = dish.description;
  else if (summary.extract) description.textContent = firstSentences(tidyExtract(summary.extract), DISH_DESCRIPTION_SENTENCES);
  else description.textContent = MESSAGES.wikiNoExtract;

  if (summary.thumbnail?.source) {
    const thumbnail = { ...summary.thumbnail, original: summary.originalimage };
    body.prepend(
      createPhotoButton(thumbnail, { name: dish.name, alt: `${dish.name}, from Wikipedia`, className: "dish__photo" }) // its label names the dish
    );
  }
  return body;
}

/** Loads the dish card's photo and description from the dish's Wikipedia article. */
function loadDish(stop) {
  const panel = elements.dishPanel;
  const dish = stop.dish;
  if (!dish) {
    latestRequests.set(panel, {}); // nothing to show, so an answer still on its way isn't wanted
    return;
  }
  if (isTodo(dish.wikiTitle)) {
    showNote(panel, MESSAGES.wikiTitleTodo);
    return;
  }

  loadIntoPanel(panel, {
    loadingText: MESSAGES.dishLoading,
    errorText: MESSAGES.dishFailed,
    fetchData: () => fetchWikiSummary(dish.wikiTitle),
    render: (summary) => renderDish(summary, dish),
  });
}

function loadPlaceSummary(stop) {
  const panel = elements.placePanel;

  if (isTodo(stop.wikiTitle)) {
    showNote(panel, MESSAGES.wikiTitleTodo);
    return;
  }

  loadIntoPanel(panel, {
    loadingText: MESSAGES.placeLoading,
    errorText: MESSAGES.placeFailed,
    fetchData: () => fetchPlace(stop),
    render: ({ summary, photo }) =>
      renderWikiSummary(summary, {
        title: stop.wikiTitle,
        variant: "place",
        sentences: PLACE_SUMMARY_SENTENCES,
        thumbnail: photo,
        zoomName: stop.name,
        // Lead images vary (skylines, streets, maps), so the file name says best what's shown
        describeImage: (fileName) =>
          describeFileName(fileName) || `Image from the Wikipedia article on ${summary.title}`,
      }),
  });
}

/** Loads the real god's summary into an encounter's lookup area. */
function loadGodSummary(encounter, panel) {
  panel.hidden = false;

  if (isTodo(encounter.wikiTitle)) {
    showNote(panel, MESSAGES.wikiTitleTodo);
    return;
  }

  loadIntoPanel(panel, {
    loadingText: MESSAGES.godLoading,
    errorText: MESSAGES.godFailed,
    fetchData: () => fetchWikiSummary(encounter.wikiTitle),
    render: (summary) =>
      renderWikiSummary(summary, {
        title: encounter.wikiTitle,
        variant: "god",
        sentences: GOD_SUMMARY_SENTENCES,
        // Article titles like "Set (deity)" drop the note in brackets
        describeImage: () =>
          `Depiction of the Egyptian god ${summary.title.replace(/\s*\(.*\)$/, "")}`,
      }),
  });
}

/* Country details (Countries GraphQL API) and flag (flagcdn) */

const countryCache = new Map(); // country code -> country, or null if the API doesn't know the code

/**
 * Fetches a country by its two-letter code. Sent as a plain GET, so the browser needs no
 * extra preflight request. Resolves to null for a code the API doesn't recognize.
 */
function fetchCountry(code) {
  return cachedLoad(countryCache, code, async () => {
    const params = new URLSearchParams({ query: COUNTRY_QUERY, variables: JSON.stringify({ code }) });
    const response = await fetchJson(`${COUNTRY_API_URL}?${params}`);
    if (response.errors?.length) throw new Error("The country API returned an error");

    const country = response.data?.country;
    if (country === null) return null;
    // Checked here, before caching, so a malformed response is never remembered
    if (typeof country?.name !== "string") throw new Error("Unexpected country data");
    return country;
  });
}

/** "EGP" becomes "Egyptian Pound (EGP)", using the browser's built-in currency names. */
function describeCurrency(code) {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "currency" }).of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

/** The flag image. If it can't load, the emoji flag from the API takes its place. */
function createFlag(code, country) {
  const label = `Flag of ${country.name}`;
  const image = document.createElement("img");

  image.className = "country__flag-image";
  image.src = `${FLAG_URL}${code.toLowerCase()}.svg`;
  image.alt = label;
  image.addEventListener("error", () => {
    if (!country.emoji) {
      image.remove();
      return;
    }
    const emoji = document.createElement("span");
    emoji.className = "country__emoji";
    emoji.setAttribute("role", "img");
    emoji.setAttribute("aria-label", label);
    emoji.textContent = country.emoji;
    image.replaceWith(emoji);
  });
  return image;
}

function renderCountry(country, code) {
  if (!country) return createNote(MESSAGES.countryUnknown(code));

  const details = cloneTemplate(elements.countryTemplate);
  const currencies = (country.currency ?? "").split(",").filter(Boolean).map(describeCurrency);
  const languages = (country.languages ?? []).map((language) => language.name);

  details.querySelector(".country__flag").append(createFlag(code, country));
  details.querySelector(".country__name").textContent = country.name;
  details.querySelector(".country__currency").textContent = currencies.join(", ") || "Not listed";
  details.querySelector(".country__languages-label").textContent =
    languages.length === 1 ? "Language" : "Languages";
  details.querySelector(".country__languages").textContent = languages.join(", ") || "Not listed";
  return details;
}

function loadCountry(stop) {
  const panel = elements.countryPanel;

  if (isTodo(stop.countryCode)) {
    showNote(panel, MESSAGES.countryCodeTodo);
    return;
  }

  const code = stop.countryCode.trim().toUpperCase();
  loadIntoPanel(panel, {
    loadingText: MESSAGES.countryLoading,
    errorText: MESSAGES.countryFailed,
    fetchData: () => fetchCountry(code),
    render: (country) => renderCountry(country, code),
  });
}

/* Tarot card meanings (tarotapi.dev) */

const tarotCache = new Map(); // card code -> card, or null if the API has no such card
const TAROT_CODE = /^ar(0\d|1\d|2[01])$/; // the Major Arcana: ar00 (The Fool) to ar21 (The World)

function fetchTarotCard(code) {
  return cachedLoad(tarotCache, code, async () => {
    try {
      const { card } = await fetchJson(TAROT_API_URL + code, { timeoutMs: TAROT_TIMEOUT_MS });
      // Checked here, before caching, so a malformed response is never remembered
      if (typeof card?.meaning_up !== "string" || typeof card.meaning_rev !== "string") {
        throw new Error("Unexpected tarot data");
      }
      return card;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  });
}

// Typos in the tarot API's text, corrected to Waite's original wording
const TAROT_TEXT_FIXES = [["abuse if power", "abuse of power"]]; // Strength, reversed

function fixTarotText(text) {
  return TAROT_TEXT_FIXES.reduce((fixed, [typo, correction]) => fixed.replaceAll(typo, correction), text);
}

/** Lowercase and without a leading "The", so "Wheel Of Fortune" matches "Wheel of Fortune". */
function plainCardName(name) {
  return String(name).toLowerCase().replace(/^the\s+/, "").trim();
}

function renderTarotMeaning(card, code, encounter) {
  if (!card) return createNote(MESSAGES.tarotMissing(code));

  const meaning = cloneTemplate(elements.tarotTemplate);
  meaning.querySelector(".tarot__upright").textContent = fixTarotText(card.meaning_up);
  meaning.querySelector(".tarot__reversed").textContent = fixTarotText(card.meaning_rev);

  // Waite's deck uses older names for two cards (Fortitude, The Last Judgment)
  const waiteName = meaning.querySelector(".tarot__waite-name");
  if (typeof card.name === "string" && plainCardName(card.name) !== plainCardName(encounter.name)) {
    waiteName.textContent = MESSAGES.tarotWaiteName(card.name);
    waiteName.hidden = false;
  }
  return meaning;
}

/** Loads a tarot card's meaning into an encounter's lookup area. Bad codes never reach the API. */
function loadTarotMeaning(encounter, panel) {
  panel.hidden = false;

  if (isTodo(encounter.code)) {
    showNote(panel, MESSAGES.tarotCodeTodo);
    return;
  }

  const code = encounter.code.trim().toLowerCase();
  if (!TAROT_CODE.test(code)) {
    showNote(panel, MESSAGES.tarotCodeInvalid(encounter.code));
    return;
  }

  loadIntoPanel(panel, {
    loadingText: MESSAGES.tarotLoading,
    errorText: MESSAGES.tarotFailed,
    fetchData: () => fetchTarotCard(code),
    render: (card) => renderTarotMeaning(card, code, encounter),
  });
}

/** Loads a card's lookup on its dossier: a tarot card's meaning or a god's summary. */
function loadEncounterLookup(encounter, dossier) {
  const lookup = dossier.querySelector(".dossier__lookup");
  if (encounter.type === "god") {
    loadGodSummary(encounter, lookup);
  } else if (encounter.type === "tarot") {
    loadTarotMeaning(encounter, lookup);
  }
}

/**
 * Starts every live-data lookup for a stop. Each one loads and fails on its own. Ambushes
 * have no weather, place, or country panels.
 */
function loadLiveData(index) {
  const place = PLACES[index];
  if (place.kind === "stop") {
    loadWeather(place.stop);
    loadDish(place.stop);
    loadPlaceSummary(place.stop);
    loadCountry(place.stop);
  } else {
    // The stop panels are hidden here, so an answer still on its way for them is no longer wanted
    stopClock();
    [elements.weatherPanel, elements.dishPanel, elements.placePanel, elements.countryPanel].forEach((panel) => {
      latestRequests.set(panel, {});
    });
  }

  // Cards' lookups (tarot readings, god summaries) load in the card view, when a card is read
}

/* Sources and credits: one dialog, opened from the footer, built from the data */

/** Every stop's Wikipedia article, then every dish's, then every god's (each once), as lines to look up. */
function wikiSources() {
  const stops = STOPS.filter((stop) => !isTodo(stop.wikiTitle)).map((stop) => ({ name: stop.name, stop }));
  const dishes = STOPS.filter((stop) => stop.dish && !isTodo(stop.dish.wikiTitle)).map((stop) => ({
    name: `${stop.dish.name} (${stop.name}'s dish)`,
    dish: stop.dish,
  }));
  const gods = PLACES.flatMap((place) => place.encounters).filter(
    (encounter) => encounter.type === "god" && !isTodo(encounter.wikiTitle)
  );
  const uniqueGods = [...new Map(gods.map((god) => [god.wikiTitle, god])).values()];
  return [...stops, ...dishes, ...uniqueGods.map((god) => ({ name: `${god.name} (Egyptian god)`, god }))];
}

/** A line's article and image: a stop's photo can come from another article (photoTitle). */
async function fetchSource(source) {
  if (source.stop) return fetchPlace(source.stop);
  const summary = await fetchWikiSummary((source.dish ?? source.god).wikiTitle);
  return { summary, photo: summary.thumbnail ?? null };
}

/** "Tokyo: article Tokyo; photo Skyscrapers of Shinjuku.jpg", each linking to its page. */
function renderSourceLine(source, { summary, photo }) {
  if (summary.type !== "standard") return [`${source.name}: ${MESSAGES.wikiNoExtract}`];

  const article = summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title)}`;
  const parts = [`${source.name}: article `, createExternalLink(article, summary.title)];
  const file = photo?.source ? wikimediaFile(photo.source) : null;
  if (file) {
    parts.push(`; ${source.god ? "image" : "photo"} `, createExternalLink(file.page, file.name.replaceAll("_", " ")));
  }
  return parts;
}

/** Looks up one line, showing that it's loading, then its links, or a Try again button. */
async function loadSourceLine({ item, source }) {
  item.replaceChildren(MESSAGES.sourceLoading(source.name));
  item.setAttribute("aria-busy", "true");
  try {
    item.replaceChildren(...renderSourceLine(source, await fetchSource(source)));
  } catch {
    const retry = document.createElement("button");
    retry.className = "button button--secondary button--small";
    retry.type = "button";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => {
      item.focus(); // the button is about to disappear, so keep keyboard focus nearby
      loadSourceLine({ item, source });
    });
    item.replaceChildren(`${MESSAGES.sourceFailed(source.name)} `, retry);
  }
  item.removeAttribute("aria-busy");
}

/** Fills the Wikipedia list, looking lines up a few at a time (most are already cached). */
async function renderWikiSources() {
  const lines = wikiSources().map((source) => {
    const item = document.createElement("li");
    item.tabIndex = -1;
    return { item, source };
  });
  elements.sourcesWiki.replaceChildren(...lines.map(({ item }) => item));
  lines.forEach(({ item, source }) => item.append(MESSAGES.sourceLoading(source.name)));

  const queue = [...lines];
  const lookUpNext = async () => {
    while (queue.length > 0) await loadSourceLine(queue.shift());
  };
  await Promise.all(Array.from({ length: SOURCES_AT_ONCE }, lookUpNext));
}

/**
 * One JoJo Wiki credit: its line, then the files it covers, each linking to its file page,
 * in a list that opens on request. Without the credits script, just the line.
 */
function createJojoCredit(credits, { summary, fallback }) {
  const section = document.createElement("div");
  const line = document.createElement("p");
  section.className = "sources__jojo";

  if (!credits) {
    line.append(`${fallback} `, createExternalLink("https://jojowiki.com/", "JoJo Wiki"), ".");
    section.append(line);
    return section;
  }

  const details = document.createElement("details");
  const label = document.createElement("summary");
  const list = document.createElement("ul");
  line.append(`${credits.credit} ${credits.license}`);
  label.textContent = summary(credits.files.length);
  list.className = "sources__files";
  credits.files.forEach((file) => {
    const item = document.createElement("li");
    item.append(createExternalLink(file.filePage, file.originalFile), ` (${file.card ?? file.shows})`);
    list.append(item);
  });
  details.append(label, list);
  section.append(line, details);
  return section;
}

/** The card art and Stand photo credits, from assets/cards/credits.js and assets/stand-photos/credits.js. */
function renderJojoSources() {
  const cardCredits = typeof CARD_CREDITS === "undefined" ? null : CARD_CREDITS;
  const photoCredits = typeof STAND_PHOTO_CREDITS === "undefined" ? null : STAND_PHOTO_CREDITS;
  elements.sourcesJojo.replaceChildren(
    createJojoCredit(cardCredits, {
      summary: (count) => `The ${count} card images`,
      fallback: "Card art from JoJo's Bizarre Adventure by Hirohiko Araki, via the",
    }),
    createJojoCredit(photoCredits, {
      summary: (count) => `The ${count} Stand photos`,
      fallback: "Stand photos from the 2014 anime JoJo's Bizarre Adventure: Stardust Crusaders, via the",
    })
  );
}

function openSources() {
  renderJojoSources();
  renderWikiSources();
  elements.sources.showModal();
  elements.sourcesHeading.focus(); // starts at the top, not on the first of many links
}

/* 8. Your position and sharing
   The Geolocation API finds the traveler; if it can't, the traveler types a city and
   Open-Meteo's geocoding API finds that instead. The Web Share API shares the result.
   ========================================================================== */

let citySearchId = 0; // the newest city search, so an older, slower answer can't win

function setPositionStatus(text) {
  elements.positionStatus.textContent = text;
}

/** Opens the city form, with a message explaining why if there is one. */
function showCityForm(message) {
  if (message) setPositionStatus(message);
  elements.cityForm.hidden = false;
  elements.cityToggle.setAttribute("aria-expanded", "true");
  elements.cityInput.focus();
}

function hideCityForm() {
  elements.cityForm.hidden = true;
  elements.cityToggle.setAttribute("aria-expanded", "false");
}

function toggleCityForm() {
  if (elements.cityForm.hidden) {
    showCityForm();
  } else {
    hideCityForm();
  }
}

function geolocationMessage(error) {
  if (error.code === error.PERMISSION_DENIED) return MESSAGES.positionDenied;
  if (error.code === error.TIMEOUT) return MESSAGES.positionTimeout;
  return MESSAGES.positionUnavailable;
}

/** Asks the browser where the traveler is. Any problem opens the city form instead. */
function locateTraveler() {
  if (state.isLocating) return;
  if (!navigator.geolocation) {
    showCityForm(MESSAGES.positionUnsupported);
    return;
  }

  const finish = () => {
    state.isLocating = false;
    elements.locateButton.setAttribute("aria-disabled", "false");
  };

  citySearchId++; // a city search still on its way shouldn't replace this answer
  state.isLocating = true;
  elements.locateButton.setAttribute("aria-disabled", "true");
  setPositionStatus(MESSAGES.positionLocating);

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      finish();
      hideCityForm();
      setTravelerPosition([coords.latitude, coords.longitude], null);
    },
    (error) => {
      finish();
      showCityForm(geolocationMessage(error));
    },
    GEOLOCATION_OPTIONS
  );
}

/**
 * Looks up a city with Open-Meteo's geocoding API. Anything after a comma narrows the
 * search, so "Paris, Texas" prefers a Paris in Texas. Resolves to null if nothing matches.
 */
async function geocodeCity(query) {
  const [name, ...qualifiers] = query.split(",").map((part) => part.trim());
  const hint = qualifiers.join(" ").trim().toLowerCase();
  const params = new URLSearchParams({ name, count: "10", language: "en", format: "json" });
  const data = await fetchJson(`${GEOCODING_API_URL}?${params}`);

  const places = (Array.isArray(data.results) ? data.results : []).filter(
    (place) => typeof place.latitude === "number" && typeof place.longitude === "number"
  );
  const preferred = hint
    ? places.find((place) =>
        [place.admin1, place.country, place.country_code].some((field) =>
          field?.toLowerCase().startsWith(hint)
        )
      )
    : null;
  return preferred ?? places[0] ?? null;
}

/** "St. Louis, Missouri, United States", without repeats like "Singapore, Singapore". */
function describePlace(place) {
  return [...new Set([place.name, place.admin1, place.country].filter(Boolean))].join(", ");
}

async function searchCity(event) {
  event.preventDefault();
  const query = elements.cityInput.value.trim();

  if (query.split(",")[0].trim().length < 2) {
    setPositionStatus(MESSAGES.cityTooShort);
    return;
  }

  const searchId = ++citySearchId;
  setPositionStatus(MESSAGES.citySearching(query));

  try {
    const place = await geocodeCity(query);
    if (searchId !== citySearchId) return;

    if (!place) {
      setPositionStatus(MESSAGES.cityNotFound(query));
      return;
    }
    hideCityForm();
    setTravelerPosition([place.latitude, place.longitude], describePlace(place));
  } catch {
    if (searchId !== citySearchId) return;
    setPositionStatus(MESSAGES.cityFailed);
  }
}

/** Remembers where the traveler is (place is null for the device's location) and shows distances. */
function setTravelerPosition(coords, place) {
  state.travelerPosition = { coords, place };
  renderPosition();
  renderStopDistance();
  updateMarkers();
}

function distanceFromDio() {
  return formatKm(distanceKm(state.travelerPosition.coords, DIO_MANSION));
}

/** "You are 10,412 km from DIO", and where that was measured from. */
function renderPosition() {
  const distance = document.createElement("strong");
  const origin = document.createElement("span");
  const { place } = state.travelerPosition;

  distance.className = "position__distance";
  distance.textContent = MESSAGES.distanceFromDio(distanceFromDio());
  origin.className = "position__origin";
  origin.textContent = place ? MESSAGES.measuredFromPlace(place) : MESSAGES.measuredFromDevice;

  elements.positionStatus.replaceChildren(distance, origin);
  elements.shareButton.hidden = false;
  elements.shareStatus.textContent = "";
  elements.shareFallback.hidden = true;
}

/** "2,891 km from you" under the place's name, once the traveler's position is known. */
function renderStopDistance() {
  const position = state.travelerPosition;
  elements.entryDistance.hidden = !position;

  if (position) {
    elements.entryDistance.textContent = MESSAGES.distanceToStop(
      formatKm(distanceKm(position.coords, PLACES[state.viewingIndex].coords))
    );
  }
}

/**
 * Shares the distance from DIO: the Web Share API where the browser has it, otherwise a
 * copy to the clipboard, otherwise the text shown ready to copy by hand.
 */
async function shareDistance() {
  if (!state.travelerPosition) return;

  const text = MESSAGES.shareText(distanceFromDio());
  elements.shareStatus.textContent = "";
  elements.shareFallback.hidden = true;

  if (navigator.share) {
    try {
      await navigator.share({ title: "50 Days to Cairo", text });
      elements.shareStatus.textContent = MESSAGES.shareShared;
      return;
    } catch (error) {
      if (error.name === "AbortError") return; // the traveler closed the share sheet
      // Any other problem falls through to copying instead
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    elements.shareStatus.textContent = MESSAGES.shareCopied;
  } catch {
    elements.shareText.value = text;
    elements.shareFallback.hidden = false;
    elements.shareText.focus();
    elements.shareText.select();
  }
}

/* 9. Journey flow
   ========================================================================== */

/** The keys of the stamps that allies bring when they join at a place. */
function allyStampKeys(placeIndex) {
  return PLACES[placeIndex].allies.map((_, allyIndex) => `${placeIndex}:ally${allyIndex}`);
}

/* The roll call: the Crusaders' cards, dealt one at a time as the journey begins */

/**
 * Everyone who travels with the Crusaders, in the order they join. Tokyo's allies are dealt
 * face up; the ones who join later (an ally met on the way, or a Stand user won over in a
 * fight) are dealt face down with a teaser.
 */
function rollCallMembers() {
  return PLACES.flatMap((place) => [
    ...place.allies.map((ally) => ({ ally, place })),
    ...place.encounters.filter((encounter) => encounter.becomesAlly).map((ally) => ({ ally, place })),
  ]).map((member) => ({ ...member, faceUp: PLACES[0].allies.includes(member.ally) }));
}

/** "Jotaro Kujo · Star Platinum · The Star", naming whatever's filled in. */
function describeCrusader(ally) {
  return [ally.standUser, ally.stand, ally.name].filter((name) => !isTodo(name)).join(" · ");
}

/** A face-down card's line: its teaser from stops.js, or where they join. */
function describeTeaser({ ally, place }) {
  return isTodo(ally.teaser) ? MESSAGES.rollCallJoinsAt(place) : ally.teaser;
}

/** One Crusader's card: their photo (or their tarot card) and who they are, or a face-down card. */
function createRollCallMember(member) {
  const { ally, faceUp } = member;
  const item = cloneTemplate(elements.rollCallMemberTemplate);
  const card = item.querySelector(".roll-call__card");
  const caption = item.querySelector(".roll-call__caption");
  const line = item.querySelector(".roll-call__line");

  if (!faceUp) {
    const hidden = document.createElement("span");
    item.classList.add("roll-call__member--face-down");
    card.innerHTML = `<svg class="roll-call__back-star" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${STAR_PATH}"/></svg>`;
    hidden.className = "visually-hidden";
    hidden.textContent = MESSAGES.rollCallFaceDown;
    caption.replaceWith(hidden);
    line.textContent = describeTeaser(member);
    return item;
  }

  // Their name, then their Stand and card: "Jotaro Kujo", "Star Platinum · The Star"
  const [user, ...rest] = describeCrusader(ally).split(" · ");
  const name = document.createElement("strong");
  const stand = document.createElement("span");
  name.className = "roll-call__name";
  name.textContent = user;
  stand.className = "roll-call__stand";
  stand.textContent = rest.join(" · ");
  caption.append(name, " ", stand);
  fillText(line, ally.description);

  // Their photo, or their tarot card if there's no photo or it won't load
  const photo = createStandPhoto(ally, { onEmpty: (empty) => empty.replaceWith(createCardArt(ally)) });
  card.append(photo ?? createCardArt(ally));
  return item;
}

/** What the roll call says as a card is dealt. */
function describeRollCallMember(member) {
  if (!member.faceUp) return `${MESSAGES.rollCallFaceDown}${describeTeaser(member)}`;
  const description = isTodo(member.ally.description) ? "" : ` ${member.ally.description}`;
  return `${describeCrusader(member.ally)}.${description}`;
}

/** The roll call opens once the intro closes, and the journey begins once it closes. */
function openRollCall() {
  const members = rollCallMembers();
  if (members.length === 0) {
    beginJourney(); // no Crusaders in stops.js yet, so there's no one to introduce
    return;
  }

  state.rollCall = { members, dealt: 0 };
  elements.rollCallKicker.textContent = `Day ${STOPS[0].day} · ${STOPS[0].name}`;
  elements.rollCallList.replaceChildren();
  elements.rollCall.showModal();

  // Reduced motion deals every card at once
  if (reducedMotion.matches) {
    const announcements = [];
    while (state.rollCall.dealt < state.rollCall.members.length) announcements.push(dealCard({ quiet: true }));
    elements.rollCallStatus.textContent = announcements.join(" ");
  } else {
    dealCard();
  }
  elements.rollCallDeal.focus();
}

/** Deals the next card onto the table, or after the last one, sets out on the journey. */
function dealCard({ quiet = false } = {}) {
  const rollCall = state.rollCall;
  if (rollCall.dealt === rollCall.members.length) {
    elements.rollCall.close();
    return "";
  }

  const member = rollCall.members[rollCall.dealt];
  const item = createRollCallMember(member);
  rollCall.dealt += 1;
  item.classList.toggle("is-dealt", !reducedMotion.matches);
  elements.rollCallList.append(item);
  if (!quiet) item.scrollIntoView({ block: "nearest" }); // dealt all at once, the table starts at the top

  const isLast = rollCall.dealt === rollCall.members.length;
  elements.rollCallDeal.textContent = isLast ? "Set out" : "Next card";
  const announcement = describeRollCallMember(member);
  if (!quiet) elements.rollCallStatus.textContent = announcement;
  return announcement;
}

function beginJourney() {
  const firstStop = STOPS[0];

  flyToPlace(0);
  elements.entryName.focus({ preventScroll: true });
  announce(
    joinSentences(
      `Day ${firstStop.day} of ${TOTAL_DAYS}. The journey begins in ${firstStop.name}.`,
      describeJoins(0),
      describeStampsCollected(PLACES[0].allies.length),
      describePlaceEncounters(0)
    )
  );
}

/**
 * Animates the trip to the next place: the next stop, or an ambush on the way that stops
 * the trip short. Once Cairo is reached, stops time and opens the ending.
 */
async function travelToNextStop() {
  if (state.isTraveling || state.isTimeStopped) return;

  if (state.reachedIndex === LAST_PLACE_INDEX) {
    if (!reducedMotion.matches) await stopTime();
    openEnding();
    return;
  }

  const fromIndex = state.reachedIndex;
  const toIndex = fromIndex + 1;

  if (map && !reducedMotion.matches) {
    state.isTraveling = true;
    renderNextButton();
    await flyToLeg(fromIndex, toIndex);
    await drawLeg(fromIndex, toIndex);
    state.isTraveling = false;
  }

  arriveAt(toIndex);
}

/** Arrives at a stop or an ambush. Allies who join here bring their stamps. */
function arriveAt(index) {
  const place = PLACES[index];

  state.reachedIndex = index;
  setTraveledRoute(routeUpTo(index));
  renderCollection({ animateKeys: allyStampKeys(index) });
  renderPlace(index, { arriving: true });
  flyToPlace(index);

  const arrival =
    place.kind === "stop"
      ? `Arrived in ${place.stop.name}. Day ${place.stop.day} of ${TOTAL_DAYS}.`
      : `${placeName(place)}: ${place.where}.`;
  announce(
    joinSentences(arrival, describeJoins(index), describeStampsCollected(place.allies.length), describePlaceEncounters(index))
  );
}

/** Shows a place the traveler has already reached. Places not reached yet are ignored. */
function revisitPlace(index, { moveFocus = false } = {}) {
  if (state.isTraveling || index > state.reachedIndex) return;

  const place = PLACES[index];
  const lookingBack =
    place.kind === "stop"
      ? `Looking back at ${place.stop.name}, day ${place.stop.day}.`
      : `Looking back at the ambush on the way to ${place.to.name}: ${place.where}.`;
  renderPlace(index);
  flyToPlace(index);
  announce(joinSentences(lookingBack, describePlaceEncounters(index)));

  if (moveFocus) elements.entryName.focus();
}

/**
 * The World stops time: a sphere of inverted color spreads out from the Face DIO button,
 * and everything freezes (animations, the map, the clock) for a few seconds. Then time
 * moves again: the clock catches up and the colors return as the sphere pulls back.
 */
async function stopTime() {
  const root = document.documentElement;
  const canInvertLayer =
    CSS.supports("backdrop-filter", "invert(1)") || CSS.supports("-webkit-backdrop-filter", "invert(1)");

  // Time stops: nothing can be pressed, and everything in motion holds still
  state.isTimeStopped = true;
  elements.pageRegions.forEach((region) => {
    region.inert = true;
  });
  root.classList.add("is-time-stopped"); // CSS animations, even ones that start during the stop
  const frozen = document
    .getAnimations()
    .filter((animation) => !(animation instanceof CSSAnimation) && animation.playState === "running");
  frozen.forEach((animation) => animation.pause()); // scripted animations and transitions
  const mapWasMoving = freezeMap();
  freezeClock();
  announce(MESSAGES.timeStopped);

  if (canInvertLayer) {
    elements.timeStop.hidden = false;
    await animateSphere("out");
  } else {
    root.classList.add("is-inverted");
  }
  await wait(TIME_STOP_HOLD_MS);

  // Time moves again
  root.classList.remove("is-time-stopped");
  frozen.filter((animation) => animation.playState === "paused").forEach((animation) => animation.play());
  if (mapWasMoving) flyToPlace(state.viewingIndex);
  unfreezeClock();
  announce(MESSAGES.timeResumed);

  if (canInvertLayer) {
    await animateSphere("back");
    elements.timeStop.hidden = true;
    elements.timeStop.getAnimations().forEach((animation) => animation.cancel());
  } else {
    root.classList.remove("is-inverted");
  }

  elements.pageRegions.forEach((region) => {
    region.inert = false;
  });
  elements.nextButton.focus({ preventScroll: true }); // closing the ending returns focus here
  state.isTimeStopped = false;
}

/** Spreads the time stop's sphere out from the Face DIO button to the farthest corner, or pulls it back. */
function animateSphere(direction) {
  const button = elements.nextButton.getBoundingClientRect();
  const x = button.left + button.width / 2;
  const y = button.top + button.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const keyframes = [
    { clipPath: `circle(0px at ${x}px ${y}px)` },
    { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
  ];

  return elements.timeStop.animate(direction === "out" ? keyframes : keyframes.reverse(), {
    duration: TIME_STOP_SPREAD_MS,
    easing: direction === "out" ? "ease-out" : "ease-in",
    fill: "forwards",
  }).finished;
}

function openEnding() {
  const finalStop = STOPS[LAST_STOP_INDEX];

  elements.endingDay.textContent = `Day ${finalStop.day} of ${TOTAL_DAYS}`;
  elements.endingStops.textContent = STOPS.length;
  elements.endingDistance.textContent = formatKm(routeLengthKm());
  elements.endingTarot.textContent = `${countCollected("tarot")} of ${countCards("tarot")}`;
  elements.endingGods.textContent = `${countCollected("god")} of ${countCards("god")}`;
  elements.endingStands.textContent = `${countCollected("stand")} of ${countCards("stand")}`;

  // Clear the last button's value so closing with Escape doesn't count as "restart"
  elements.ending.returnValue = "";
  elements.ending.showModal();
}

function restartJourney() {
  const firstStop = STOPS[0];

  state.reachedIndex = 0;
  state.revealed.clear(); // every card goes back face down, and only the first allies remain
  setTraveledRoute(routeUpTo(0));
  renderCollection();
  renderPlace(0);
  flyToPlace(0);
  elements.entryName.focus({ preventScroll: true });
  announce(
    joinSentences(
      `A new journey begins in ${firstStop.name}.`,
      describeJoins(0),
      describeStampsCollected(PLACES[0].allies.length),
      describePlaceEncounters(0)
    )
  );
}

/* 10. Start-up
   ========================================================================== */

function addEventListeners() {
  elements.nextButton.addEventListener("click", travelToNextStop);
  elements.locateButton.addEventListener("click", locateTraveler);
  elements.cityToggle.addEventListener("click", toggleCityForm);
  elements.cityForm.addEventListener("submit", searchCity);
  elements.shareButton.addEventListener("click", shareDistance);
  elements.revealAllButton.addEventListener("click", revealAllEncounters);
  elements.sourcesButton.addEventListener("click", openSources);

  // The spread is rebuilt for every place, so one listener on it turns cards over and opens them
  elements.encounterList.addEventListener("click", (event) => {
    const back = event.target.closest(".encounter__back");
    const card = event.target.closest(".spread-card");
    if (back) revealEncounter(Number(back.dataset.index));
    if (card) openSpreadCard(Number(card.dataset.index), card);
  });

  // The card view: the card itself and its button turn it over; the arrows move between cards
  elements.cardViewFront.addEventListener("click", turnCardView);
  elements.cardViewTurn.addEventListener("click", turnCardView);
  elements.cardViewBack.addEventListener("click", (event) => {
    // The photo opens full screen. Clicking the dossier's empty space turns it back, but not
    // a link, a button, or selected text.
    const photo = event.target.closest(".dossier__photo");
    if (photo) openStandPhotoViewer(cardInView(), photo);
    else if (!event.target.closest("a, button") && !window.getSelection().toString()) turnCardView();
  });
  elements.cardViewPrev.addEventListener("click", () => stepCardView(-1));
  elements.cardViewNext.addEventListener("click", () => stepCardView(1));
  elements.cardViewClose.addEventListener("click", () => elements.cardView.close());
  elements.cardView.addEventListener("click", (event) => {
    // A click outside the card and its controls lands on the dialog's own backdrop area
    if (event.target === elements.cardView || event.target.classList.contains("card-view__layout")) {
      elements.cardView.close();
    }
  });
  elements.cardView.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") stepCardView(-1);
    if (event.key === "ArrowRight") stepCardView(1);
  });
  elements.cardView.addEventListener("close", closedCardView);

  // The photo viewer closes from its button, Escape, or a click beside the photo
  elements.photoViewerClose.addEventListener("click", () => elements.photoViewer.close());
  elements.photoViewer.addEventListener("click", (event) => {
    if (event.target === elements.photoViewer || event.target.classList.contains("photo-viewer__layout")) {
      elements.photoViewer.close();
    }
  });
  elements.photoViewer.addEventListener("close", closedPhotoViewer);

  // Stamps are rebuilt as the journey goes on, so one listener on the collection opens them all
  elements.collection.addEventListener("click", (event) => {
    const stampButton = event.target.closest(".stamp__button");
    if (stampButton) openStampCard(stampButton);
  });

  // The intro closes from its button or the Escape key; either way the roll call follows,
  // and once it closes (Set out, Skip, or Escape) the journey starts
  elements.intro.addEventListener("close", openRollCall);
  elements.rollCallDeal.addEventListener("click", () => dealCard());
  elements.rollCallSkip.addEventListener("click", () => elements.rollCall.close());
  elements.rollCall.addEventListener("keydown", (event) => {
    // Enter or Space deals the next card from anywhere on the table, not only from its button
    const onControl = event.target.closest("a, button, summary");
    if (!onControl && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      dealCard();
    }
  });
  elements.rollCall.addEventListener("close", () => {
    state.rollCall = null;
    beginJourney();
  });

  elements.ending.addEventListener("close", () => {
    if (elements.ending.returnValue === "restart") restartJourney();
  });
}

function init() {
  // Leaflet comes from a CDN. If it didn't load, the journal still works without the map.
  if (typeof L === "undefined") {
    showMapNotice(MESSAGES.mapLibraryFailed);
  } else {
    initMap();
    drawRoute();
    addPlaceMarkers();
  }

  renderCollection();
  renderPlace(0);
  addEventListeners();
  elements.intro.showModal();
}

document.addEventListener("DOMContentLoaded", init);
