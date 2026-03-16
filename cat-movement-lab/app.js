const $ = (sel) => /** @type {HTMLElement} */ (document.querySelector(sel));
const $$ = (sel) => /** @type {HTMLElement[]} */ (Array.from(document.querySelectorAll(sel)));

const stage = $("#stage");
const catRoot = $("#catRoot");
const mount = $("#catSvgMount");
const statusText = $("#statusText");

const partSelect = /** @type {HTMLSelectElement} */ ($("#partSelect"));
const toggleDragBtn = $("#toggleDrag");
const resetPartBtn = $("#resetPart");
const resetAllBtn = $("#resetAll");

const xRange = /** @type {HTMLInputElement} */ ($("#xRange"));
const yRange = /** @type {HTMLInputElement} */ ($("#yRange"));
const rotRange = /** @type {HTMLInputElement} */ ($("#rotRange"));
const sxRange = /** @type {HTMLInputElement} */ ($("#sxRange"));
const syRange = /** @type {HTMLInputElement} */ ($("#syRange"));
const opRange = /** @type {HTMLInputElement} */ ($("#opRange"));

const xNum = /** @type {HTMLInputElement} */ ($("#xNum"));
const yNum = /** @type {HTMLInputElement} */ ($("#yNum"));
const rotNum = /** @type {HTMLInputElement} */ ($("#rotNum"));
const sxNum = /** @type {HTMLInputElement} */ ($("#sxNum"));
const syNum = /** @type {HTMLInputElement} */ ($("#syNum"));
const opNum = /** @type {HTMLInputElement} */ ($("#opNum"));

const fillColor = /** @type {HTMLInputElement} */ ($("#fillColor"));
const fillText = /** @type {HTMLInputElement} */ ($("#fillText"));
const strokeColor = /** @type {HTMLInputElement} */ ($("#strokeColor"));
const strokeText = /** @type {HTMLInputElement} */ ($("#strokeText"));

const duplicatePartBtn = $("#duplicatePart");
const duplicateIdInput = /** @type {HTMLInputElement} */ ($("#duplicateId"));

const breathDur = /** @type {HTMLInputElement} */ ($("#breathDur"));
const breathDurNum = /** @type {HTMLInputElement} */ ($("#breathDurNum"));
const poseMult = /** @type {HTMLInputElement} */ ($("#poseMult"));
const poseMultNum = /** @type {HTMLInputElement} */ ($("#poseMultNum"));

const poseBar = $("#poseBar");
const autoCycleBtn = $("#autoCycle");
const selfTestBtn = $("#selfTest");
const copyJsonBtn = $("#copyJson");
const downloadJsonBtn = $("#downloadJson");
const copyCssBtn = $("#copyCss");

const movementPreset = /** @type {HTMLSelectElement} */ ($("#movementPreset"));
const loadPresetBtn = $("#loadPreset");
const toggleTimelineBtn = $("#toggleTimeline");
const playTimelineBtn = $("#playTimeline");
const stopTimelineBtn = $("#stopTimeline");
const fpsRange = /** @type {HTMLInputElement} */ ($("#fpsRange"));
const fpsNum = /** @type {HTMLInputElement} */ ($("#fpsNum"));
const toggleLoopBtn = $("#toggleLoop");
const frameRange = /** @type {HTMLInputElement} */ ($("#frameRange"));
const frameNum = /** @type {HTMLInputElement} */ ($("#frameNum"));
const frameLabel = $("#frameLabel");
const prevFrameBtn = $("#prevFrame");
const nextFrameBtn = $("#nextFrame");
const addFrameBtn = $("#addFrame");
const dupFrameBtn = $("#dupFrame");
const delFrameBtn = $("#delFrame");
const captureFrameBtn = $("#captureFrame");

const toggleAwakeBtn = $("#toggleAwake");
const toggleBreathBtn = $("#toggleBreath");

const movementBar = $("#movementBar");
const quickPoseBar = $("#quickPoseBar");
const playActiveMovementBtn = $("#playActiveMovement");
const stopActiveMovementBtn = $("#stopActiveMovement");
const movementNameInput = /** @type {HTMLInputElement} */ ($("#movementName"));
const addMovementBtn = $("#addMovement");
const renameMovementBtn = $("#renameMovement");
const deleteMovementBtn = $("#deleteMovement");
const recordFrameBtn = $("#recordFrame");
const clearFramesBtn = $("#clearFrames");

const loadMotionBtn = $("#loadMotion");
const saveMotionBtn = $("#saveMotion");
const motionStatus = $("#motionStatus");
const motionSleepGap = /** @type {HTMLInputElement} */ ($("#motionSleepGap"));
const addCycleStepBtn = $("#addCycleStep");
const cycleEditor = $("#cycleEditor");

/** Cat SVG (inline) */
const CAT_SVG = `<svg width="45.952225mm" height="35.678726mm" viewBox="0 0 45.952225 35.678726" version="1.1" xmlns="http://www.w3.org/2000/svg"><g style="display:inline" transform="translate(-121.80376,-101.90461)"><path id="head" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 144.95859,104.74193 c 6.01466,-2.1201 14.02915,-0.85215 17.62787,2.77812 3.59872,3.63027 2.91927,7.6226 -0.0661,11.80703 -2.98542,4.18443 -9.54667,3.58363 -15.1474,3.43959 -5.60073,-0.14404 -10.30411,-0.0586 -11.67474,-3.9026 7.85671,-2.22341 3.24576,-12.00205 9.26042,-14.12214 z"/><path id="paw-front-right" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 156.30732,121.30486 c 0,0 -3.82398,2.52741 -4.14054,3.7997 -0.31656,1.2723 0.31438,2.18109 0.95701,2.55128 0.64264,0.3702 1.59106,-0.085 2.13559,-0.75306 0.54452,-0.6681 1.5629,-2.25488 2.47945,-3.20579 0.91654,-0.95091 2.96407,-2.74361 2.96407,-2.74361 l 0.73711,-3.60348 z"/><path id="paw-front-left" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 136.93356,123.08347 c 0,0 -3.20149,3.2804 -3.24123,4.59088 -0.0397,1.31049 0.60411,1.83341 1.3106,2.05901 0.7065,0.22559 1.60304,-0.55255 1.99363,-1.32084 0.39056,-0.76832 1.14875,-2.30337 2.04139,-3.29463 0.89264,-0.99126 3.37363,-3.37561 3.37363,-3.37561 l -1.30007,-3.61169 z"/><path id="paw-back" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 130.12859,121.60522 c -2.15849,1.92962 -3.38576,3.23532 -3.61836,4.5256 -0.23257,1.2903 0.0956,1.80324 0.76105,2.13059 0.66549,0.32733 1.66701,-0.31006 2.16665,-1.01233 0.49961,-0.70231 1.04598,-1.14963 2.83575,-3.05671 1.78977,-1.90708 5.91823,-3.27102 5.91823,-3.27102 l -0.75313,-3.99546 c 0,0 -5.15171,2.7497 -7.31019,4.67933 z"/><path style="display:inline;fill:#000000;stroke:none;stroke-width:0.292536;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:0.988235" id="path5" d="m 147.59927,113.85404 c 0.68896,4.40837 -4.04042,7.93759 -10.51533,8.9455 -6.47491,1.00791 -12.24344,-0.88717 -12.9324,-5.29555 -0.68895,-4.40838 3.44199,-9.94186 9.9169,-10.94977 6.47491,-1.0079 12.84186,2.89144 13.53083,7.29982 z"/><path id="ear-left" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 126.36446,111.82609 c 0,0 -2.37067,-6.28072 -0.86724,-7.10855 1.50342,-0.82783 5.87139,3.72617 5.87139,3.72617 z"/><path id="ear-right" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 143.50182,108.85407 c 0,0 -0.0544,-6.71302 -1.75519,-6.94283 -1.70081,-0.22982 -4.13211,5.59314 -4.13211,5.59314 z"/><g style="display:inline"><path style="fill:none;stroke:#000000;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 125.27102,116.06007 -2.97783,-1.05373"/><path style="fill:none;stroke:#000000;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 124.91643,116.80991 -2.84808,0.0754"/><path style="fill:none;stroke:#000000;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 124.97798,118.00308 -2.53111,0.5156"/></g><ellipse style="display:inline;fill:#ffffff;stroke:none;stroke-width:0.56967;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="142.61723" cy="108.6707" rx="3.0261719" ry="3.0757811" transform="rotate(1.8105864)"/><ellipse style="display:inline;fill:#000000;stroke:none;stroke-width:0.597086;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="112.57543" cy="138.29808" rx="1.0380507" ry="1.3097118" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="display:inline;fill:#f9f9f9;fill-opacity:1;stroke:none;stroke-width:0.184905;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="112.70263" cy="137.817" rx="0.32146212" ry="0.40558979" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="display:inline;fill:#ffffff;stroke:none;stroke-width:0.56967;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="135.40735" cy="110.12592" rx="3.0261719" ry="3.0757811" transform="rotate(1.8105864)"/><ellipse style="display:inline;fill:#000000;stroke:none;stroke-width:0.597086;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="105.22613" cy="138.07497" rx="1.0380507" ry="1.3097118" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="display:inline;fill:#f9f9f9;fill-opacity:1;stroke:none;stroke-width:0.184905;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="105.35332" cy="137.59389" rx="0.32146212" ry="0.40558979" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><path style="display:inline;fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 163.77708,109.27292 c 4.36563,2.71198 4.26447,17.63497 3.70417,21.03437 -0.5603,3.3994 -1.86906,4.06275 -4.53099,4.49791 -5.87463,0.96037 -8.39724,-5.87134 -5.7547,-5.72161 2.64254,0.14973 3.15958,3.46446 5.95314,2.05052 2.79356,-1.41394 -1.42214,-13.46068 -1.42214,-13.46068 z" id="tail"/><g id="lefteyelid" style="display:inline"><ellipse style="fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="131.94429" cy="114.29948" rx="3.1571214" ry="3.2155864"/><path style="fill:#000000;fill-opacity:1;stroke:#ffffff;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 129.32504,114.80228 c 2.54908,-1.14592 4.60706,-0.65481 4.60706,-0.65481"/></g><g id="righteyelid" style="display:inline"><ellipse style="fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="139.07704" cy="113.0834" rx="3.1571214" ry="3.2155864"/><path style="fill:#000000;fill-opacity:1;stroke:#ffffff;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 136.48089,113.70683 c 2.48528,-1.2784 4.56624,-0.89621 4.56624,-0.89621"/></g><g id="eyesdown"><ellipse style="fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="139.12122" cy="113.61373" rx="1.8686198" ry="2.0422525"/><ellipse style="fill:#000000;stroke:none;stroke-width:0.597086;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="112.24622" cy="139.77037" rx="1.0380507" ry="1.3097118" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="fill:#f9f9f9;fill-opacity:1;stroke:none;stroke-width:0.184905;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="112.37342" cy="139.28929" rx="0.32146212" ry="0.40558979" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="131.994" cy="114.92011" rx="1.8686198" ry="2.0422525"/><ellipse style="fill:#000000;stroke:none;stroke-width:0.597086;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="105.00267" cy="139.64998" rx="1.0380507" ry="1.3097118" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/><ellipse style="fill:#f9f9f9;fill-opacity:1;stroke:none;stroke-width:0.184905;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" cx="105.12987" cy="139.1689" rx="0.32146212" ry="0.40558979" transform="matrix(0.98048242,-0.19660678,0.20800608,0.97812753,0,0)"/></g><path id="longtail" style="display:inline;fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.529167;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" d="m 164.24062,110.09354 -2.10788,6.5381 c 0,0 0.84017,12.88397 0.35269,20.95169 h 4.78291 c 0.83489,-8.63528 0.13334,-24.78453 -3.02772,-27.48979 z"/></g></svg>`;

