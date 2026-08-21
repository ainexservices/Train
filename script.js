/* =========================================================
   AINEX RAILWAY - SCRIPT.JS
   PNR + Station Autocomplete + Railway Services
   ========================================================= */

const API = "/api/railway";
let stations = [];

/* =========================
   COMMON HELPERS
========================= */

const $ = (id) => document.getElementById(id);

function val(id) {
  return String($(id)?.value || "").trim();
}

function clean(v) {
  return String(v || "").trim().toUpperCase();
}

function esc(v) {
  return String(v ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showError(box, message) {
  if (!box) return;

  box.innerHTML = `
    <div class="error-box">
      ❌ ${esc(message)}
    </div>
  `;
}

function showLoading(box, text = "Data load ho raha hai...") {
  if (!box) return;

  box.innerHTML = `
    <div class="loading-box">
      🔄 ${esc(text)}
    </div>
  `;
}

async function api(action, params = {}) {
  const query = new URLSearchParams({
    action,
    ...params
  });

  const response = await fetch(`${API}?${query.toString()}`, {
    method: "GET",
    cache: "no-store"
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Server se valid response nahi mila.");
  }

  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.message ||
      data?.error ||
      "Railway request failed."
    );
  }

  return data;
}

/* =========================================================
   STATION JSON
========================================================= */

async function loadStations() {
  try {
    const response = await fetch("/station.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("station.json load nahi hua.");
    }

    const data = await response.json();

    stations = Array.isArray(data)
      ? data
      : Array.isArray(data.stations)
        ? data.stations
        : [];

    /* Duplicate station code remove */
    const unique = new Map();

    stations.forEach(s => {
      const code = clean(s.stnCode);

      if (code && !unique.has(code)) {
        unique.set(code, {
          stnCode: code,
          stnName: s.stnName || code,
          stnCity: s.stnCity || s.stnName || code
        });
      }
    });

    stations = [...unique.values()];

    setupStationInputs();

    console.log("Stations loaded:", stations.length);

  } catch (error) {
    console.error("STATION JSON ERROR:", error);
  }
}

/* =========================================================
   STATION AUTOCOMPLETE
========================================================= */

function setupStationInputs() {
  const inputs = document.querySelectorAll(
    'input[data-station], .station-input, input[placeholder*="station" i]'
  );

  inputs.forEach(input => {
    if (input.dataset.autocompleteReady === "1") return;

    input.dataset.autocompleteReady = "1";

    const wrapper =
      input.closest(".station-field") ||
      input.parentElement;

    if (!wrapper) return;

    wrapper.style.position = "relative";

    const list = document.createElement("div");

    list.className = "station-suggestions";

    list.style.cssText = `
      position:absolute;
      left:0;
      right:0;
      top:100%;
      z-index:9999;
      background:#fff;
      border:1px solid #dbe3ef;
      border-radius:12px;
      box-shadow:0 8px 25px rgba(0,0,0,.12);
      max-height:280px;
      overflow-y:auto;
      display:none;
    `;

    wrapper.appendChild(list);

    input.addEventListener("input", () => {
      const query = clean(input.value);

      if (!query) {
        list.style.display = "none";
        list.innerHTML = "";
        return;
      }

      const results = stations
        .filter(s => {
          const code = clean(s.stnCode);
          const name = clean(s.stnName);
          const city = clean(s.stnCity);

          return (
            code.startsWith(query) ||
            name.startsWith(query) ||
            city.startsWith(query) ||
            name.includes(query) ||
            city.includes(query)
          );
        })
        .slice(0, 12);

      renderSuggestions(input, list, results);
    });

    input.addEventListener("focus", () => {
      if (input.value.trim()) {
        input.dispatchEvent(new Event("input"));
      }
    });

    document.addEventListener("click", e => {
      if (!wrapper.contains(e.target)) {
        list.style.display = "none";
      }
    });
  });
}

function renderSuggestions(input, list, results) {
  if (!results.length) {
    list.innerHTML = `
      <div style="padding:14px;color:#777">
        Station nahi mila
      </div>
    `;

    list.style.display = "block";
    return;
  }

  list.innerHTML = results.map(s => `
    <div
      class="station-option"
      data-code="${esc(s.stnCode)}"
      style="
        padding:12px 14px;
        cursor:pointer;
        border-bottom:1px solid #eef2f7;
      "
    >
      <strong>${esc(s.stnCode)}</strong>
      — ${esc(s.stnName)}
      <small style="display:block;color:#7b8794;margin-top:3px">
        ${esc(s.stnCity)}
      </small>
    </div>
  `).join("");

  list.style.display = "block";

  list.querySelectorAll(".station-option").forEach(item => {
    item.addEventListener("click", () => {
      const code = item.dataset.code;

      input.value = code;

      input.dataset.stationCode = code;

      list.style.display = "none";

      input.dispatchEvent(
        new Event("change", { bubbles: true })
      );
    });
  });
}

/* =========================================================
   GET STATION CODE
========================================================= */

function getStationCode(inputId) {
  const input = $(inputId);

  if (!input) return "";

  const typed = clean(input.value);

  if (input.dataset.stationCode) {
    return clean(input.dataset.stationCode);
  }

  const exactCode = stations.find(
    s => clean(s.stnCode) === typed
  );

  if (exactCode) {
    return exactCode.stnCode;
  }

  const exactName = stations.find(
    s =>
      clean(s.stnName) === typed ||
      clean(s.stnCity) === typed
  );

  return exactName?.stnCode || typed;
}

/* =========================================================
   PNR STATUS
========================================================= */

async function checkPNR() {
  const input = $("pnrNumber");
  const result = $("pnrResult");

  if (!input || !result) {
    console.error("PNR elements missing.");
    return;
  }

  /*
    IMPORTANT:
    User input ko pehle clean kar rahe hain.
    Isse 8452336739 valid rahega.
  */

  const pnr = String(input.value || "")
    .replace(/\D/g, "")
    .trim();

  input.value = pnr;

  if (!/^\d{10}$/.test(pnr)) {
    showError(
      result,
      "Please enter valid 10 digit PNR."
    );
    return;
  }

  showLoading(
    result,
    "PNR status check ho raha hai..."
  );

  try {
    const data = await api("PNR", { pnr });

    renderPNR(data, result);

  } catch (error) {
    console.error("PNR ERROR:", error);

    showError(
      result,
      error.message || "PNR status fetch nahi ho saka."
    );
  }
}

/* =========================================================
   PNR RENDER
========================================================= */

function renderPNR(data, box) {
  const root =
    data?.data ||
    data?.result ||
    data;

  const pnr =
    root?.pnr ||
    root?.pnrNumber ||
    root?.pnr_number ||
    "-";

  const train =
    root?.train ||
    root?.trainInfo ||
    {};

  const trainName =
    root?.trainName ||
    root?.train_name ||
    train?.trainName ||
    train?.train_name ||
    "-";

  const trainNo =
    root?.trainNumber ||
    root?.train_no ||
    root?.trainNo ||
    train?.trainNumber ||
    train?.train_no ||
    "-";

  const from =
    root?.from ||
    root?.fromStation ||
    root?.from_station ||
    root?.source ||
    root?.sourceStation ||
    "-";

  const to =
    root?.to ||
    root?.toStation ||
    root?.to_station ||
    root?.destination ||
    root?.destinationStation ||
    "-";

  const journeyDate =
    root?.journeyDate ||
    root?.journey_date ||
    root?.date ||
    "-";

  const travelClass =
    root?.class ||
    root?.travelClass ||
    root?.travel_class ||
    "-";

  const passengers =
    root?.passengers ||
    root?.passengerDetails ||
    root?.passenger_details ||
    root?.passenger ||
    [];

  const passengerList = Array.isArray(passengers)
    ? passengers
    : [];

  box.innerHTML = `
    <div class="pnr-result-card">

      <div class="pnr-header">
        <small>PNR RESULT</small>
        <h2>PNR ${esc(pnr)}</h2>
      </div>

      <div class="pnr-route">
        <div>
          <small>FROM</small>
          <strong>${esc(formatStation(from))}</strong>
        </div>

        <div class="route-arrow">→</div>

        <div>
          <small>TO</small>
          <strong>${esc(formatStation(to))}</strong>
        </div>
      </div>

      <div class="pnr-info-grid">

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
          <strong>${esc(formatDate(journeyDate))}</strong>
        </div>

        <div>
          <small>CLASS</small>
          <strong>${esc(travelClass)}</strong>
        </div>

      </div>

      <h3>Passenger Details</h3>

      ${
        passengerList.length
          ? passengerList.map((p, index) =>
              renderPassenger(p, index)
            ).join("")
          : `
            <div class="no-passenger">
              Passenger details API response me available nahi hain.
            </div>
          `
      }

      <div class="pnr-footer">
        🔒 Railway information fetched securely.
      </div>

    </div>
  `;
}

/* =========================================================
   PASSENGER
========================================================= */

function renderPassenger(p, index) {
  const booking =
    p?.bookingStatus ||
    p?.booking_status ||
    p?.booking ||
    p?.status ||
    "-";

  const current =
    p?.currentStatus ||
    p?.current_status ||
    p?.current ||
    p?.status ||
    "-";

  const coach =
    p?.coach ||
    p?.coachNumber ||
    p?.coach_number ||
    p?.coachName ||
    "-";

  const seat =
    p?.seatBerth ||
    p?.seat_berth ||
    p?.seat ||
    p?.berth ||
    p?.berthNumber ||
    "-";

  const name =
    p?.name ||
    p?.passengerName ||
    p?.passenger_name ||
    `Passenger ${index + 1}`;

  return `
    <div class="passenger-card">

      <div class="passenger-top">
        <strong>${esc(name)}</strong>

        <span class="status-badge">
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
          <strong>${esc(seat)}</strong>
        </div>

      </div>

    </div>
  `;
}

/* =========================================================
   TRAIN INFORMATION
========================================================= */

async function getTrainInfo() {
  const trainNo = clean(
    val("trainInfoNumber") ||
    val("trainNumber")
  );

  const result =
    $("trainInfoResult") ||
    $("trainInformationResult");

  if (!/^\d{5}$/.test(trainNo)) {
    showError(result, "5 digit train number enter karo.");
    return;
  }

  showLoading(
    result,
    "Train information load ho rahi hai..."
  );

  try {
    const data = await api("TRAIN", { trainNo });

    renderGenericResult(result, data);

  } catch (error) {
    showError(result, error.message);
  }
}

/* =========================================================
   LIVE TRAIN
========================================================= */

async function checkLiveTrain() {
  const trainNo = clean(
    val("liveTrainNumber") ||
    val("liveTrainNo") ||
    val("trainNumberLive")
  );

  const date =
    val("liveTrainDate") ||
    val("liveDate") ||
    val("journeyDate");

  const result =
    $("liveTrainResult") ||
    $("liveResult");

  if (!/^\d{5}$/.test(trainNo)) {
    showError(result, "5 digit train number enter karo.");
    return;
  }

  if (!date) {
    showError(result, "Journey date required.");
    return;
  }

  showLoading(
    result,
    "Live train location check ho rahi hai..."
  );

  try {
    const data = await api("LIVE", {
      trainNo,
      date: convertDate(date)
    });

    renderLiveTrain(data, result);

  } catch (error) {
    showError(result, error.message);
  }
}

/* =========================================================
   LIVE TRAIN RENDER
========================================================= */

function renderLiveTrain(data, box) {
  const root =
    data?.data ||
    data?.result ||
    data;

  const train =
    root?.train ||
    {};

  const stationsData =
    root?.stations ||
    root?.stationUpdates ||
    root?.route ||
    [];

  const list = Array.isArray(stationsData)
    ? stationsData
    : [];

  const current =
    root?.currentStation ||
    root?.current_station ||
    root?.currentLocation ||
    root?.current_location ||
    null;

  const next =
    root?.nextStation ||
    root?.next_station ||
    null;

  box.innerHTML = `
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
          root?.trainNo ||
          root?.trainNumber ||
          train?.trainNo ||
          "-"
        )}
      </p>

      <div class="current-location">
        <h3>🟢 CURRENT LOCATION</h3>

        <strong>
          ${esc(
            getLocationName(current) || "-"
          )}
        </strong>

        <div class="time-grid">

          <div>
            <small>ACTUAL TIME</small>
            <strong>
              ${esc(
                getActualTime(current)
              )}
            </strong>
          </div>

          <div>
            <small>SCHEDULED TIME</small>
            <strong>
              ${esc(
                getScheduledTime(current)
              )}
            </strong>
          </div>

          <div>
            <small>DELAY</small>
            <strong>
              ${esc(
                getDelay(current)
              )}
            </strong>
          </div>

        </div>
      </div>

      <div class="next-station">
        <h3>🔵 NEXT STATION</h3>

        <strong>
          ${esc(
            getLocationName(next) || "-"
          )}
        </strong>

        <div class="time-grid">

          <div>
            <small>EXPECTED / ACTUAL</small>
            <strong>
              ${esc(
                getActualTime(next)
              )}
            </strong>
          </div>

          <div>
            <small>SCHEDULED</small>
            <strong>
              ${esc(
                getScheduledTime(next)
              )}
            </strong>
          </div>

        </div>
      </div>

      ${
        root?.status
          ? `
            <p class="train-status">
              <b>Status:</b>
              ${esc(root.status)}
            </p>
          `
          : ""
      }

    </div>
  `;
}

function getLocationName(item) {
  if (!item) return "";

  return (
    item?.stationName ||
    item?.station_name ||
    item?.name ||
    item?.stnName ||
    item?.station ||
    item?.code ||
    ""
  );
}

function getActualTime(item) {
  if (!item) return "-";

  return (
    item?.actualTime ||
    item?.actual_time ||
    item?.actual ||
    item?.arrival?.actual ||
    item?.departure?.actual ||
    item?.expected ||
    "-"
  );
}

function getScheduledTime(item) {
  if (!item) return "-";

  return (
    item?.scheduledTime ||
    item?.scheduled_time ||
    item?.scheduled ||
    item?.arrival?.scheduled ||
    item?.departure?.scheduled ||
    "-"
  );
}

function getDelay(item) {
  if (!item) return "-";

  const delay =
    item?.delay ??
    item?.delayMinutes ??
    item?.delay_minutes ??
    item?.arrival?.delay ??
    item?.departure?.delay;

  if (
    delay === undefined ||
    delay === null ||
    delay === ""
  ) {
    return "- min";
  }

  return `${delay} min`;
}

/* =========================================================
   TRAIN SEARCH
========================================================= */

async function searchTrains() {
  const from = getStationCode("fromStation");
  const to = getStationCode("toStation");

  const date =
    val("searchDate") ||
    val("trainSearchDate") ||
    val("journeyDateSearch");

  const result =
    $("searchResult") ||
    $("trainSearchResult");

  if (!from) {
    showError(result, "From station select karo.");
    return;
  }

  if (!to) {
    showError(result, "To station select karo.");
    return;
  }

  if (from === to) {
    showError(
      result,
      "From aur To station same nahi ho sakte."
    );
    return;
  }

  showLoading(
    result,
    "Trains search ho rahi hain..."
  );

  try {
    const data = await api("SEARCH", {
      from,
      to,
      date: date ? convertDate(date) : ""
    });

    renderTrainSearch(data, result);

  } catch (error) {
    showError(result, error.message);
  }
}

/* =========================================================
   TRAIN SEARCH RENDER
========================================================= */

function renderTrainSearch(data, box) {
  const list =
    Array.isArray(data?.display)
      ? data.display
      : Array.isArray(data?.data)
        ? data.data
        : [];

  if (!list.length) {
    box.innerHTML = `
      <div class="no-data">
        🚆 Is route par train data nahi mila.
      </div>
    `;
    return;
  }

  box.innerHTML = list.map(t => `
    <div class="train-card">

      <h3>
        🚆 ${esc(
          t.trainName ||
          t.train_name ||
          "-"
        )}
      </h3>

      <strong>
        ${esc(
          t.trainNo ||
          t.train_no ||
          "-"
        )}
      </strong>

      <p>
        ${esc(
          t.from ||
          t.from_stn_name ||
          "-"
        )}
        →
        ${esc(
          t.to ||
          t.to_stn_name ||
          "-"
        )}
      </p>

      <p>
        🕐 ${esc(
          t.departure ||
          t.from_time ||
          "-"
        )}
        →
        ${esc(
          t.arrival ||
          t.to_time ||
          "-"
        )}
      </p>

      <p>
        ⏱️ ${esc(
          t.travelTime ||
          t.travel_time ||
          "-"
        )}
      </p>

    </div>
  `).join("");
}

/* =========================================================
   LIVE STATION
========================================================= */

async function checkLiveStation() {
  const station =
    getStationCode("liveStation") ||
    getStationCode("stationCode");

  const hours =
    val("liveStationHours") ||
    val("stationHours") ||
    "2";

  const result =
    $("liveStationResult") ||
    $("stationResult");

  if (!/^[A-Z]{2,5}$/.test(station)) {
    showError(
      result,
      "Valid station select karo."
    );
    return;
  }

  showLoading(
    result,
    "Live station trains load ho rahi hain..."
  );

  try {
    const data = await api("STATION", {
      station,
      hours
    });

    renderLiveStation(data, result);

  } catch (error) {
    showError(result, error.message);
  }
}

/* =========================================================
   LIVE STATION RENDER
========================================================= */

function renderLiveStation(data, box) {
  const root =
    data?.data ||
    data?.result ||
    data;

  const trains =
    root?.trains ||
    data?.display ||
    [];

  const list =
    Array.isArray(trains)
      ? trains
      : [];

  box.innerHTML = `
    <div class="station-live-card">

      <h2>🚉 ${esc(
        root?.stationName ||
        root?.station ||
        root?.stnCode ||
        "-"
      )} Live Station</h2>

      <p>
        ${list.length} trains found
      </p>

      ${
        list.length
          ? list.map(t => `
              <div class="station-train-card">

                <h3>
                  🚆 ${esc(
                    t.trainNo ||
                    t.train_no ||
                    "-"
                  )}
                  —
                  ${esc(
                    t.trainName ||
                    t.train_name ||
                    "-"
                  )}
                </h3>

                <p>
                  🟢 Arrival:
                  ${esc(
                    t.arrival?.actual ||
                    t.arrival?.scheduled ||
                    t.arrival ||
                    "-"
                  )}
                </p>

                <p>
                  🔵 Departure:
                  ${esc(
                    t.departure?.actual ||
                    t.departure?.scheduled ||
                    t.departure ||
                    "-"
                  )}
                </p>

                <p>
                  🚉 Platform:
                  ${esc(
                    t.platform ||
                    "-"
                  )}
                </p>

              </div>
            `).join("")
          : `
              <div class="no-data">
                Live train data available nahi hai.
              </div>
            `
      }

    </div>
  `;
}

/* =========================================================
   SEAT AVAILABILITY
========================================================= */

async function checkSeats() {
  const trainNo = clean(
    val("seatTrainNumber") ||
    val("availabilityTrainNumber") ||
    val("trainNumberSeat")
  );

  const from = getStationCode(
    "seatFromStation"
  );

  const to = getStationCode(
    "seatToStation"
  );

  const date =
    val("seatDate") ||
    val("availabilityDate");

  const coach = clean(
    val("seatClass") ||
    val("coach")
  );

  const quota = clean(
    val("seatQuota") ||
    val("quota")
  );

  const result =
    $("seatResult") ||
    $("availabilityResult");

  if (!/^\d{5}$/.test(trainNo)) {
    showError(result, "Invalid train number.");
    return;
  }

  if (
    !/^[A-Z]{2,5}$/.test(from) ||
    !/^[A-Z]{2,5}$/.test(to)
  ) {
    showError(result, "Valid From/To station select karo.");
    return;
  }

  if (!date || !coach || !quota) {
    showError(
      result,
      "Date, class aur quota required."
    );
    return;
  }

  showLoading(
    result,
    "Seat availability check ho rahi hai..."
  );

  try {
    const data = await api("SEATS", {
      trainNo,
      from,
      to,
      date: convertDate(date),
      coach,
      quota
    });

    renderSeats(data, result);

  } catch (error) {
    showError(result, error.message);
  }
}

/* =========================================================
   SEAT RENDER
========================================================= */

function renderSeats(data, box) {
  const display =
    data?.display ||
    data?.data ||
    {};

  const availability =
    display?.availability ||
    [];

  box.innerHTML = `
    <div class="availability-result">

      <h2>
        🚆 ${esc(display.trainName || "-")}
      </h2>

      <p>
        ${esc(display.trainNo || "-")}
      </p>

      <p>
        ${esc(display.from || "-")}
        →
        ${esc(display.to || "-")}
      </p>

      <h3>
        💰 Fare:
        ₹${esc(display.totalFare || display.baseFare || "-")}
      </h3>

      ${
        availability.length
          ? availability.map(a => `
              <div class="availability-card">

                <strong>
                  ${esc(a.date || "-")}
                </strong>

                <p>
                  🎫 ${esc(
                    a.status ||
                    a.availabilityText ||
                    "-"
                  )}
                </p>

                ${
                  a.prediction
                    ? `
                      <p>
                        📊 ${esc(a.prediction)}
                      </p>
                    `
                    : ""
                }

              </div>
            `).join("")
          : `
              <div class="no-data">
                Availability data nahi mila.
              </div>
            `
      }

    </div>
  `;
}

/* =========================================================
   FARE
========================================================= */

async function checkFare() {
  const trainNo = clean(
    val("fareTrainNumber") ||
    val("fareTrainNo")
  );

  const from = getStationCode(
    "fareFromStation"
  );

  const to = getStationCode(
    "fareToStation"
  );

  const date =
    val("fareDate");

  const travelClass = clean(
    val("fareClass") ||
    val("travelClass")
  );

  const quota = clean(
    val("fareQuota") ||
    val("quotaFare")
  );

  const result =
    $("fareResult");

  if (
    !/^\d{5}$/.test(trainNo) ||
    !/^[A-Z]{2,5}$/.test(from) ||
    !/^[A-Z]{2,5}$/.test(to) ||
    !date ||
    !travelClass ||
    !quota
  ) {
    showError(
      result,
      "Fare enquiry details incomplete hain."
    );
    return;
  }

  showLoading(
    result,
    "Fare check ho raha hai..."
  );

  try {
    const data = await api("FARE", {
      trainNo,
      from,
      to,
      date: convertDate(date),
      travelClass,
      quota
    });

    renderGenericResult(result, data);

  } catch (error) {
    showError(result, error.message);
  }
}

/* =========================================================
   HISTORY
========================================================= */

async function checkTrainHistory() {
  const trainNo = clean(
    val("historyTrainNumber") ||
    val("historyTrainNo")
  );

  const date =
    val("historyDate");

  const result =
    $("historyResult");

  if (!/^\d{5}$/.test(trainNo)) {
    showError(
      result,
      "5 digit train number enter karo."
    );
    return;
  }

  if (!date) {
    showError(
      result,
      "Journey date required."
    );
    return;
  }

  showLoading(
    result,
    "Train history check ho rahi hai..."
  );

  try {
    const data = await api("HISTORY", {
      trainNo,
      date: convertDate(date)
    });

    renderGenericResult(result, data);

  } catch (error) {
    showError(result, error.message);
  }
}

/* =========================================================
   CANCELLED TRAINS
========================================================= */

async function checkCancelledTrains() {
  const result =
    $("cancelledResult");

  showLoading(
    result,
    "Cancelled trains check ho rahi hain..."
  );

  try {
    const data = await api("CANCELLED");

    renderGenericResult(result, data);

  } catch (error) {
    showError(result, error.message);
  }
}

/* =========================================================
   GENERIC RESULT
========================================================= */

function renderGenericResult(box, data) {
  if (!box) return;

  const content =
    data?.display ||
    data?.data ||
    data?.result ||
    data;

  box.innerHTML = `
    <div class="generic-result">
      <pre>${esc(
        JSON.stringify(content, null, 2)
      )}</pre>
    </div>
  `;
}

/* =========================================================
   DATE
========================================================= */

function convertDate(value) {
  if (!value) return "";

  const s = String(value);

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    return s;
  }

  const match =
    s.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  return s;
}

