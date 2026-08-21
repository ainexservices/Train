"use strict";

/* =========================================================
   AINEX RAILWAY - FINAL SCRIPT
   Works with:
   index.html
   station.json
   /api/railway
========================================================= */

const API = "/api/railway";

let stations = [];
let stationMap = new Map();

/* =========================================================
   BASIC HELPERS
========================================================= */

const $ = id => document.getElementById(id);

function val(id) {
  return String($(id)?.value || "").trim();
}

function upper(id) {
  return val(id).toUpperCase();
}

function esc(v) {
  return String(v ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function show(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function loading(id, message) {
  show(id, `
    <div class="loading-box">
      🔄 ${esc(message || "Data load ho raha hai...")}
    </div>
  `);
}

function errorBox(id, message) {
  show(id, `
    <div class="error-box">
      ❌ ${esc(message || "Something went wrong.")}
    </div>
  `);
}

function successBox(id, message) {
  show(id, `
    <div class="success-box">
      ✅ ${esc(message)}
    </div>
  `);
}

function noData(id, message) {
  show(id, `
    <div class="no-data">
      ${esc(message || "Data available nahi hai.")}
    </div>
  `);
}

function dateForAPI(date) {
  if (!date) return "";

  const s = String(date);

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    return s;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}-${m}-${y}`;
  }

  return s;
}

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* =========================================================
   API REQUEST
========================================================= */

async function railway(action, params = {}) {

  const query = new URLSearchParams();

  query.set("action", action);

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.set(key, value);
    }
  });

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {

    const response = await fetch(
      `${API}?${query.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      }
    );

    const raw = await response.text();

    let data;

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(
        "Railway server ne valid JSON response nahi diya."
      );
    }

    if (!response.ok || data?.success === false) {
      throw new Error(
        data?.message ||
        data?.error ||
        `Railway API error (${response.status})`
      );
    }

    return data;

  } catch (error) {

    if (error.name === "AbortError") {
      throw new Error(
        "Railway API response bahut late aa raha hai. 30 seconds ke baad request stop kar di gayi."
      );
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   STATION JSON LOAD
========================================================= */

async function loadStations() {

  try {

    const response = await fetch(
      "/station.json?v=" + Date.now(),
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `station.json load failed (${response.status})`
      );
    }

    const data = await response.json();

    const list = Array.isArray(data)
      ? data
      : data?.stations;

    if (!Array.isArray(list)) {
      throw new Error(
        "station.json format galat hai."
      );
    }

    stations = [];
    stationMap.clear();

    list.forEach(item => {

      const code = String(
        item?.stnCode ||
        item?.stationCode ||
        item?.code ||
        ""
      ).trim().toUpperCase();

      if (!code) return;

      const station = {
        stnCode: code,
        stnName: String(
          item?.stnName ||
          item?.stationName ||
          item?.name ||
          code
        ).trim(),

        stnCity: String(
          item?.stnCity ||
          item?.city ||
          item?.stnName ||
          item?.stationName ||
          code
        ).trim()
      };

      if (!stationMap.has(code)) {
        stationMap.set(code, station);
        stations.push(station);
      }
    });

    setupAutocomplete();

    console.log(
      `AINEX Railway: ${stations.length} stations loaded`
    );

  } catch (error) {

    console.error(
      "STATION JSON ERROR:",
      error
    );

    /* Even if JSON fails, initialise autocomplete
       so script does not break. */
    setupAutocomplete();

  }
}

/* =========================================================
   AUTOCOMPLETE
========================================================= */

function setupAutocomplete() {

  const inputs = document.querySelectorAll(
    "input[data-station='true']"
  );

  inputs.forEach(input => {

    if (input.dataset.autoReady === "1") {
      return;
    }

    input.dataset.autoReady = "1";

    const wrapper =
      input.closest(".station-field") ||
      input.parentElement;

    if (!wrapper) return;

    wrapper.style.position = "relative";

    let dropdown =
      wrapper.querySelector(".station-suggestions");

    if (!dropdown) {

      dropdown =
        document.createElement("div");

      dropdown.className =
        "station-suggestions";

      dropdown.style.cssText = `
        position:absolute;
        left:0;
        right:0;
        top:100%;
        z-index:999999;
        background:#fff;
        border:1px solid #dce4ef;
        border-radius:14px;
        box-shadow:0 12px 30px rgba(0,0,0,.15);
        max-height:300px;
        overflow-y:auto;
        display:none;
      `;

      wrapper.appendChild(dropdown);
    }

    input.addEventListener(
      "input",
      () => {

        input.dataset.stationCode = "";

        const query =
          input.value
            .trim()
            .toUpperCase();

        if (!query) {

          dropdown.innerHTML = "";
          dropdown.style.display = "none";

          return;
        }

        const matches =
          stations
            .filter(station => {

              const code =
                station.stnCode.toUpperCase();

              const name =
                station.stnName.toUpperCase();

              const city =
                station.stnCity.toUpperCase();

              /*
                 A -> AYC, AY, ALD...
                 B -> BV, BSB, BPL...
                 AY -> AYC, AY...
              */

              return (
                code.startsWith(query) ||
                name.startsWith(query) ||
                city.startsWith(query) ||
                code.includes(query) ||
                name.includes(query) ||
                city.includes(query)
              );

            })
            .sort((a, b) => {

              const ac =
                a.stnCode === query ? 0 :
                a.stnCode.startsWith(query) ? 1 : 2;

              const bc =
                b.stnCode === query ? 0 :
                b.stnCode.startsWith(query) ? 1 : 2;

              return ac - bc;

            })
            .slice(0, 20);

        renderSuggestions(
          input,
          dropdown,
          matches
        );

      }
    );

    input.addEventListener(
      "focus",
      () => {

        if (input.value.trim()) {
          input.dispatchEvent(
            new Event("input")
          );
        }

      }
    );

    input.addEventListener(
      "keydown",
      event => {

        if (event.key === "Escape") {
          dropdown.style.display = "none";
        }

      }
    );

  });

  /*
     Global outside click
  */

  if (!window.__stationClickReady) {

    window.__stationClickReady = true;

    document.addEventListener(
      "click",
      event => {

        document
          .querySelectorAll(
            ".station-suggestions"
          )
          .forEach(dropdown => {

            if (
              !dropdown.parentElement?.contains(
                event.target
              )
            ) {
              dropdown.style.display = "none";
            }

          });

      }
    );

  }
}

function renderSuggestions(
  input,
  dropdown,
  matches
) {

  if (!matches.length) {

    dropdown.innerHTML = `
      <div style="
        padding:15px;
        color:#6b7280;
        font-weight:600;
      ">
        Station nahi mila
      </div>
    `;

    dropdown.style.display = "block";

    return;
  }

  dropdown.innerHTML =
    matches.map(station => `

      <div
        class="station-option"
        data-code="${esc(station.stnCode)}"
        style="
          padding:13px 15px;
          cursor:pointer;
          border-bottom:1px solid #edf1f6;
        "
      >

        <div style="
          font-weight:800;
          color:#17233d;
          font-size:15px;
        ">
          🚉 ${esc(station.stnCode)}
          <span style="font-weight:600;">
            — ${esc(station.stnName)}
          </span>
        </div>

        <div style="
          color:#7b8798;
          font-size:12px;
          margin-top:4px;
        ">
          ${esc(station.stnCity)}
        </div>

      </div>

    `).join("");

  dropdown.style.display = "block";

  dropdown
    .querySelectorAll(".station-option")
    .forEach(option => {

      option.addEventListener(
        "click",
        event => {

          event.preventDefault();
          event.stopPropagation();

          const code =
            option.dataset.code;

          input.value = code;
          input.dataset.stationCode = code;

          dropdown.style.display = "none";

          input.dispatchEvent(
            new Event("change", {
              bubbles: true
            })
          );

        }
      );

    });
}

/* =========================================================
   STATION VALUE
========================================================= */

function stationValue(id) {

  const input = $(id);

  if (!input) return "";

  const selected =
    String(
      input.dataset.stationCode || ""
    ).trim().toUpperCase();

  if (
    selected &&
    stationMap.has(selected)
  ) {
    return selected;
  }

  const value =
    input.value
      .trim()
      .toUpperCase();

  if (!value) return "";

  if (stationMap.has(value)) {
    return value;
  }

  const found =
    stations.find(station =>
      station.stnName.toUpperCase() === value ||
      station.stnCity.toUpperCase() === value
    );

  return found
    ? found.stnCode
    : value;
}

/* =========================================================
   SET DEFAULT DATES
========================================================= */

function setDefaultDates() {

  const d = today();

  [
    "liveTrainDate",
    "searchDate",
    "seatDate",
    "fareDate",
    "historyDate"
  ].forEach(id => {

    const input = $(id);

    if (input && !input.value) {
      input.value = d;
    }

  });
}

/* =========================================================
   PNR
========================================================= */

async function checkPNR() {

  const input = $("pnrNumber");

  if (!input) return;

  const pnr =
    input.value
      .replace(/\D/g, "")
      .slice(0, 10);

  input.value = pnr;

  if (!/^\d{10}$/.test(pnr)) {

    errorBox(
      "pnrResult",
      "Please enter valid 10 digit PNR."
    );

    return;
  }

  loading(
    "pnrResult",
    "PNR status check ho raha hai..."
  );

  try {

    const result =
      await railway("PNR", {
        pnr
      });

    renderPNR(
      result,
      "pnrResult"
    );

  } catch (error) {

    console.error(
      "PNR ERROR:",
      error
    );

    errorBox(
      "pnrResult",
      error.message
    );

  }
}

/* =========================================================
   PNR RENDER
========================================================= */

function renderPNR(data, id) {

  const root =
    data?.data ||
    data?.result ||
    data ||
    {};

  const train =
    root?.trainInfo ||
    root?.train ||
    {};

  const pnr =
    root?.pnr ||
    root?.pnrNumber ||
    root?.pnr_number ||
    "-";

  const trainNo =
    root?.trainNumber ||
    root?.train_no ||
    train?.trainNumber ||
    train?.train_no ||
    "-";

  const trainName =
    root?.trainName ||
    root?.train_name ||
    train?.trainName ||
    train?.train_name ||
    "-";

  const from =
    root?.from ||
    root?.fromStation ||
    root?.from_station ||
    "-";

  const to =
    root?.to ||
    root?.toStation ||
    root?.to_station ||
    "-";

  const journeyDate =
    root?.journeyDate ||
    root?.journey_date ||
    root?.date ||
    "-";

  let passengers =
    root?.passengers ||
    root?.passengerDetails ||
    root?.passenger_details ||
    root?.passengerList ||
    [];

  if (!Array.isArray(passengers)) {
    passengers = [];
  }

  show(id, `

    <div class="pnr-result-card">

      <div class="pnr-header">

        <small>PNR RESULT</small>

        <h2>
          PNR ${esc(pnr)}
        </h2>

      </div>

      <div class="pnr-info-grid">

        <div>
          <small>FROM</small>
          <strong>${esc(formatStation(from))}</strong>
        </div>

        <div>
          <small>TO</small>
          <strong>${esc(formatStation(to))}</strong>
        </div>

        <div>
          <small>TRAIN</small>
          <strong>${esc(trainName)}</strong>
        </div>

        <div>
          <small>TRAIN NUMBER</small>
          <strong>${esc(trainNo)}</strong>
        </div>

        <div>
          <small>JOURNEY DATE</small>
          <strong>${esc(journeyDate)}</strong>
        </div>

        <div>
          <small>CLASS</small>
          <strong>
            ${esc(
              root?.class ||
              root?.travelClass ||
              root?.journeyClass ||
              "-"
            )}
          </strong>
        </div>

      </div>

      <h3>
        Passenger Details
      </h3>

      ${
        passengers.length
          ? passengers.map(
              passengerHTML
            ).join("")
          : `
            <div class="no-data">
              Passenger details response me nahi mile.
            </div>
          `
      }

      <div class="secure-note">
        🔒 Railway information fetched securely.
      </div>

    </div>

  `);
}

function passengerHTML(passenger, index) {

  const booking =
    passenger?.bookingStatus ||
    passenger?.booking_status ||
    passenger?.booking ||
    "-";

  const current =
    passenger?.currentStatus ||
    passenger?.current_status ||
    passenger?.current ||
    booking ||
    "-";

  const coach =
    passenger?.coach ||
    passenger?.coachNumber ||
    passenger?.coach_number ||
    "-";

  const berth =
    passenger?.berth ||
    passenger?.berthNumber ||
    passenger?.berth_number ||
    passenger?.seat ||
    passenger?.seatNumber ||
    passenger?.seat_berth ||
    "0";

  return `

    <div class="passenger-card">

      <div class="passenger-top">

        <strong>
          Passenger ${index + 1}
        </strong>

        <span>
          ${esc(current)}
        </span>

      </div>

      <div class="passenger-grid">

        <div>
          <small>BOOKING STATUS</small>
          <strong>${esc(booking)}</strong>
        </div>

        <div>
          <small>CURRENT STATUS</small>
          <strong>${esc(current)}</strong>
        </div>

        <div>
          <small>COACH</small>
          <strong>${esc(coach)}</strong>
        </div>

        <div>
          <small>SEAT / BERTH</small>
          <strong>${esc(berth)}</strong>
        </div>

      </div>

    </div>

  `;
}

function formatStation(value) {

  if (!value) return "-";

  if (typeof value === "string") {

    const code =
      value.trim().toUpperCase();

    const found =
      stationMap.get(code);

    return found
      ? `${found.stnName} (${found.stnCode})`
      : value;

  }

  return (
    value?.name ||
    value?.stationName ||
    value?.station_name ||
    value?.code ||
    "-"
  );
}

/* =========================================================
   LIVE TRAIN
========================================================= */

async function checkLiveTrain() {

  const trainNo =
    upper("liveTrainNumber");

  const date =
    val("liveTrainDate");

  if (!/^\d{5}$/.test(trainNo)) {

    errorBox(
      "liveTrainResult",
      "5 digit train number enter karo."
    );

    return;
  }

  if (!date) {

    errorBox(
      "liveTrainResult",
      "Journey date select karo."
    );

    return;
  }

  loading(
    "liveTrainResult",
    "Live train status check ho raha hai..."
  );

  try {

    const result =
      await railway("LIVE", {
        trainNo,
        date: dateForAPI(date)
      });

    renderLiveTrain(
      result,
      "liveTrainResult"
    );

  } catch (error) {

    errorBox(
      "liveTrainResult",
      error.message
    );

  }
}

function renderLiveTrain(data, id) {

  const root =
    data?.data ||
    data?.result ||
    data ||
    {};

  const current =
    root?.currentStation ||
    root?.current_station ||
    root?.currentLocation ||
    root?.current_location ||
    root?.current ||
    {};

  const next =
    root?.nextStation ||
    root?.next_station ||
    root?.next ||
    {};

  const train =
    root?.train ||
    root?.trainInfo ||
    {};

  show(id, `

    <div class="live-result-card">

      <h2>📍 Live Train Status</h2>

      <p>
        <b>Train:</b>
        ${esc(
          root?.trainName ||
          train?.trainName ||
          train?.train_name ||
          "-"
        )}
      </p>

      <p>
        <b>Train Number:</b>
        ${esc(
          root?.trainNumber ||
          train?.trainNumber ||
          train?.train_no ||
          "-"
        )}
      </p>

      <div class="current-location">

        <h3>
          🟢 CURRENT LOCATION
        </h3>

        <strong>
          ${esc(stationName(current))}
        </strong>

        <div class="time-grid">

          <div>
            <small>ACTUAL TIME</small>
            <strong>
              ${esc(actualTime(current))}
            </strong>
          </div>

          <div>
            <small>SCHEDULED TIME</small>
            <strong>
              ${esc(scheduledTime(current))}
            </strong>
          </div>

          <div>
            <small>DELAY</small>
            <strong>
              ${esc(delayText(current))}
            </strong>
          </div>

        </div>

      </div>

      <div class="next-station">

        <h3>
          🔵 NEXT STATION
        </h3>

        <strong>
          ${esc(stationName(next))}
        </strong>

        <div class="time-grid">

          <div>
            <small>EXPECTED / ACTUAL</small>
            <strong>
              ${esc(actualTime(next))}
            </strong>
          </div>

          <div>
            <small>SCHEDULED</small>
            <strong>
              ${esc(scheduledTime(next))}
            </strong>
          </div>

        </div>

      </div>

      ${
        root?.status
          ? `
            <p>
              <b>Status:</b>
              ${esc(root.status)}
            </p>
          `
          : ""
      }

    </div>

  `);
}

function stationName(obj) {

  if (!obj) return "-";

  if (typeof obj === "string") {
    return formatStation(obj);
  }

  return (
    obj?.stationName ||
    obj?.station_name ||
    obj?.stnName ||
    obj?.name ||
    obj?.station ||
    obj?.code ||
    "-"
  );
}

function actualTime(obj) {

  if (!obj) return "-";

  return (
    obj?.actualTime ||
    obj?.actual_time ||
    obj?.actual ||
    obj?.arrival?.actual ||
    obj?.departure?.actual ||
    obj?.expected ||
    obj?.expectedTime ||
    "-"
  );
}

function scheduledTime(obj) {

  if (!obj) return "-";

  return (
    obj?.scheduledTime ||
    obj?.scheduled_time ||
    obj?.scheduled ||
    obj?.arrival?.scheduled ||
    obj?.departure?.scheduled ||
    "-"
  );
}

function delayText(obj) {

  if (!obj) return "-";

  const delay =
    obj?.delay ??
    obj?.delayMinutes ??
    obj?.delay_minutes ??
    obj?.arrival?.delay ??
    obj?.departure?.delay;

  if (
    delay === undefined ||
    delay === null ||
    delay === ""
  ) {
    return "-";
  }

  return `${delay} min`;
}

/* =========================================================
   TRAIN INFORMATION
========================================================= */

async function getTrainInfo() {

  const trainNo =
    upper("trainInfoNumber");

  if (!/^\d{5}$/.test(trainNo)) {

    errorBox(
      "trainInfoResult",
      "5 digit train number enter karo."
    );

    return;
  }

  loading(
    "trainInfoResult",
    "Train information load ho rahi hai..."
  );

  try {

    const result =
      await railway("TRAIN", {
        trainNo
      });

    renderTrainInfo(
      result,
      "trainInfoResult"
    );

  } catch (error) {

    errorBox(
      "trainInfoResult",
      error.message
    );

  }
}

function renderTrainInfo(data, id) {

  const d =
    data?.display ||
    data?.data?.trainInfo ||
    data?.data ||
    {};

  show(id, `

    <div class="train-card">

      <h2>
        🚆 ${esc(
          d.trainName ||
          d.train_name ||
          "-"
        )}
      </h2>

      <p>
        <b>Train Number:</b>
        ${esc(
          d.trainNo ||
          d.train_no ||
          "-"
        )}
      </p>

      <p>
        <b>From:</b>
        ${esc(d.from || "-")}
        ${
          d.fromCode
            ? ` (${esc(d.fromCode)})`
            : ""
        }
      </p>

      <p>
        <b>To:</b>
        ${esc(d.to || "-")}
        ${
          d.toCode
            ? ` (${esc(d.toCode)})`
            : ""
        }
      </p>

      <p>
        <b>Departure:</b>
        ${esc(d.departure || "-")}
      </p>

      <p>
        <b>Arrival:</b>
        ${esc(d.arrival || "-")}
      </p>

      <p>
        <b>Travel Time:</b>
        ${esc(d.travelTime || "-")}
      </p>

      <p>
        <b>Running Days:</b>
        ${esc(d.runningDays || "-")}
      </p>

    </div>

  `);
}

/* =========================================================
   TRAINS BETWEEN STATIONS
========================================================= */

async function searchTrains() {

  const from =
    stationValue("fromStation");

  const to =
    stationValue("toStation");

  const date =
    val("searchDate");

  if (!from) {

    errorBox(
      "searchResult",
      "From station select karo."
    );

    return;
  }

  if (!to) {

    errorBox(
      "searchResult",
      "To station select karo."
    );

    return;
  }

  if (!/^[A-Z]{1,5}$/.test(from)) {

    errorBox(
      "searchResult",
      "Valid From station code select karo."
    );

    return;
  }

  if (!/^[A-Z]{1,5}$/.test(to)) {

    errorBox(
      "searchResult",
      "Valid To station code select karo."
    );

    return;
  }

  if (from === to) {

    errorBox(
      "searchResult",
      "From aur To station same nahi ho sakte."
    );

    return;
  }

  loading(
    "searchResult",
    "Trains search ho rahi hain..."
  );

  try {

    const result =
      await railway("SEARCH", {
        from,
        to,
        date: dateForAPI(date)
      });

    renderSearch(
      result,
      "searchResult"
    );

  } catch (error) {

    errorBox(
      "searchResult",
      error.message
    );

  }
}

function renderSearch(data, id) {

  const list =
    data?.display ||
    data?.data ||
    [];

  if (!Array.isArray(list) || !list.length) {

    noData(
      id,
      "Is route par train data available nahi hai."
    );

    return;
  }

  show(id, `

    <div class="train-list">

      <div class="success-box">
        🚆 ${list.length} train(s) found
      </div>

      ${
        list.map(train => `

          <div class="train-card">

            <h3>
              🚆 ${esc(
                train.trainNo ||
                train.train_no ||
                "-"
              )}
              —
              ${esc(
                train.trainName ||
                train.train_name ||
                "-"
              )}
            </h3>

            <p>
              <b>From:</b>
              ${esc(
                train.from ||
                train.from_stn_name ||
                "-"
              )}
            </p>

            <p>
              <b>To:</b>
              ${esc(
                train.to ||
                train.to_stn_name ||
                "-"
              )}
            </p>

            <p>
              🕐 <b>Departure:</b>
              ${esc(
                train.departure ||
                train.from_time ||
                "-"
              )}
            </p>

            <p>
              🕐 <b>Arrival:</b>
              ${esc(
                train.arrival ||
                train.to_time ||
                "-"
              )}
            </p>

            <p>
              ⏱️ <b>Travel Time:</b>
              ${esc(
                train.travelTime ||
                train.travel_time ||
                "-"
              )}
            </p>

            <p>
              📅 <b>Running:</b>
              ${esc(
                train.runningDays ||
                train.running_days ||
                "-"
              )}
            </p>

          </div>

        `).join("")
      }

    </div>

  `);
}

/* =========================================================
   LIVE STATION
========================================================= */

async function checkLiveStation() {

  const station =
    stationValue("liveStation");

  const hours =
    Number(
      val("liveStationHours") || 2
    );

  if (!/^[A-Z]{1,5}$/.test(station)) {

    errorBox(
      "liveStationResult",
      "Station select karo."
    );

    return;
  }

  if (![2, 4, 8].includes(hours)) {

    errorBox(
      "liveStationResult",
      "Time window invalid hai."
    );

    return;
  }

  loading(
    "liveStationResult",
    "Live station data load ho raha hai..."
  );

  try {

    const result =
      await railway("STATION", {
        station,
        hours
      });

    renderLiveStation(
      result,
      "liveStationResult",
      station
    );

  } catch (error) {

    errorBox(
      "liveStationResult",
      error.message
    );

  }
}

function renderLiveStation(
  data,
  id,
  stationCode
) {

  const root =
    data?.data ||
    data?.result ||
    data ||
    {};

  let trains =
    root?.trains ||
    root?.data ||
    [];

  if (!Array.isArray(trains)) {
    trains = [];
  }

  if (!trains.length) {

    noData(
      id,
      `🚉 ${stationCode} par abhi train data available nahi hai.`
    );

    return;
  }

  show(id, `

    <div class="station-result">

      <h2>
        🚉 ${esc(stationCode)} Live Station
      </h2>

      <p>
        ${trains.length} trains found
      </p>

      ${
        trains.map(train => `

          <div class="train-card">

            <h3>
              🚆 ${esc(
                train.trainNo ||
                train.train_no ||
                "-"
              )}
              —
              ${esc(
                train.trainName ||
                train.train_name ||
                "-"
              )}
            </h3>

            <p>
              🟢 <b>Arrival:</b>
              ${esc(
                train.arrival ||
                train.arrivalTime ||
                train.arrival_time ||
                "-"
              )}
            </p>

            <p>
              🚉 <b>Platform:</b>
              ${esc(
                train.platform ||
                train.platformNumber ||
                "-"
              )}
            </p>

          </div>

        `).join("")
      }

    </div>

  `);
}

/* =========================================================
   SEAT AVAILABILITY
========================================================= */

async function checkSeats() {

  const trainNo =
    upper("seatTrainNumber");

  const from =
    stationValue("seatFromStation");

  const to =
    stationValue("seatToStation");

  const date =
    val("seatDate");

  const coach =
    upper("seatClass");

  const quota =
    upper("seatQuota");

  if (!/^\d{5}$/.test(trainNo)) {

    errorBox(
      "seatResult",
      "Valid 5 digit train number enter karo."
    );

    return;
  }

  if (!from || !to) {

    errorBox(
      "seatResult",
      "From aur To station select karo."
    );

    return;
  }

  if (!date || !coach || !quota) {

    errorBox(
      "seatResult",
      "Date, class aur quota select karo."
    );

    return;
  }

  loading(
    "seatResult",
    "Seat availability check ho rahi hai..."
  );

  try {

    const result =
      await railway("SEATS", {
        trainNo,
        from,
        to,
        date: dateForAPI(date),
        coach,
        quota
      });

    renderSeats(
      result,
      "seatResult"
    );

  } catch (error) {

    errorBox(
      "seatResult",
      error.message
    );

  }
}

function renderSeats(data, id) {

  const d =
    data?.display ||
    data?.data ||
    {};

  const availability =
    d?.availability ||
    [];

  show(id, `

    <div class="seat-result">

      <h2>
        💺 Seat Availability
      </h2>

      <p>
        <b>Train:</b>
        ${esc(d.trainNo || "-")}
        —
        ${esc(d.trainName || "-")}
      </p>

      <p>
        <b>Route:</b>
        ${esc(d.from || "-")}
        →
        ${esc(d.to || "-")}
      </p>

      <p>
        <b>Base Fare:</b>
        ₹${esc(d.baseFare || "-")}
      </p>

      <p>
        <b>Total Fare:</b>
        ₹${esc(d.totalFare || "-")}
      </p>

      ${
        Array.isArray(availability) &&
        availability.length
          ? availability.map(x => `

              <div class="train-card">

                <h3>
                  📅 ${esc(x.date || "-")}
                </h3>

                <p>
                  <b>Status:</b>
                  ${esc(x.status || "-")}
                </p>

                <p>
                  <b>Prediction:</b>
                  ${esc(x.prediction || "-")}
                </p>

              </div>

            `).join("")
          : `
            <div class="no-data">
              Availability data available nahi hai.
            </div>
          `
      }

    </div>

  `);
}

/* =========================================================
   FARE
========================================================= */

async function checkFare() {

  const trainNo =
    upper("fareTrainNumber");

  const from =
    stationValue("fareFromStation");

  const to =
    stationValue("fareToStation");

  const date =
    val("fareDate");

  const travelClass =
    upper("fareClass");

  const quota =
    upper("fareQuota");

  if (!/^\d{5}$/.test(trainNo)) {

    errorBox(
      "fareResult",
      "Valid 5 digit train number enter karo."
    );

    return;
  }

  if (!from || !to) {

    errorBox(
      "fareResult",
      "From aur To station select karo."
    );

    return;
  }

  if (!date || !travelClass || !quota) {

    errorBox(
      "fareResult",
      "Date, class aur quota select karo."
    );

    return;
  }

  loading(
    "fareResult",
    "Fare calculate ho raha hai..."
  );

  try {

    const result =
      await railway("FARE", {
        trainNo,
        from,
        to,
        date: dateForAPI(date),
        travelClass,
        quota
      });

    renderFare(
      result,
      "fareResult"
    );

  } catch (error) {

    errorBox(
      "fareResult",
      error.message
    );

  }
}

function renderFare(data, id) {

  const d =
    data?.data ||
    data?.result ||
    data ||
    {};

  const fare =
    d?.fare ||
    d ||
    {};

  show(id, `

    <div class="fare-result">

      <h2>
        💰 Fare Enquiry Result
      </h2>

      <div class="pnr-info-grid">

        <div>
          <small>BASE FARE</small>
          <strong>
            ₹${esc(
              fare.baseFare ??
              d.baseFare ??
              "-"
            )}
          </strong>
        </div>

        <div>
          <small>TOTAL FARE</small>
          <strong>
            ₹${esc(
              fare.totalFare ??
              d.totalFare ??
              "-"
            )}
          </strong>
        </div>

      </div>

      ${
        Array.isArray(d?.breakdown)
          ? d.breakdown.map(x => `
              <p>
                <b>${esc(x.name || "Fare")}</b>:
                ₹${esc(x.amount || "-")}
              </p>
            `).join("")
          : ""
      }

    </div>

  `);
}

/* =========================================================
   TRAIN HISTORY
========================================================= */

async function checkHistory() {

  const trainNo =
    upper("historyTrainNumber");

  const date =
    val("historyDate");

  if (!/^\d{5}$/.test(trainNo)) {

    errorBox(
      "historyResult",
      "Valid 5 digit train number enter karo."
    );

    return;
  }

  if (!date) {

    errorBox(
      "historyResult",
      "Journey date select karo."
    );

    return;
  }

  loading(
    "historyResult",
    "Train history load ho rahi hai..."
  );

  try {

    const result =
      await railway("HISTORY", {
        trainNo,
        date: dateForAPI(date)
      });

    renderHistory(
      result,
      "historyResult"
    );

  } catch (error) {

    errorBox(
      "historyResult",
      error.message
    );

  }
}

function renderHistory(data, id) {

  const root =
    data?.data ||
    data?.result ||
    data ||
    {};

  let records =
    root?.history ||
    root?.records ||
    root?.data ||
    [];

  if (!Array.isArray(records)) {
    records = [];
  }

  if (!records.length) {

    noData(
      id,
      "Train history record nahi mila."
    );

    return;
  }

  show(id, `

    <div class="history-result">

      <h2>
        📜 Train History
      </h2>

      ${
        records.map(item => `

          <div class="train-card">

            <p>
              <b>Date:</b>
              ${esc(
                item.date ||
                item.journeyDate ||
                "-"
              )}
            </p>

            <p>
              <b>Status:</b>
              ${esc(
                item.status ||
                item.runningStatus ||
                "-"
              )}
            </p>

            <p>
              <b>Station:</b>
              ${esc(
                item.stationName ||
                item.station ||
                "-"
              )}
            </p>

            <p>
              <b>Arrival:</b>
              ${esc(
                item.arrival ||
                item.arrivalTime ||
                "-"
              )}
            </p>

            <p>
              <b>Departure:</b>
              ${esc(
                item.departure ||
                item.departureTime ||
                "-"
              )}
            </p>

          </div>

        `).join("")
      }

    </div>

  `);
}

/* =========================================================
   CANCELLED TRAINS
========================================================= */

async function checkCancelled() {

  loading(
    "cancelledResult",
    "Cancelled train data load ho raha hai..."
  );

  try {

    const result =
      await railway("CANCELLED");

    renderCancelled(
      result,
      "cancelledResult"
    );

  } catch (error) {

    errorBox(
      "cancelledResult",
      error.message
    );

  }
}

function renderCancelled(data, id) {

  const root =
    data?.data ||
    data?.result ||
    data ||
    {};

  let list =
    Array.isArray(root)
      ? root
      : root?.trains ||
        root?.cancelledTrains ||
        [];

  if (!Array.isArray(list) || !list.length) {

    noData(
      id,
      "Cancelled train data available nahi hai."
    );

    return;
  }

  show(id, `

    <div class="cancelled-list">

      <h2>
        ❌ Cancelled Trains
      </h2>

      ${
        list.map(train => `

          <div class="train-card">

            <h3>
              ❌ ${esc(
                train.trainNo ||
                train.train_no ||
                "-"
              )}
              —
              ${esc(
                train.trainName ||
                train.train_name ||
                "-"
              )}
            </h3>

            <p>
              <b>Date:</b>
              ${esc(
                train.date ||
                train.journeyDate ||
                "-"
              )}
            </p>

            <p>
              <b>Reason:</b>
              ${esc(
                train.reason ||
                train.status ||
                "Cancelled"
              )}
            </p>

          </div>

        `).join("")
      }

    </div>

  `);
}

/* =========================================================
   FORM EVENT LISTENERS
========================================================= */

function bindForms() {

  $("pnrForm")?.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      checkPNR();
    }
  );

  $("liveForm")?.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      checkLiveTrain();
    }
  );

  $("trainInfoForm")?.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      getTrainInfo();
    }
  );

  $("searchForm")?.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      searchTrains();
    }
  );

  $("stationForm")?.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      checkLiveStation();
    }
  );

  $("seatForm")?.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      checkSeats();
    }
  );

  $("fareForm")?.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      checkFare();
    }
  );

  $("historyForm")?.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      checkHistory();
    }
  );

  $("checkCancelled")?.addEventListener(
    "click",
    checkCancelled
  );

}