function buildSvgWithDefaultExtraParts(svg) {
  // Default extra part: 2nd back paw (same idea as in the app copy).
  const backPaw2 =
    '<path id="paw-back-2" style="display:inline;fill:#000000;stroke:none;stroke-width:0.264583;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:0.988235" transform="translate(16.2,3.65) rotate(6) scale(0.88)" d="m 130.12859,121.60522 c -2.15849,1.92962 -3.38576,3.23532 -3.61836,4.5256 -0.23257,1.2903 0.0956,1.80324 0.76105,2.13059 0.66549,0.32733 1.66701,-0.31006 2.16665,-1.01233 0.49961,-0.70231 1.04598,-1.14963 2.83575,-3.05671 1.78977,-1.90708 5.91823,-3.27102 5.91823,-3.27102 l -0.75313,-3.99546 c 0,0 -5.15171,2.7497 -7.31019,4.67933 z"/>';

  return svg.replace(/(<path id="paw-back"[^>]*>)/, `${backPaw2}$1`);
}

mount.innerHTML = buildSvgWithDefaultExtraParts(CAT_SVG);
const svgEl = /** @type {SVGSVGElement} */ (mount.querySelector("svg"));
// Ensure we can address whole-body motion in frames.
const innerG = svgEl.querySelector("g");
if (innerG && !innerG.getAttribute("id")) innerG.setAttribute("id", "cat-group");

const editableSelector = [
  "#cat-group",
  "#head",
  "#path5",
  "#ear-left",
  "#ear-right",
  "#paw-front-left",
  "#paw-front-right",
  "#paw-back",
  "#paw-back-2",
  "#tail",
  "#longtail",
  "#lefteyelid",
  "#righteyelid",
  "#eyesdown",
].join(",");

const PART_NAMES = {
  "cat-group": "Cuerpo completo",
  head: "Cabeza",
  path5: "Barriga / Torso",
  "ear-left": "Oreja izquierda",
  "ear-right": "Oreja derecha",
  // Labels based on how the current drawing reads visually (user validated).
  "paw-front-left": "Pata delantera derecha",
  "paw-front-right": "Pata delantera izquierda",
  "paw-back": "Pata delantera izquierda",
  "paw-back-2": "Pata trasera derecha",
  tail: "Cola (curva)",
  longtail: "Cola (larga)",
  lefteyelid: "Parpado izquierdo",
  righteyelid: "Parpado derecho",
  eyesdown: "Ojos (abiertos)",
};

function partLabel(id) {
  return PART_NAMES[id] ? `${PART_NAMES[id]} (${id})` : id;
}

/** @type {Map<string, HTMLElement>} */
const parts = new Map();

/** State for per-part overrides */
const DEFAULT_PART_STATE = {
  x: 0,
  y: 0,
  r: 0,
  sx: 1,
  sy: 1,
  opacity: 1,
  fill: "",
  stroke: "",
};

/** @type {Record<string, typeof DEFAULT_PART_STATE>} */
const state = {};
/** @type {Record<string, typeof DEFAULT_PART_STATE>} */
const initial = {};

let selectedId = "";
let dragEnabled = false;
let autoEnabled = true;
let breathingEnabled = true;
let awakeEnabled = false;
let timelineEnabled = true;

/** @type {Record<string, {fps: number, loop: boolean, frames: {name: string, durationMs: number, parts: Record<string, any>}[]}>} */
let movements = {
  breathing: { fps: 12, loop: true, frames: [] },
  walking: { fps: 12, loop: true, frames: [] },
  standing: { fps: 12, loop: true, frames: [] },
  angry: { fps: 12, loop: true, frames: [] },
  cleaning: { fps: 12, loop: true, frames: [] },
  pouncing: { fps: 12, loop: true, frames: [] },
};
let activeMovement = "breathing";

/** Active timeline state (points to movements[activeMovement]) */
let timeline = {
  fps: 12,
  loop: true,
  frames: /** @type {{name: string, durationMs: number, parts: Record<string, any>}[]} */ ([]),
};
let frameIndex = 0;
let isPlayingTimeline = false;
let rafId = 0;
let playFrameStart = 0;

const POSES = [
  { id: "", label: "Sleep", cls: "" },
  { id: "is-walking", label: "Walking", cls: "is-walking" },
  { id: "is-standing", label: "Standing", cls: "is-standing" },
  { id: "is-angry", label: "Angry", cls: "is-angry" },
  { id: "is-cleaning", label: "Cleaning", cls: "is-cleaning" },
  { id: "is-pouncing", label: "Pouncing", cls: "is-pouncing" },
];

const MOTION_POSES = [
  "is-walking",
  "is-standing",
  "is-angry",
  "is-cleaning",
  "is-pouncing",
];

let activePose = "";
/** @type {number[]} */
let cycleTimers = [];

/** @type {any} */
let motionCfg = null;

function setStatus(text) {
  statusText.textContent = text;
}

function setMotionStatus(text) {
  if (!motionStatus) return;
  motionStatus.textContent = text || "";
}