function formatDate(value) {
  if (!value) return "-";

  const s = String(value);

  const date =
    new Date(s);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  }

  return s;
}

function formatStation(value) {
  if (!value) return "-";

  if (typeof value === "object") {
    return (
      value?.name ||
      value?.stationName ||
      value?.station_name ||
      value?.code ||
      "-"
    );
  }

  return value;
}

/* =========================================================
   BUTTON AUTO CONNECT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  loadStations();

  /* PNR */
  document
    .querySelectorAll(
      '[data-action="pnr"], #checkPNR, #checkPnr'
    )
    .forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        checkPNR();
      });
    });

  /* Train Info */
  document
    .querySelectorAll(
      '[data-action="train-info"], #checkTrainInfo'
    )
    .forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        getTrainInfo();
      });
    });

  /* Live Train */
  document
    .querySelectorAll(
      '[data-action="live"], #checkLiveTrain'
    )
    .forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        checkLiveTrain();
      });
    });

  /* Search */
  document
    .querySelectorAll(
      '[data-action="search"], #searchTrains'
    )
    .forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        searchTrains();
      });
    });

  /* Live Station */
  document
    .querySelectorAll(
      '[data-action="station"], #checkLiveStation'
    )
    .forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        checkLiveStation();
      });
    });

  /* Seats */
  document
    .querySelectorAll(
      '[data-action="seats"], #checkSeats'
    )
    .forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        checkSeats();
      });
    });

  /* Fare */
  document
    .querySelectorAll(
      '[data-action="fare"], #checkFare'
    )
    .forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        checkFare();
      });
    });

  /* History */
  document
    .querySelectorAll(
      '[data-action="history"], #checkHistory'
    )
    .forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        checkTrainHistory();
      });
    });

  /* Cancelled */
  document
    .querySelectorAll(
      '[data-action="cancelled"], #checkCancelled'
    )
    .forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        checkCancelledTrains();
      });
    });

  /* Enter key PNR */
  $("pnrNumber")?.addEventListener(
    "keydown",
    e => {
      if (e.key === "Enter") {
        e.preventDefault();
        checkPNR();
      }
    }
  );

});

/* =========================================================
   GLOBAL ACCESS
========================================================= */

window.checkPNR = checkPNR;
window.getTrainInfo = getTrainInfo;
window.checkLiveTrain = checkLiveTrain;
window.searchTrains = searchTrains;
window.checkLiveStation = checkLiveStation;
window.checkSeats = checkSeats;
window.checkFare = checkFare;
window.checkTrainHistory = checkTrainHistory;
window.checkCancelledTrains = checkCancelledTrains;