/* =========================================================
   NUMBER INPUT CLEANING
========================================================= */

function bindNumberInputs() {

  const ids = [
    "pnrNumber",
    "liveTrainNumber",
    "trainInfoNumber",
    "seatTrainNumber",
    "fareTrainNumber",
    "historyTrainNumber"
  ];

  ids.forEach(id => {

    const input = $(id);

    if (!input) return;

    input.addEventListener(
      "input",
      () => {

        input.value =
          input.value
            .replace(/\D/g, "");

        const max =
          Number(
            input.getAttribute("maxlength")
          );

        if (max) {
          input.value =
            input.value.slice(0, max);
        }

      }
    );

  });
}

/* =========================================================
   ENTER KEY SUPPORT
========================================================= */

function bindEnterSupport() {

  document.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Enter") {
        return;
      }

      const target =
        event.target;

      if (
        target?.matches(
          "input[data-station='true']"
        )
      ) {

        const dropdown =
          target
            .closest(".station-field")
            ?.querySelector(
              ".station-suggestions"
            );

        const first =
          dropdown?.querySelector(
            ".station-option"
          );

        if (first) {
          event.preventDefault();
          first.click();
        }

      }

    }
  );

}

/* =========================================================
   QUICK DATE SETUP
========================================================= */

function bindDateLimits() {

  const current = today();

  [
    "liveTrainDate",
    "searchDate",
    "seatDate",
    "fareDate",
    "historyDate"
  ].forEach(id => {

    const input = $(id);

    if (!input) return;

    input.min = current;

    if (!input.value) {
      input.value = current;
    }

  });
}

/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    console.log(
      "🚆 AINEX Railway starting..."
    );

    bindForms();
    bindNumberInputs();
    bindEnterSupport();
    bindDateLimits();

    /*
       Autocomplete ko JSON ke response ka
       wait karne ki zarurat nahi.
       Pehle inputs initialise kar do.
    */
    setupAutocomplete();

    /*
       Then station database load karo.
    */
    await loadStations();

    setDefaultDates();

    console.log(
      "✅ AINEX Railway ready"
    );

  }
);