function sanitizeMovementName(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "";
  // Allow a-z, 0-9, dash, underscore.
  return s.replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function ensureMovement(name) {
  const key = sanitizeMovementName(name);
  if (!key) return "";
  if (!movements[key]) {
    movements[key] = { fps: 12, loop: true, frames: [] };
  }
  return key;
}

function getActiveTimeline() {
  if (!movements[activeMovement]) ensureMovement(activeMovement);
  return movements[activeMovement];
}

function setActiveMovement(name) {
  const key = ensureMovement(name);
  if (!key) return;
  activeMovement = key;
  timeline = getActiveTimeline();

  movementNameInput.value = activeMovement;
  renderMovementButtons();

  // Apply current movement timeline to UI
  timeline.fps = Number(timeline.fps || 12) || 12;
  timeline.loop = typeof timeline.loop === "boolean" ? timeline.loop : true;
  fpsRange.value = String(timeline.fps);
  fpsNum.value = String(timeline.fps);
  toggleLoopBtn.textContent = `Loop: ${timeline.loop ? "On" : "Off"}`;
  toggleLoopBtn.classList.toggle("is-active", timeline.loop);

  // Only apply frames if timeline mode is enabled (otherwise we stay in CSS mode).
  if (timelineEnabled) {
    const hasFrames = Array.isArray(timeline.frames) && timeline.frames.length;
    const presetKinds = ["breathing", "walking", "standing", "angry", "cleaning", "pouncing"];
    const preset = presetKinds.includes(activeMovement) ? activeMovement : "breathing";
    setFrames(hasFrames ? timeline.frames : makePresetFrames(preset));
  }
}

function renderMovementButtons() {
  if (!movementBar) return;
  const keys = Object.keys(movements).sort((a, b) => a.localeCompare(b));
  movementBar.innerHTML = keys
    .map(
      (k) =>
        `<button type="button" class="btn mini ${k === activeMovement ? "is-active" : ""}" data-movement="${k}">${k}</button>`,
    )
    .join("");
}

function renderQuickPoseButtons() {
  if (!quickPoseBar) return;
  const presets = [
    { id: "breathing", label: "Breathing" },
    { id: "walking", label: "Walking" },
    { id: "standing", label: "Standing" },
    { id: "angry", label: "Angry" },
    { id: "cleaning", label: "Cleaning" },
    { id: "pouncing", label: "Pouncing" },
  ];
  quickPoseBar.innerHTML = presets
    .map(
      (p) =>
        `<button type="button" class="btn mini secondary" data-quickpose="${p.id}">${p.label}</button>`,
    )
    .join("");
}

function defaultMotionConfig() {
  return {
    version: 1,
    defaults: {
      breathSeconds: Number(breathDur?.value || 3.9) || 3.9,
      poseMult: Number(poseMult?.value || 1.35) || 1.35,
    },
    extraParts: {
      pawBack2: {
        translateX: 16.2,
        translateY: 3.65,
        rotateDeg: 6,
        scale: 0.88,
        opacity: 0.58,
      },
    },
    cycle: {
      sleepGapMs: 500,
      steps: [
        { pose: "is-walking", durationMs: 3200 },
        { pose: "is-standing", durationMs: 2800 },
        { pose: "is-angry", durationMs: 2400 },
        { pose: "is-cleaning", durationMs: 2600 },
        { pose: "is-pouncing", durationMs: 2400 },
      ],
    },
  };
}

function normalizeMotionConfig(raw) {
  const base = defaultMotionConfig();
  if (!raw || typeof raw !== "object") return base;
  const out = JSON.parse(JSON.stringify(base));
  if (typeof raw.version === "number") out.version = raw.version;
  if (raw.defaults && typeof raw.defaults === "object") {
    if (typeof raw.defaults.breathSeconds === "number") out.defaults.breathSeconds = raw.defaults.breathSeconds;
    if (typeof raw.defaults.poseMult === "number") out.defaults.poseMult = raw.defaults.poseMult;
  }
  if (raw.extraParts && typeof raw.extraParts === "object") {
    const p = raw.extraParts.pawBack2;
    if (p && typeof p === "object") {
      if (typeof p.translateX === "number") out.extraParts.pawBack2.translateX = p.translateX;
      if (typeof p.translateY === "number") out.extraParts.pawBack2.translateY = p.translateY;
      if (typeof p.rotateDeg === "number") out.extraParts.pawBack2.rotateDeg = p.rotateDeg;
      if (typeof p.scale === "number") out.extraParts.pawBack2.scale = p.scale;
      if (typeof p.scaleX === "number") out.extraParts.pawBack2.scaleX = p.scaleX;
      if (typeof p.scaleY === "number") out.extraParts.pawBack2.scaleY = p.scaleY;
      if (typeof p.opacity === "number") out.extraParts.pawBack2.opacity = p.opacity;
    }
  }
  if (raw.cycle && typeof raw.cycle === "object") {
    if (typeof raw.cycle.sleepGapMs === "number") out.cycle.sleepGapMs = raw.cycle.sleepGapMs;
    if (Array.isArray(raw.cycle.steps)) {
      const steps = raw.cycle.steps
        .map((s) => ({
          pose: String(s?.pose || ""),
          durationMs: Number(s?.durationMs || 0) || 0,
        }))
        .filter((s) => MOTION_POSES.includes(s.pose) && s.durationMs > 0);
      if (steps.length) out.cycle.steps = steps;
    }
  }
  return out;
}

function renderCycleEditor() {
  if (!cycleEditor) return;
  const steps = motionCfg?.cycle?.steps || [];
  cycleEditor.innerHTML = steps
    .map((s, idx) => {
      const poseOptions = MOTION_POSES.map(
        (p) => `<option value="${p}" ${p === s.pose ? "selected" : ""}>${p}</option>`,
      ).join("");
      const dur = Number(s.durationMs || 0) || 0;
      return `
        <div class="cycle-step" data-idx="${idx}">
          <label style="min-width: 48px">#${idx + 1}</label>
          <select data-role="pose">${poseOptions}</select>
          <label>ms</label>
          <input data-role="ms" type="number" step="50" min="100" value="${dur}" />
          <button class="btn mini secondary" type="button" data-role="del">Delete</button>
        </div>
      `;
    })
    .join("");
}

function readCycleEditorSteps() {
  if (!cycleEditor) return [];
  const rows = Array.from(cycleEditor.querySelectorAll(".cycle-step"));
  return rows
    .map((row) => {
      const poseEl = /** @type {HTMLSelectElement|null} */ (row.querySelector('[data-role="pose"]'));
      const msEl = /** @type {HTMLInputElement|null} */ (row.querySelector('[data-role="ms"]'));
      const pose = String(poseEl?.value || "");
      const durationMs = Number(msEl?.value || 0) || 0;
      return { pose, durationMs };
    })
    .filter((s) => MOTION_POSES.includes(s.pose) && s.durationMs > 0);
}

function applyMotionToLab(cfg) {
  motionCfg = normalizeMotionConfig(cfg);

  const breath = Number(motionCfg.defaults?.breathSeconds || 3.9) || 3.9;
  const mult = Number(motionCfg.defaults?.poseMult || 1.35) || 1.35;

  breathDur.value = String(breath);
  breathDurNum.value = String(breath);
  catRoot.style.setProperty("--kp-cat-breath", `${breath}s`);

  poseMult.value = String(mult);
  poseMultNum.value = String(mult);
  catRoot.style.setProperty("--kp-cat-pose-mult", String(mult));

  if (motionSleepGap) motionSleepGap.value = String(motionCfg.cycle?.sleepGapMs ?? 500);

  // Apply extra paw placement from config (treat as baseline).
  const paw = motionCfg.extraParts?.pawBack2;
  const pawEl = parts.get("paw-back-2");
  if (pawEl) {
    const tx = Number(paw?.translateX ?? 16.2) || 0;
    const ty = Number(paw?.translateY ?? 3.65) || 0;
    const rot = Number(paw?.rotateDeg ?? 6) || 0;
    const sx = Number(paw?.scaleX ?? paw?.scale ?? 0.88) || 1;
    const sy = Number(paw?.scaleY ?? paw?.scale ?? 0.88) || 1;
    const op = typeof paw?.opacity === "number" ? paw.opacity : 0.58;
    state["paw-back-2"] = { ...DEFAULT_PART_STATE, x: tx, y: ty, r: rot, sx, sy, opacity: op };
    initial["paw-back-2"] = { ...state["paw-back-2"] };
    applyTransformToEl(pawEl, state["paw-back-2"]);
  }

  renderCycleEditor();
  if (selectedId) syncUiFromState(selectedId);

  // Optional: load last saved authoring timeline (frames).
  const savedMovements = cfg?.authoring?.movements;
  if (savedMovements && typeof savedMovements === "object") {
    movements = {};
    for (const k of Object.keys(savedMovements)) {
      const name = sanitizeMovementName(k);
      if (!name) continue;
      const tl = savedMovements[k];
      if (!tl || typeof tl !== "object") continue;
      const frames = Array.isArray(tl.frames) ? tl.frames : [];
      movements[name] = {
        fps: Number(tl.fps || 12) || 12,
        loop: typeof tl.loop === "boolean" ? tl.loop : true,
        frames,
      };
    }
  }

  // Back-compat: single timeline saved previously.
  const savedTl = cfg?.authoring?.timeline;
  if ((!movements || !Object.keys(movements).length) && savedTl && typeof savedTl === "object") {
    movements = {
      breathing: {
        fps: Number(savedTl.fps || 12) || 12,
        loop: typeof savedTl.loop === "boolean" ? savedTl.loop : true,
        frames: Array.isArray(savedTl.frames) ? savedTl.frames : [],
      },
    };
  }

  // Ensure built-ins exist.
  for (const m of ["breathing", "walking", "standing", "angry", "cleaning", "pouncing"]) {
    ensureMovement(m);
  }

  const selected = sanitizeMovementName(cfg?.authoring?.selectedMovement) || "breathing";
  activeMovement = movements[selected] ? selected : "breathing";
  renderMovementButtons();
  movementNameInput.value = activeMovement;

  // Default lab UX: start in CSS mode (breathing visible). User can enable Timeline when editing frames.
  if (timelineEnabled) setTimelineEnabled(false);
  setAwake(false);
  setBreathing(true);
  setPose("");
}

async function loadMotionFromApp() {
  try {
    setMotionStatus("Loading...");
    const res = await fetch("/api/motion", { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    applyMotionToLab(json);
    setMotionStatus("Loaded");
    setStatus("Loaded motion config from app");
    // Keep auto-cycle in sync.
    if (autoEnabled) runAutoCycle();
  } catch {
    // Fallback to defaults without breaking the lab.
    applyMotionToLab(defaultMotionConfig());
    setMotionStatus("Using defaults (no app file?)");
  }
}

async function saveMotionToApp() {
  const cfg = normalizeMotionConfig(motionCfg || defaultMotionConfig());
  cfg.defaults.breathSeconds = Number(breathDur.value) || cfg.defaults.breathSeconds;
  cfg.defaults.poseMult = Number(poseMult.value) || cfg.defaults.poseMult;
  cfg.cycle.sleepGapMs = Number(motionSleepGap?.value || cfg.cycle.sleepGapMs) || 0;
  const nextSteps = readCycleEditorSteps();
  if (nextSteps.length) cfg.cycle.steps = nextSteps;

  const paw = state["paw-back-2"];
  if (paw) {
    cfg.extraParts = cfg.extraParts || {};
    cfg.extraParts.pawBack2 = {
      translateX: Number(paw.x) || 0,
      translateY: Number(paw.y) || 0,
      rotateDeg: Number(paw.r) || 0,
      scale: Number(paw.sx) || 1,
      scaleX: Number(paw.sx) || 1,
      scaleY: Number(paw.sy) || 1,
      opacity: typeof paw.opacity === "number" ? paw.opacity : 0.58,
    };
  }

  cfg.authoring = {
    savedAt: new Date().toISOString(),
    selectedMovement: activeMovement,
    movements,
    // Back-compat: keep last active timeline too.
    timeline: movements?.[activeMovement] || timeline,
  };

  try {
    setMotionStatus("Saving...");
    const res = await fetch("/api/motion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    motionCfg = cfg;
    setMotionStatus("Saved");
    setStatus("Saved motion config to app");
    if (autoEnabled) runAutoCycle();
  } catch {
    setMotionStatus("Save failed");
    setStatus("Save failed (see console / server)");
  }
}

function clampColor(hex) {
  const h = (hex || "").trim();
  if (!h) return "";
  if (/^#[0-9a-fA-F]{6}$/.test(h)) return h;
  return "";
}

function parseNumberLoose(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return NaN;
  // Allow comma decimals in es-* locales.
  const normalized = s.replace(",", ".");
  return Number(normalized);
}

function cssColorToHex(value) {
  const v = String(value || "").trim();
  if (!v || v === "none") return "";
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  const m = v.match(/^rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
  if (m) {
    const r = Math.max(0, Math.min(255, Number(m[1]) || 0));
    const g = Math.max(0, Math.min(255, Number(m[2]) || 0));
    const b = Math.max(0, Math.min(255, Number(m[3]) || 0));
    const to2 = (n) => n.toString(16).padStart(2, "0");
    return `#${to2(r)}${to2(g)}${to2(b)}`;
  }
  return "";
}

function hexFromCssColor(value) {
  return cssColorToHex(value) || "#000000";
}

function applyTransformToEl(el, st) {
  // Use CSS transform so we can rely on transform-origin/transform-box (matches app).
  const t = `translate(${st.x}px, ${st.y}px) rotate(${st.r}deg) scale(${st.sx}, ${st.sy})`;
  el.style.transform = t;
  if (typeof st.opacity === "number") el.style.opacity = String(st.opacity);
  if (typeof st.fill === "string") {
    if (st.fill) el.style.fill = st.fill;
    else el.style.removeProperty("fill");
  }
  if (typeof st.stroke === "string") {
    if (st.stroke) el.style.stroke = st.stroke;
    else el.style.removeProperty("stroke");
  }
}

function parseTransformAttr(raw) {
  const out = { x: 0, y: 0, r: 0, sx: 1, sy: 1 };
  const t = (raw || "").trim();
  if (!t) return out;

  const mt = t.match(/translate\(([-0-9.]+)(?:[ ,]+([-0-9.]+))?\)/);
  if (mt) {
    out.x = Number(mt[1] || 0) || 0;
    out.y = Number(mt[2] || 0) || 0;
  }
  const mr = t.match(/rotate\(([-0-9.]+)\)/);
  if (mr) out.r = Number(mr[1] || 0) || 0;

  const ms = t.match(/scale\(([-0-9.]+)(?:[ ,]+([-0-9.]+))?\)/);
  if (ms) {
    out.sx = Number(ms[1] || 1) || 1;
    out.sy = Number(ms[2] || ms[1] || 1) || 1;
  }
  return out;
}

function syncUiFromState(id) {
  const st = state[id] || { ...DEFAULT_PART_STATE };

  xRange.value = String(st.x);
  yRange.value = String(st.y);
  rotRange.value = String(st.r);
  sxRange.value = String(st.sx);
  syRange.value = String(st.sy);
  opRange.value = String(st.opacity);

  xNum.value = String(st.x);
  yNum.value = String(st.y);
  rotNum.value = String(st.r);
  sxNum.value = String(st.sx);
  syNum.value = String(st.sy);
  opNum.value = String(st.opacity);

  const el = parts.get(id);
  const computedFill = el ? getComputedStyle(el).fill : "";
  const computedStroke = el ? getComputedStyle(el).stroke : "";
  const fillHex = clampColor(st.fill) || cssColorToHex(computedFill) || "";
  const strokeHex = clampColor(st.stroke) || cssColorToHex(computedStroke) || "";

  // Show the effective color even if not overriding, so it's easy to copy.
  fillText.value = fillHex;
  strokeText.value = strokeHex;

  fillColor.value = fillHex || "#000000";
  strokeColor.value = strokeHex || "#000000";
}

function selectPart(id) {
  if (!parts.has(id)) return;
  selectedId = id;
  partSelect.value = id;
  syncUiFromState(id);
  setStatus(`Selected: ${partLabel(id)}`);
}

function ensurePartState(id) {
  if (!state[id]) state[id] = { ...DEFAULT_PART_STATE };
  if (!initial[id]) initial[id] = { ...state[id] };
}

function scanParts() {
  parts.clear();
  const nodes = /** @type {HTMLElement[]} */ (Array.from(svgEl.querySelectorAll(editableSelector)));
  for (const el of nodes) {
    const id = el.getAttribute("id");
    if (!id) continue;
    parts.set(id, el);
    if (!state[id]) {
      // Normalize transforms: use CSS transforms for editing.
      // If element has an SVG transform attribute, we migrate it into state and remove the attribute
      // to avoid double-transform (attr + CSS).
      const attr = el.getAttribute("transform");

      if (id === "cat-group") {
        // Keep the SVG's base translation on the group (coordinate system), and use CSS as delta.
        state[id] = { ...DEFAULT_PART_STATE };
      } else {
        const base = parseTransformAttr(attr);
        state[id] = { ...DEFAULT_PART_STATE, ...base };
        if (attr) {
          el.removeAttribute("transform");
          applyTransformToEl(el, state[id]);
        }
      }
    }
    if (!initial[id]) initial[id] = { ...state[id] };
  }

  const ids = Array.from(parts.keys()).sort((a, b) => a.localeCompare(b));
  partSelect.innerHTML = ids.map((id) => `<option value="${id}">${partLabel(id)}</option>`).join("");
  if (!selectedId && ids[0]) selectPart(ids[0]);
}

function applyStateToSelected() {
  if (!selectedId) return;
  const el = parts.get(selectedId);
  if (!el) return;
  applyTransformToEl(el, state[selectedId]);
}

function setField(id, key, value) {
  ensurePartState(id);
  // @ts-ignore
  state[id][key] = value;
  applyStateToSelected();
}

function onNumericPair(rangeEl, numEl, key) {
  const apply = (raw) => {
    const v = parseNumberLoose(raw);
    if (Number.isNaN(v)) return;
    setField(selectedId, key, v);
    rangeEl.value = String(v);
    numEl.value = String(v);
  };
  rangeEl.addEventListener("input", () => apply(rangeEl.value));
  numEl.addEventListener("input", () => apply(numEl.value));
}

function setPose(cls) {
  activePose = cls || "";
  for (const p of POSES) catRoot.classList.remove(p.cls);
  if (activePose) catRoot.classList.add(activePose);
  updatePoseButtons();
  setStatus(`Pose: ${activePose || "sleep"}`);
}

function updatePoseButtons() {
  $$("#poseBar .btn").forEach((b) => b.classList.remove("is-active"));
  const match = $(`#poseBar .btn[data-pose="${activePose}"]`);
  if (match) match.classList.add("is-active");
}

function clearTimers() {
  for (const id of cycleTimers) window.clearTimeout(id);
  cycleTimers = [];
}

function schedule(fn, delay) {
  const id = window.setTimeout(fn, delay);
  cycleTimers.push(id);
  return id;
}

function runAutoCycle() {
  clearTimers();
  if (!autoEnabled) return;

  const fallback = defaultMotionConfig();
  const cycle = (motionCfg?.cycle?.steps?.length ? motionCfg.cycle.steps : fallback.cycle.steps).map((s) => ({
    pose: String(s.pose || ""),
    durationMs: Number(s.durationMs || 0) || 0,
  }));
  const sleepGapMs = Number(motionCfg?.cycle?.sleepGapMs ?? fallback.cycle.sleepGapMs) || 0;
  let idx = 0;

  const step = () => {
    const c = cycle[idx];
    if (!c) return;
    setPose(c.pose);
    schedule(() => setPose(""), c.durationMs);
    schedule(() => {
      idx = (idx + 1) % cycle.length;
      step();
    }, c.durationMs + sleepGapMs);
  };

  schedule(step, sleepGapMs);
}

function setBreathing(enabled) {
  breathingEnabled = enabled;
  toggleBreathBtn.textContent = `Breathing: ${enabled ? "On" : "Off"}`;
  toggleBreathBtn.classList.toggle("is-active", enabled);
  catRoot.style.setProperty("--kp-cat-breath", `${Number(breathDur.value)}s`);
  catRoot.classList.toggle("no-breath", !enabled);
}

function setAwake(enabled) {
  awakeEnabled = enabled;
  toggleAwakeBtn.textContent = `Awake: ${enabled ? "On" : "Off"}`;
  toggleAwakeBtn.classList.toggle("is-active", enabled);
  catRoot.classList.toggle("is-awake", enabled);
}

function setDrag(enabled) {
  dragEnabled = enabled;
  toggleDragBtn.textContent = `Drag: ${enabled ? "On" : "Off"}`;
  toggleDragBtn.classList.toggle("is-active", enabled);
  // Make paths selectable.
  svgEl.style.cursor = enabled ? "grab" : "default";
}

function exportJson() {
  const out = {
    version: 1,
    vars: {
      breathSeconds: Number(breathDur.value),
      poseMult: Number(poseMult.value),
    },
    authoring: {
      selectedMovement: activeMovement,
      movements,
    },
    parts: state,
  };
  return JSON.stringify(out, null, 2);
}

function exportCss() {
  const lines = [];
  lines.push("/* Cat Lab Export */");
  lines.push(`:root { --kp-cat-breath: ${Number(breathDur.value)}s; --kp-cat-pose-mult: ${Number(poseMult.value)}; }`);
  for (const id of Object.keys(state).sort()) {
    const st = state[id];
    const decl = [];
    decl.push(`transform: translate(${st.x}px, ${st.y}px) rotate(${st.r}deg) scale(${st.sx}, ${st.sy});`);
    if (typeof st.opacity === "number") decl.push(`opacity: ${st.opacity};`);
    if (st.fill) decl.push(`fill: ${st.fill} !important;`);
    if (st.stroke) decl.push(`stroke: ${st.stroke} !important;`);
    lines.push(`#${id} { ${decl.join(" ")} }`);
  }
  return lines.join("\n");
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied to clipboard");
  } catch {
    setStatus("Clipboard blocked. Select and copy manually from console.");
    // eslint-disable-next-line no-console
    console.log(text);
  }
}

function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function runSelfTest() {
  const results = [];
  const test = async (name, fn) => {
    try {
      const r = fn();
      if (r && typeof r.then === "function") await r;
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, err: String(e?.message || e) });
    }
  };

  const snapshot = {
    selectedId,
    dragEnabled,
    autoEnabled,
    breathingEnabled,
    awakeEnabled,
    timelineEnabled,
    activePose,
    activeMovement,
    framesCount: timeline.frames.length,
  };

  // Avoid filesystem writes and downloads during self-test.
  await test("Export JSON parses", () => JSON.parse(exportJson()));
  await test("Export CSS non-empty", () => {
    const css = exportCss();
    if (!css || css.length < 10) throw new Error("css empty");
  });

  await test("Awake toggle", () => {
    setAwake(true);
    if (!catRoot.classList.contains("is-awake")) throw new Error("is-awake not set");
    setAwake(false);
    if (catRoot.classList.contains("is-awake")) throw new Error("is-awake not cleared");
  });

  await test("Breathing toggle", () => {
    setBreathing(true);
    if (catRoot.classList.contains("no-breath")) throw new Error("no-breath should be off");
    setBreathing(false);
    if (!catRoot.classList.contains("no-breath")) throw new Error("no-breath should be on");
    setBreathing(true);
  });

  await test("Toggle Drag", () => setDrag(!dragEnabled));
  await test("Reset Part", () => resetPart(selectedId));
  await test("Reset All", () => resetAll());

  await test("Timeline Toggle", () => setTimelineEnabled(!timelineEnabled));
  await test("Load Preset breathing", () => {
    stopTimeline();
    setTimelineEnabled(true);
    setFrames(makePresetFrames("breathing"));
  });
  await test("Play/Pause", () => {
    playTimeline();
    stopTimeline();
  });

  await test("Add Frame", () => addFrameBtn.click());
  await test("Duplicate Frame", () => dupFrameBtn.click());
  await test("Capture Frame", () => captureFrameBtn.click());
  await test("Delete Frame", () => delFrameBtn.click());

  await test("QuickPose walking", () => {
    ensureMovement("walking");
    setActiveMovement("walking");
    setFrames(makePresetFrames("walking"));
    playTimeline();
    stopTimeline();
  });

  await test("Movement buttons render", () => renderMovementButtons());
  await test("Cycle editor render", () => renderCycleEditor());

  await test("Load Motion (GET)", () => loadMotionFromApp());

  await test("Save Motion (dry-run)", async () => {
    const cfg = normalizeMotionConfig(motionCfg || defaultMotionConfig());
    cfg.authoring = cfg.authoring || {};
    cfg.authoring.selectedMovement = activeMovement;
    cfg.authoring.movements = movements;
    const res = await fetch("/api/motion?dry=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (!j?.ok || !j?.dry) throw new Error("dry-run response invalid");
  });

  // Restore minimal state
  setDrag(snapshot.dragEnabled);
  setAwake(snapshot.awakeEnabled);
  setBreathing(snapshot.breathingEnabled);
  setTimelineEnabled(snapshot.timelineEnabled);
  setPose(snapshot.activePose);
  setActiveMovement(snapshot.activeMovement);
  if (snapshot.selectedId) selectPart(snapshot.selectedId);

  const fails = results.filter((r) => !r.ok);
  if (fails.length) {
    setStatus(`Self-Test FAIL: ${fails.length}/${results.length} (ver consola)`);
    // eslint-disable-next-line no-console
    console.table(results);
  } else {
    setStatus(`Self-Test OK: ${results.length}/${results.length}`);
  }
}

function duplicateSelected(newIdRaw) {
  const id = selectedId;
  const el = parts.get(id);
  if (!el) return;
  const clone = /** @type {HTMLElement} */ (el.cloneNode(true));
  const newId = (newIdRaw || `${id}-copy-${Date.now()}`).trim();
  clone.setAttribute("id", newId);

  // Insert next to original to preserve z-order relative to body.
  el.insertAdjacentElement("afterend", clone);

  // Default offset.
  state[newId] = { ...DEFAULT_PART_STATE, x: 8, y: 8, sx: 1, sy: 1, r: 0, opacity: 0.7 };
  initial[newId] = { ...state[newId] };
  parts.set(newId, clone);
  scanParts();
  selectPart(newId);
  applyTransformToEl(clone, state[newId]);
}

function resetPart(id) {
  if (!id) return;
  if (!initial[id]) return;
  state[id] = { ...initial[id] };
  applyTransformToEl(parts.get(id), state[id]);
  syncUiFromState(id);
}

function resetAll() {
  for (const id of Object.keys(state)) {
    if (!initial[id]) continue;
    state[id] = { ...initial[id] };
    const el = parts.get(id);
    if (el) applyTransformToEl(el, state[id]);
  }
  syncUiFromState(selectedId);
}

function updateFrameUi() {
  const count = timeline.frames.length;
  frameRange.max = String(Math.max(0, count - 1));
  frameRange.value = String(Math.min(frameIndex, Math.max(0, count - 1)));
  frameNum.value = String(Number(frameRange.value));
  frameIndex = Number(frameRange.value) || 0;
  const f = timeline.frames[frameIndex];
  frameLabel.textContent = f ? `${f.name} (${f.durationMs}ms)` : "No frames";
}

function captureCurrentState() {
  /** @type {Record<string, any>} */
  const out = {};
  for (const [id, el] of parts.entries()) {
    const base = parseTransformAttr(el.getAttribute("transform"));
    const st = state[id] || DEFAULT_PART_STATE;
    out[id] = {
      x: typeof st.x === "number" ? st.x : base.x,
      y: typeof st.y === "number" ? st.y : base.y,
      r: typeof st.r === "number" ? st.r : base.r,
      sx: typeof st.sx === "number" ? st.sx : base.sx,
      sy: typeof st.sy === "number" ? st.sy : base.sy,
      opacity: typeof st.opacity === "number" ? st.opacity : 1,
      fill: st.fill || "",
      stroke: st.stroke || "",
    };
  }
  return out;
}

function applyFrame(idx) {
  const f = timeline.frames[idx];
  if (!f) return;
  for (const id of Object.keys(f.parts)) {
    const el = parts.get(id);
    if (!el) continue;
    const st = f.parts[id];
    applyTransformToEl(el, st);
    state[id] = { ...state[id], ...st };
  }
  updateFrameUi();
  if (selectedId) syncUiFromState(selectedId);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function interpPart(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    r: lerp(a.r, b.r, t),
    sx: lerp(a.sx, b.sx, t),
    sy: lerp(a.sy, b.sy, t),
    opacity: lerp(a.opacity, b.opacity, t),
    fill: t < 0.5 ? a.fill : b.fill,
    stroke: t < 0.5 ? a.stroke : b.stroke,
  };
}

function stopTimeline() {
  isPlayingTimeline = false;
  playTimelineBtn.textContent = "Play";
  if (rafId) window.cancelAnimationFrame(rafId);
  rafId = 0;
}

function playTimeline() {
  if (!timelineEnabled) setTimelineEnabled(true);
  if (timeline.frames.length < 2) return;
  isPlayingTimeline = true;
  playTimelineBtn.textContent = "Pause";
  playFrameStart = performance.now();

  const tick = (now) => {
    if (!isPlayingTimeline) return;
    const fA = timeline.frames[frameIndex];
    const nextIndex = frameIndex + 1;
    const fB =
      timeline.frames[nextIndex] || (timeline.loop ? timeline.frames[0] : null);
    if (!fA || !fB) {
      stopTimeline();
      return;
    }

    const elapsed = now - playFrameStart;
    const dur = Math.max(16, Number(fA.durationMs) || 120);
    const t = Math.min(1, elapsed / dur);

    const keys = new Set([...Object.keys(fA.parts), ...Object.keys(fB.parts)]);
    for (const id of keys) {
      const el = parts.get(id);
      if (!el) continue;
      const a = fA.parts[id] || fB.parts[id];
      const b = fB.parts[id] || fA.parts[id];
      const st = interpPart(a, b, t);
      applyTransformToEl(el, st);
    }

    if (t >= 1) {
      frameIndex = nextIndex;
      if (frameIndex >= timeline.frames.length) {
        if (timeline.loop) frameIndex = 0;
        else {
          stopTimeline();
          return;
        }
      }
      playFrameStart = now;
      updateFrameUi();
    }

    rafId = window.requestAnimationFrame(tick);
  };

  rafId = window.requestAnimationFrame(tick);
}

function setTimelineEnabled(enabled) {
  timelineEnabled = enabled;
  toggleTimelineBtn.textContent = `Timeline: ${enabled ? "On" : "Off"}`;
  toggleTimelineBtn.classList.toggle("is-active", enabled);
  catRoot.classList.toggle("timeline-mode", enabled);
  if (enabled) {
    // Disable CSS-driven motion so frames are predictable.
    autoEnabled = false;
    autoCycleBtn.textContent = "Auto: Off";
    autoCycleBtn.classList.remove("is-active");
    clearTimers();
    setPose("");
    setBreathing(false);
    // Load frames for the active movement into the timeline.
    timeline = getActiveTimeline();
    const hasFrames = Array.isArray(timeline.frames) && timeline.frames.length;
    const presetKinds = ["breathing", "walking", "standing", "angry", "cleaning", "pouncing"];
    const preset = presetKinds.includes(activeMovement) ? activeMovement : "breathing";
    setFrames(hasFrames ? timeline.frames : makePresetFrames(preset));
  } else {
    stopTimeline();
    // Clear inline transforms so CSS pose previews/animations can run normally.
    for (const el of parts.values()) {
      el.style.transform = "";
    }
    setBreathing(true);
  }
}

function setFrames(frames) {
  timeline.frames = frames;
  frameIndex = 0;
  updateFrameUi();
  applyFrame(0);
}

function makeFrame(name, durationMs, partsOverride) {
  const base = captureCurrentState();
  for (const k of Object.keys(partsOverride || {})) {
    base[k] = { ...base[k], ...partsOverride[k] };
  }
  return { name, durationMs, parts: base };
}

function makePresetFrames(kind) {
  const base = captureCurrentState();
  const bodyId = "cat-group";
  const hasBody = parts.has(bodyId);
  const get = (id) => base[id] || { ...DEFAULT_PART_STATE };
  const set = (acc, id, patch) => {
    acc[id] = { ...get(id), ...patch };
  };

  /** @type {{name: string, durationMs: number, parts: Record<string, any>}[]} */
  const frames = [];
  const dur = 1000 / timeline.fps;
  const push = (name, patch, durationMs) => {
    frames.push(makeFrame(name, durationMs ?? Math.round(dur), patch));
  };

  if (kind === "breathing") {
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      // inhale/exhale curve: slow in/out, peak at mid.
      const up = Math.sin(Math.PI * t);
      const tailUp = Math.sin(Math.PI * Math.max(0, Math.min(1, t - 0.08)));
      /** @type {Record<string, any>} */
      const patch = {};
      if (hasBody)
        set(patch, bodyId, {
          y: -1.6 * up,
          sx: 1 + 0.006 * up,
          sy: 1 + 0.01 * up,
        });
      set(patch, "path5", {
        y: -0.7 * up,
        sx: 1 + 0.02 * up,
        sy: 1 + 0.065 * up,
      });
      set(patch, "head", { y: -0.35 * up, r: -0.12 * up });
      set(patch, "tail", { r: 1.6 * tailUp });
      set(patch, "longtail", { r: 1.6 * tailUp });
      push(`Breath ${i + 1}`, patch, 90);
    }
    return frames;
  }

  if (kind === "walking") {
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const phase = t * Math.PI * 2;
      const bob = Math.abs(Math.sin(phase)) * 1.05;
      const sway = Math.sin(phase) * 0.35;
      const liftA = Math.max(0, Math.sin(phase));
      const liftB = Math.max(0, Math.sin(phase + Math.PI));
      /** @type {Record<string, any>} */
      const patch = {};
      if (hasBody)
        set(patch, bodyId, {
          x: sway,
          y: -bob,
          r: -1.1 - 0.65 * bob,
        });
      set(patch, "paw-front-left", { y: -2.85 * liftA, x: 0.35 * liftA, r: -11 * liftA });
      set(patch, "paw-front-right", { y: -2.85 * liftB, x: 0.35 * liftB, r: -11 * liftB });
      set(patch, "paw-back", { y: -2.25 * liftB, x: -0.25 * liftB, r: -8 * liftB });
      set(patch, "paw-back-2", {
        y: -2.25 * liftA,
        x: -0.25 * liftA,
        r: -8 * liftA,
        opacity: 0.88,
      });
      set(patch, "head", {
        y: -0.35 * bob,
        r: 0.25 * Math.sin(phase),
      });
      const tail = lerp(-6, 10, (Math.sin(phase - 0.45) + 1) / 2);
      set(patch, "tail", { r: tail });
      set(patch, "longtail", { r: tail });
      push(`Walk ${i + 1}`, patch, 90);
    }
    return frames;
  }

  if (kind === "standing") {
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const up = Math.sin(Math.PI * t);
      /** @type {Record<string, any>} */
      const patch = {};
      if (hasBody)
        set(patch, bodyId, { x: -1.2 * up, y: -4.8 * up, r: -5.2 * up, sy: 1 + 0.025 * up });
      set(patch, "head", { y: -0.9 * up, r: 3.9 * up });
      set(patch, "ear-left", { r: -2.2 * up });
      set(patch, "ear-right", { r: 2.2 * up });
      set(patch, "tail", { r: 2.7 * up });
      set(patch, "longtail", { r: 2.7 * up });
      push(`Stand ${i + 1}`, patch, 120);
    }
    return frames;
  }

  if (kind === "angry") {
    for (let i = 0; i < 10; i++) {
      const jig = (i % 2 === 0 ? 1 : -1) * 0.35;
      /** @type {Record<string, any>} */
      const patch = {};
      if (hasBody) set(patch, bodyId, { x: jig, y: -0.15 * jig, sy: 1.045, r: 0.18 * jig });
      set(patch, "ear-left", { r: -35 });
      set(patch, "ear-right", { r: 35 });
      set(patch, "tail", { r: 0.6 * jig });
      set(patch, "longtail", { r: 0.6 * jig });
      push(`Angry ${i + 1}`, patch, 60);
    }
    return frames;
  }

  if (kind === "cleaning") {
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const lick = Math.sin(Math.PI * t);
      /** @type {Record<string, any>} */
      const patch = {};
      set(patch, "paw-front-left", { y: -8.4 * lick, x: 0.4 * lick, r: -52 * lick });
      set(patch, "head", { y: 3.8 * lick, r: -15.5 * lick });
      set(patch, "ear-left", { r: -1.0 * lick });
      set(patch, "ear-right", { r: 1.0 * lick });
      push(`Clean ${i + 1}`, patch, 120);
    }
    return frames;
  }

  if (kind === "pouncing") {
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const crouch = 1 - Math.cos(Math.PI * t);
      /** @type {Record<string, any>} */
      const patch = {};
      if (hasBody) set(patch, bodyId, { y: 2.4 * crouch, sy: 1 - 0.09 * crouch, sx: 1 + 0.008 * crouch, r: -1.0 * crouch });
      set(patch, "head", { y: 0.45 * crouch, r: -1.2 * crouch });
      const wig = lerp(-11, 16, t);
      set(patch, "tail", { r: wig });
      set(patch, "longtail", { r: wig });
      push(`Pounce ${i + 1}`, patch, 100);
    }
    return frames;
  }

  return [makeFrame("Empty", 120, {})];
}

function initPoseButtons() {
  poseBar.innerHTML = POSES.map((p) => {
    const pose = p.cls;
    const label = p.label;
    return `<button type="button" class="btn mini" data-pose="${pose}">${label}</button>`;
  }).join("");

  poseBar.addEventListener("click", (e) => {
    const btn = /** @type {HTMLElement} */ (e.target);
    if (!btn || btn.tagName !== "BUTTON") return;
    const pose = btn.getAttribute("data-pose") || "";
    // Pose preview uses CSS animations; timeline disables them.
    if (timelineEnabled) setTimelineEnabled(false);
    // Ensure we don't pin parts via inline transforms while previewing.
    for (const el of parts.values()) el.style.transform = "";
    autoEnabled = false;
    autoCycleBtn.textContent = "Auto: Off";
    autoCycleBtn.classList.remove("is-active");
    setPose(pose);
  });
}

function init() {
  scanParts();
  initPoseButtons();
  renderMovementButtons();
  renderQuickPoseButtons();

  // Inputs wiring
  onNumericPair(xRange, xNum, "x");
  onNumericPair(yRange, yNum, "y");
  onNumericPair(rotRange, rotNum, "r");
  onNumericPair(sxRange, sxNum, "sx");
  onNumericPair(syRange, syNum, "sy");
  onNumericPair(opRange, opNum, "opacity");

  partSelect.addEventListener("change", () => selectPart(partSelect.value));

  fillColor.addEventListener("input", () => {
    const c = clampColor(fillColor.value);
    fillText.value = c;
    setField(selectedId, "fill", c);
  });
  fillText.addEventListener("input", () => {
    const c = clampColor(fillText.value);
    if (c) {
      fillColor.value = c;
      setField(selectedId, "fill", c);
      return;
    }
    // Empty/invalid -> clear override and resync to computed color.
    setField(selectedId, "fill", "");
    if (selectedId) syncUiFromState(selectedId);
  });

  strokeColor.addEventListener("input", () => {
    const c = clampColor(strokeColor.value);
    strokeText.value = c;
    setField(selectedId, "stroke", c);
  });
  strokeText.addEventListener("input", () => {
    const c = clampColor(strokeText.value);
    if (c) {
      strokeColor.value = c;
      setField(selectedId, "stroke", c);
      return;
    }
    setField(selectedId, "stroke", "");
    if (selectedId) syncUiFromState(selectedId);
  });

  toggleDragBtn.addEventListener("click", () => setDrag(!dragEnabled));
  resetPartBtn.addEventListener("click", () => resetPart(selectedId));
  resetAllBtn.addEventListener("click", () => resetAll());

  duplicatePartBtn.addEventListener("click", () => duplicateSelected(duplicateIdInput.value));

  breathDur.value = "3.9";
  breathDurNum.value = "3.9";
  catRoot.style.setProperty("--kp-cat-breath", `${Number(breathDur.value)}s`);
  breathDur.addEventListener("input", () => {
    breathDurNum.value = breathDur.value;
    catRoot.style.setProperty("--kp-cat-breath", `${Number(breathDur.value)}s`);
  });
  breathDurNum.addEventListener("input", () => {
    breathDur.value = breathDurNum.value;
    catRoot.style.setProperty("--kp-cat-breath", `${Number(breathDur.value)}s`);
  });

  poseMult.value = "1.35";
  poseMultNum.value = "1.35";
  catRoot.style.setProperty("--kp-cat-pose-mult", String(Number(poseMult.value)));
  poseMult.addEventListener("input", () => {
    poseMultNum.value = poseMult.value;
    catRoot.style.setProperty("--kp-cat-pose-mult", String(Number(poseMult.value)));
  });
  poseMultNum.addEventListener("input", () => {
    poseMult.value = poseMultNum.value;
    catRoot.style.setProperty("--kp-cat-pose-mult", String(Number(poseMult.value)));
  });

  movementBar?.addEventListener("click", (e) => {
    const btn = /** @type {HTMLElement} */ (e.target);
    if (!btn || btn.tagName !== "BUTTON") return;
    const name = btn.getAttribute("data-movement") || "";
    if (!name) return;
    autoEnabled = false;
    autoCycleBtn.textContent = "Auto: Off";
    autoCycleBtn.classList.remove("is-active");
    clearTimers();
    stopTimeline();
    setActiveMovement(name);
    setStatus(`Movement: ${name}`);
  });

  quickPoseBar?.addEventListener("click", (e) => {
    const btn = /** @type {HTMLElement} */ (e.target);
    if (!btn || btn.tagName !== "BUTTON") return;
    const kind = btn.getAttribute("data-quickpose") || "";
    if (!kind) return;
    autoEnabled = false;
    autoCycleBtn.textContent = "Auto: Off";
    autoCycleBtn.classList.remove("is-active");
    clearTimers();
    stopTimeline();

    ensureMovement(kind);
    setActiveMovement(kind);
    // Overwrite frames from preset for a guaranteed "it moves" demo.
    setFrames(makePresetFrames(kind));
    playTimeline();
    setStatus(`Run: ${kind}`);
  });

  playActiveMovementBtn?.addEventListener("click", () => {
    autoEnabled = false;
    autoCycleBtn.textContent = "Auto: Off";
    autoCycleBtn.classList.remove("is-active");
    clearTimers();
    if (!timelineEnabled) setTimelineEnabled(true);
    playTimeline();
  });

  stopActiveMovementBtn?.addEventListener("click", () => {
    stopTimeline();
  });

  addMovementBtn?.addEventListener("click", () => {
    const name = sanitizeMovementName(movementNameInput.value);
    if (!name) return;
    ensureMovement(name);
    setActiveMovement(name);
    setStatus(`Added movement: ${name}`);
  });

  renameMovementBtn?.addEventListener("click", () => {
    const next = sanitizeMovementName(movementNameInput.value);
    if (!next || next === activeMovement) return;
    if (movements[next]) return;
    const prev = activeMovement;
    movements[next] = movements[prev];
    delete movements[prev];
    activeMovement = next;
    timeline = getActiveTimeline();
    renderMovementButtons();
    setStatus(`Renamed movement: ${prev} -> ${next}`);
  });

  deleteMovementBtn?.addEventListener("click", () => {
    const keys = Object.keys(movements);
    if (keys.length <= 1) return;
    const del = activeMovement;
    delete movements[del];
    setActiveMovement(movements.breathing ? "breathing" : Object.keys(movements)[0]);
    setStatus(`Deleted movement: ${del}`);
  });

  recordFrameBtn?.addEventListener("click", () => {
    if (!timelineEnabled) setTimelineEnabled(true);
    stopTimeline();
    const f = {
      name: `Frame ${timeline.frames.length + 1}`,
      durationMs: Math.round(1000 / timeline.fps),
      parts: captureCurrentState(),
    };
    timeline.frames.push(f);
    frameIndex = timeline.frames.length - 1;
    updateFrameUi();
    applyFrame(frameIndex);
    setStatus(`Recorded frame -> ${activeMovement} (${frameIndex})`);
  });

  clearFramesBtn?.addEventListener("click", () => {
    stopTimeline();
    if (!timelineEnabled) setTimelineEnabled(true);
    setFrames([makeFrame("Frame 1", Math.round(1000 / timeline.fps), {})]);
    setStatus(`Cleared frames: ${activeMovement}`);
  });

  // Sync with the real login copy-cat motion JSON (shared file in repo).
  applyMotionToLab(defaultMotionConfig());
  loadMotionBtn?.addEventListener("click", () => loadMotionFromApp());
  saveMotionBtn?.addEventListener("click", () => saveMotionToApp());

  motionSleepGap?.addEventListener("input", () => {
    if (!motionCfg) motionCfg = defaultMotionConfig();
    motionCfg.cycle = motionCfg.cycle || {};
    motionCfg.cycle.sleepGapMs = Number(motionSleepGap.value || 0) || 0;
    if (autoEnabled) runAutoCycle();
  });

  addCycleStepBtn?.addEventListener("click", () => {
    if (!motionCfg) motionCfg = defaultMotionConfig();
    motionCfg.cycle = motionCfg.cycle || {};
    motionCfg.cycle.steps = Array.isArray(motionCfg.cycle.steps) ? motionCfg.cycle.steps : [];
    motionCfg.cycle.steps.push({ pose: "is-walking", durationMs: 2200 });
    renderCycleEditor();
    if (autoEnabled) runAutoCycle();
  });

  cycleEditor?.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (!target) return;
    if (target.getAttribute("data-role") !== "del") return;
    const row = target.closest(".cycle-step");
    const idx = Number(row?.getAttribute("data-idx") || -1);
    if (!Number.isFinite(idx) || idx < 0) return;
    if (!motionCfg) motionCfg = defaultMotionConfig();
    const steps = Array.isArray(motionCfg.cycle?.steps) ? motionCfg.cycle.steps : [];
    steps.splice(idx, 1);
    motionCfg.cycle.steps = steps;
    renderCycleEditor();
    if (autoEnabled) runAutoCycle();
  });

  cycleEditor?.addEventListener("input", () => {
    if (!motionCfg) motionCfg = defaultMotionConfig();
    motionCfg.cycle = motionCfg.cycle || {};
    motionCfg.cycle.steps = readCycleEditorSteps();
    if (autoEnabled) runAutoCycle();
  });

  // Try to load the real config on startup (non-blocking).
  loadMotionFromApp();

  autoCycleBtn.classList.add("is-active");
  autoCycleBtn.addEventListener("click", () => {
    autoEnabled = !autoEnabled;
    autoCycleBtn.textContent = `Auto: ${autoEnabled ? "On" : "Off"}`;
    autoCycleBtn.classList.toggle("is-active", autoEnabled);
    if (autoEnabled) runAutoCycle();
    else clearTimers();
  });

  selfTestBtn?.addEventListener("click", () => {
    runSelfTest();
  });

  copyJsonBtn.addEventListener("click", () => copyToClipboard(exportJson()));
  downloadJsonBtn.addEventListener("click", () => download("cat-lab-state.json", exportJson()));
  copyCssBtn.addEventListener("click", () => copyToClipboard(exportCss()));

  toggleAwakeBtn.addEventListener("click", () => setAwake(!awakeEnabled));
  toggleBreathBtn.addEventListener("click", () => {
    // Breathing is CSS-based; if we're in timeline mode, turn it off so the user sees the effect.
    if (timelineEnabled) setTimelineEnabled(false);
    setBreathing(!breathingEnabled);
  });

  // Timeline wiring
  fpsRange.value = String(timeline.fps);
  fpsNum.value = String(timeline.fps);
  const syncFps = (v) => {
    const n = Math.max(4, Math.min(30, Number(v) || 12));
    timeline.fps = n;
    fpsRange.value = String(n);
    fpsNum.value = String(n);
  };
  fpsRange.addEventListener("input", () => syncFps(fpsRange.value));
  fpsNum.addEventListener("input", () => syncFps(fpsNum.value));

  toggleLoopBtn.textContent = `Loop: ${timeline.loop ? "On" : "Off"}`;
  toggleLoopBtn.classList.toggle("is-active", timeline.loop);
  toggleLoopBtn.addEventListener("click", () => {
    timeline.loop = !timeline.loop;
    toggleLoopBtn.textContent = `Loop: ${timeline.loop ? "On" : "Off"}`;
    toggleLoopBtn.classList.toggle("is-active", timeline.loop);
  });

  frameRange.addEventListener("input", () => {
    frameIndex = Number(frameRange.value) || 0;
    updateFrameUi();
    if (timelineEnabled) applyFrame(frameIndex);
  });
  frameNum.addEventListener("input", () => {
    frameIndex = Math.max(0, Math.min(timeline.frames.length - 1, Number(frameNum.value) || 0));
    frameRange.value = String(frameIndex);
    updateFrameUi();
    if (timelineEnabled) applyFrame(frameIndex);
  });

  prevFrameBtn.addEventListener("click", () => {
    frameIndex = Math.max(0, frameIndex - 1);
    updateFrameUi();
    if (timelineEnabled) applyFrame(frameIndex);
  });
  nextFrameBtn.addEventListener("click", () => {
    frameIndex = Math.min(timeline.frames.length - 1, frameIndex + 1);
    updateFrameUi();
    if (timelineEnabled) applyFrame(frameIndex);
  });

  addFrameBtn.addEventListener("click", () => {
    const f = {
      name: `Frame ${timeline.frames.length + 1}`,
      durationMs: Math.round(1000 / timeline.fps),
      parts: captureCurrentState(),
    };
    timeline.frames.splice(frameIndex + 1, 0, f);
    frameIndex = frameIndex + 1;
    updateFrameUi();
    applyFrame(frameIndex);
  });
  dupFrameBtn.addEventListener("click", () => {
    const src = timeline.frames[frameIndex];
    if (!src) return;
    const f = {
      name: `${src.name} copy`,
      durationMs: src.durationMs,
      parts: JSON.parse(JSON.stringify(src.parts)),
    };
    timeline.frames.splice(frameIndex + 1, 0, f);
    frameIndex = frameIndex + 1;
    updateFrameUi();
    applyFrame(frameIndex);
  });
  delFrameBtn.addEventListener("click", () => {
    if (timeline.frames.length <= 1) return;
    timeline.frames.splice(frameIndex, 1);
    frameIndex = Math.max(0, Math.min(frameIndex, timeline.frames.length - 1));
    updateFrameUi();
    applyFrame(frameIndex);
  });

  captureFrameBtn.addEventListener("click", () => {
    const f = timeline.frames[frameIndex];
    if (!f) return;
    f.parts = captureCurrentState();
    setStatus(`Captured into frame ${frameIndex}`);
    applyFrame(frameIndex);
  });

  toggleTimelineBtn.addEventListener("click", () => setTimelineEnabled(!timelineEnabled));
  playTimelineBtn.addEventListener("click", () => {
    if (isPlayingTimeline) stopTimeline();
    else playTimeline();
  });
  stopTimelineBtn.addEventListener("click", () => stopTimeline());

  const presets = [
    { id: "breathing", label: "Breathing" },
    { id: "walking", label: "Walking" },
    { id: "standing", label: "Standing" },
    { id: "angry", label: "Angry" },
    { id: "cleaning", label: "Cleaning" },
    { id: "pouncing", label: "Pouncing" },
  ];
  movementPreset.innerHTML = presets.map((p) => `<option value="${p.id}">${p.label}</option>`).join("");
  loadPresetBtn.addEventListener("click", () => {
    const kind = movementPreset.value;
    stopTimeline();
    setTimelineEnabled(true);
    setFrames(makePresetFrames(kind));
    setStatus(`Loaded preset: ${kind}`);
  });

  // Pick parts on click
  svgEl.addEventListener("pointerdown", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (!target) return;
    const id = target.getAttribute("id");
    if (id && parts.has(id)) selectPart(id);
  });

  // Drag
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let baseX = 0;
  let baseY = 0;
  svgEl.addEventListener("pointerdown", (e) => {
    if (!dragEnabled) return;
    const target = /** @type {HTMLElement} */ (e.target);
    const id = target?.getAttribute("id");
    if (!id || !parts.has(id)) return;
    selectPart(id);
    ensurePartState(id);
    isDragging = true;
    svgEl.setPointerCapture(e.pointerId);
    svgEl.style.cursor = "grabbing";
    startX = e.clientX;
    startY = e.clientY;
    baseX = state[id].x;
    baseY = state[id].y;
  });

  svgEl.addEventListener("pointermove", (e) => {
    if (!isDragging || !dragEnabled || !selectedId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    // Screen pixels -> SVG units approximation for lab usage.
    setField(selectedId, "x", Number((baseX + dx * 0.12).toFixed(2)));
    setField(selectedId, "y", Number((baseY + dy * 0.12).toFixed(2)));
    syncUiFromState(selectedId);
  });

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    svgEl.style.cursor = dragEnabled ? "grab" : "default";
  };
  svgEl.addEventListener("pointerup", endDrag);
  svgEl.addEventListener("pointercancel", endDrag);

  // Defaults
  setDrag(false);
  setAwake(false);
  setBreathing(true);
  autoEnabled = true;
  runAutoCycle();
  setStatus("Ready");
}

init();
