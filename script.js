/* =========================================================
   AINEX RAILWAY - script.js
   RailKit + station.json
========================================================= */

"use strict";

const API = "/api/railway";

let stations = [];

/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);

const text = id =>
  String($(id)?.value || "").trim();

const upper = id =>
  text(id).toUpperCase();

function esc(value) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loading(id, message = "Data load ho raha hai...") {
  const el = $(id);
  if (!el) return;

  el.innerHTML = `
    <div class="loading-box">
      🔄 ${esc(message)}
    </div>
  `;
}

function errorBox(id, message) {
  const el = $(id);
  if (!el) return;

  el.innerHTML = `
    <div class="error-box">
      ❌ ${esc(message)}
    </div>
  `;
}

function emptyBox(id, message) {
  const el = $(id);
  if (!el) return;

  el.innerHTML = `
    <div class="no-data">
      ${esc(message)}
    </div>
  `;
}

function dateForAPI(value) {
  if (!value) return "";

  const s = String(value);

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    return s;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}-${m}-${y}`;
  }

  return s;
}

/* =========================================================
   API
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

  const response = await fetch(
    `${API}?${query.toString()}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Railway server se valid response nahi mila."
    );
  }

  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.message ||
      data?.error ||
      "Railway API request failed."
    );
  }

  return data;
}

/* =========================================================
   STATION JSON
========================================================= */

async function loadStations() {

  try {

    const response =
      await fetch("/station.json", {
        cache: "no-store"
      });

    if (!response.ok) {
      throw new Error(
        "station.json load nahi hua."
      );
    }

    const data =
      await response.json();

    const list =
      Array.isArray(data)
        ? data
        : data?.stations;

    if (!Array.isArray(list)) {
      throw new Error(
        "station.json ka format galat hai."
      );
    }

    const map = new Map();

    list.forEach(station => {

      const code =
        String(
          station?.stnCode || ""
        ).trim().toUpperCase();

      if (!code) return;

      if (!map.has(code)) {
        map.set(code, {
          stnCode: code,
          stnName:
            station?.stnName ||
            code,
          stnCity:
            station?.stnCity ||
            station?.stnName ||
            code
        });
      }

    });

    stations = [...map.values()];

    setupStationAutocomplete();

    console.log(
      "AINEX Railway Stations:",
      stations.length
    );

  } catch (error) {

    console.error(
      "Station loading error:",
      error
    );

  }
}

/* =========================================================
   STATION AUTOCOMPLETE
========================================================= */

function setupStationAutocomplete() {

  document
    .querySelectorAll(
      "input[data-station='true']"
    )
    .forEach(input => {

      if (
        input.dataset.autocomplete === "yes"
      ) {
        return;
      }

      input.dataset.autocomplete = "yes";

      const parent =
        input.closest(".station-field") ||
        input.parentElement;

      if (!parent) return;

      parent.style.position = "relative";

      let list =
        parent.querySelector(
          ".station-suggestions"
        );

      if (!list) {

        list =
          document.createElement("div");

        list.className =
          "station-suggestions";

        list.style.cssText = `
          position:absolute;
          left:0;
          right:0;
          top:100%;
          z-index:99999;
          background:#fff;
          border:1px solid #dbe3ef;
          border-radius:12px;
          box-shadow:0 8px 25px rgba(0,0,0,.14);
          max-height:280px;
          overflow-y:auto;
          display:none;
        `;

        parent.appendChild(list);
      }

      input.addEventListener(
        "input",
        () => {

          input.dataset.stationCode = "";

          const q =
            input.value
              .trim()
              .toUpperCase();

          if (!q) {
            list.innerHTML = "";
            list.style.display = "none";
            return;
          }

          const results =
            stations
              .filter(station => {

                const code =
                  station.stnCode
                    .toUpperCase();

                const name =
                  station.stnName
                    .toUpperCase();

                const city =
                  station.stnCity
                    .toUpperCase();

                return (
                  code.startsWith(q) ||
                  name.startsWith(q) ||
                  city.startsWith(q) ||
                  name.includes(q) ||
                  city.includes(q)
                );

              })
              .slice(0, 15);

          renderStationSuggestions(
            input,
            list,
            results
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

    });

  document.addEventListener(
    "click",
    event => {

      document
        .querySelectorAll(
          ".station-suggestions"
        )
        .forEach(list => {

          if (
            !list.parentElement
              ?.contains(event.target)
          ) {
            list.style.display = "none";
          }

        });

    }
  );
}

function renderStationSuggestions(
  input,
  list,
  results
) {

  if (!results.length) {

    list.innerHTML = `
      <div style="
        padding:14px;
        color:#777;
      ">
        Station nahi mila
      </div>
    `;

    list.style.display = "block";

    return;
  }

  list.innerHTML =
    results.map(station => `

      <div
        class="station-option"
        data-code="${esc(station.stnCode)}"
        style="
          padding:12px 14px;
          cursor:pointer;
          border-bottom:1px solid #eef2f7;
        "
      >

        <div>
          <strong>
            ${esc(station.stnCode)}
          </strong>

          —
          ${esc(station.stnName)}
        </div>

        <small style="
          display:block;
          color:#777;
          margin-top:3px;
        ">
          ${esc(station.stnCity)}
        </small>

      </div>

    `).join("");

  list.style.display = "block";

  list
    .querySelectorAll(
      ".station-option"
    )
    .forEach(option => {

      option.addEventListener(
        "click",
        () => {

          const code =
            option.dataset.code;

          input.value = code;

          input.dataset.stationCode =
            code;

          list.style.display =
            "none";

          input.dispatchEvent(
            new Event(
              "change",
              { bubbles:true }
            )
          );

        }
      );

    });
}

/* =========================================================
   STATION CODE
========================================================= */

function stationValue(id) {

  const input = $(id);

  if (!input) return "";

  if (input.dataset.stationCode) {
    return input.dataset.stationCode
      .trim()
      .toUpperCase();
  }

  const value =
    input.value.trim().toUpperCase();

  const byCode =
    stations.find(
      station =>
        station.stnCode === value
    );

  if (byCode) {
    return byCode.stnCode;
  }

  const byName =
    stations.find(
      station =>
        station.stnName
          .toUpperCase() === value ||
        station.stnCity
          .toUpperCase() === value
    );

  return byName?.stnCode || value;
}

/* =========================================================
   PNR
========================================================= */

async function checkPNR() {

  const input = $("pnrNumber");

  if (!input) {
    console.error(
      "pnrNumber input missing."
    );
    return;
  }

  let pnr =
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

    const response =
      await railway("PNR", {
        pnr
      });

    renderPNR(
      response,
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

function renderPNR(response, resultId) {

  const root =
    response?.data ||
    response?.result ||
    response;

  const passengers =
    root?.passengers ||
    root?.passengerDetails ||
    [];

  const passengerList =
    Array.isArray(passengers)
      ? passengers
      : [];

  const train =
    root?.trainInfo ||
    root?.train ||
    {};

  const trainNumber =
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

  const pnr =
    root?.pnr ||
    root?.pnrNumber ||
    "-";

  $(resultId).innerHTML = `

    <div class="pnr-result-card">

      <div class="pnr-header">

        <small>PNR STATUS</small>

        <h2>
          🎫 ${esc(pnr)}
        </h2>

      </div>

      <div class="pnr-info-grid">

        <div>
          <small>TRAIN</small>
          <strong>
            ${esc(trainNumber)}
          </strong>
        </div>

        <div>
          <small>TRAIN NAME</small>
          <strong>
            ${esc(trainName)}
          </strong>
        </div>

        <div>
          <small>FROM</small>
          <strong>
            ${esc(formatStation(from))}
          </strong>
        </div>

        <div>
          <small>TO</small>
          <strong>
            ${esc(formatStation(to))}
          </strong>
        </div>

        <div>
          <small>JOURNEY DATE</small>
          <strong>
            ${esc(journeyDate)}
          </strong>
        </div>

      </div>

      <h3>
        👤 Passenger Details
      </h3>

      ${
        passengerList.length
          ? passengerList
              .map(
                (p, i) =>
                  passengerHTML(p, i)
              )
              .join("")
          : `
            <div class="no-data">
              Passenger details response me nahi mile.
            </div>
          `
      }

    </div>

  `;
}

function passengerHTML(
  passenger,
  index
) {

  const booking =
    passenger?.bookingStatus ||
    passenger?.booking_status ||
    passenger?.booking ||
    "-";

  const current =
    passenger?.currentStatus ||
    passenger?.current_status ||
    passenger?.current ||
    "-";

  const coach =
    passenger?.coach ||
    passenger?.coachNumber ||
    passenger?.coach_number ||
    "-";

  const berth =
    passenger?.berth ||
    passenger?.berthNumber ||
    passenger?.seat ||
    passenger?.seatNumber ||
    passenger?.seat_berth ||
    "-";

  const name =
    passenger?.name ||
    passenger?.passengerName ||
    `Passenger ${index + 1}`;

  return `

    <div class="passenger-card">

      <div class="passenger-top">

        <strong>
          👤 ${esc(name)}
        </strong>

        <span class="status-badge">
          ${esc(current)}
        </span>

      </div>

      <div class="passenger-grid">

        <div>
          <small>BOOKING STATUS</small>
          <strong>
            ${esc(booking)}
          </strong>
        </div>

        <div>
          <small>CURRENT STATUS</small>
          <strong>
            ${esc(current)}
          </strong>
        </div>

        <div>
          <small>COACH</small>
          <strong>
            ${esc(coach)}
          </strong>
        </div>

        <div>
          <small>SEAT / BERTH</small>
          <strong>
            ${esc(berth)}
          </strong>
        </div>

      </div>

    </div>

  `;
}

/* =========================================================
   LIVE TRAIN
========================================================= */

async function checkLiveTrain() {

  const trainNo =
    upper("liveTrainNumber");

  const date =
    text("liveTrainDate");

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
      "Journey date required."
    );

    return;
  }

  loading(
    "liveTrainResult",
    "Live train location check ho rahi hai..."
  );

  try {

    const response =
      await railway("LIVE", {
        trainNo,
        date: dateForAPI(date)
      });

    renderLiveTrain(
      response,
      "liveTrainResult"
    );

  } catch (error) {

    errorBox(
      "liveTrainResult",
      error.message
    );

  }
}

/* =========================================================
   LIVE TRAIN RENDER
========================================================= */

function renderLiveTrain(
  response,
  resultId
) {

  const root =
    response?.data ||
    response?.result ||
    response;

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

  $(resultId).innerHTML = `

    <div class="live-result-card">

      <h2>
        📍 Live Train
      </h2>

      <div class="current-location">

        <h3>
          🟢 CURRENT LOCATION
        </h3>

        <strong>
          ${esc(
            stationName(current)
          )}
        </strong>

        <div class="time-grid">

          <div>
            <small>ACTUAL</small>
            <strong>
              ${esc(actualTime(current))}
            </strong>
          </div>

          <div>
            <small>SCHEDULED</small>
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
          ${esc(
            stationName(next)
          )}
        </strong>

        <div class="time-grid">

          <div>
            <small>EXPECTED</small>
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

    </div>

  `;
}

function stationName(obj) {

  if (!obj) return "-";

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

  return `${delay} min late`;
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

    const response =
      await railway("TRAIN", {
        trainNo
      });

    const d =
      response?.display ||
      response?.data?.trainInfo ||
      response?.data ||
      {};

    $("trainInfoResult").innerHTML = `

      <div class="train-card">

        <h2>
          🚆 ${esc(
            d.trainName ||
            d.train_name ||
            "-"
          )}
        </h2>

        <p>
          <b>Train No:</b>
          ${esc(
            d.trainNo ||
            d.train_no ||
            trainNo
          )}
        </p>

        <p>
          <b>Route:</b>
          ${esc(
            d.from ||
            d.from_stn_name ||
            "-"
          )}
          →
          ${esc(
            d.to ||
            d.to_stn_name ||
            "-"
          )}
        </p>

        <p>
          <b>Departure:</b>
          ${esc(
            d.departure ||
            d.from_time ||
            "-"
          )}
        </p>

        <p>
          <b>Arrival:</b>
          ${esc(
            d.arrival ||
            d.to_time ||
            "-"
          )}
        </p>

        <p>
          <b>Travel Time:</b>
          ${esc(
            d.travelTime ||
            d.travel_time ||
            "-"
          )}
        </p>

        <p>
          <b>Running Days:</b>
          ${esc(
            d.runningDays ||
            d.running_days ||
            "-"
          )}
        </p>

      </div>

    `;

  } catch (error) {

    errorBox(
      "trainInfoResult",
      error.message
    );

  }
}

/* =========================================================
   TRAIN SEARCH
========================================================= */

async function searchTrains() {

  const from =
    stationValue("fromStation");

  const to =
    stationValue("toStation");

  const date =
    text("searchDate");

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

  if (from === to) {

    errorBox(
      "searchResult",
      "From aur To same nahi ho sakte."
    );

    return;
  }

  loading(
    "searchResult",
    "Trains search ho rahi hain..."
  );

  try {

    const response =
      await railway("SEARCH", {
        from,
        to,
        date: dateForAPI(date)
      });

    renderTrainSearch(
      response,
      "searchResult"
    );

  } catch (error) {

    errorBox(
      "searchResult",
      error.message
    );

  }
}

function renderTrainSearch(
  response,
  resultId
) {

  const list =
    response?.display ||
    response?.data ||
    [];

  if (!Array.isArray(list) || !list.length) {

    emptyBox(
      resultId,
      "Is route par train data nahi mila."
    );

    return;
  }

  $(resultId).innerHTML =
    list.map(train => `

      <div class="train-card">

        <h3>
          🚆 ${esc(
            train.trainName ||
            train.train_name ||
            "-"
          )}
        </h3>

        <strong>
          ${esc(
            train.trainNo ||
            train.train_no ||
            "-"
          )}
        </strong>

        <p>
          ${esc(
            train.from ||
            train.from_stn_name ||
            "-"
          )}
          →
          ${esc(
            train.to ||
            train.to_stn_name ||
            "-"
          )}
        </p>

        <p>
          🕐
          ${esc(
            train.departure ||
            train.from_time ||
            "-"
          )}
          →
          ${esc(
            train.arrival ||
            train.to_time ||
            "-"
          )}
        </p>

        <p>
          ⏱️
          ${esc(
            train.travelTime ||
            train.travel_time ||
            "-"
          )}
        </p>

        <p>
          📅
          ${esc(
            train.runningDays ||
            train.running_days ||
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
    stationValue("liveStation");

  const hours =
    text("liveStationHours") || "2";

  if (!/^[A-Z]{1,5}$/.test(station)) {

    errorBox(
      "liveStationResult",
      "Valid station select karo."
    );

    return;
  }

  loading(
    "liveStationResult",
    "Live station trains load ho rahi hain..."
  );

  try {

    const response =
      await railway("STATION", {
        station,
        hours
      });

    renderLiveStation(
      response,
      "liveStationResult"
    );

  } catch (error) {

    errorBox(
      "liveStationResult",
      error.message
    );

  }
}

function renderLiveStation(
  response,
  resultId
) {

  const root =
    response?.data ||
    response?.result ||
    response;

  const trains =
    root?.trains ||
    response?.display ||
    [];

  if (!Array.isArray(trains) || !trains.length) {

    emptyBox(
      resultId,
      "Is station par live train data nahi mila."
    );

    return;
  }

  $(resultId).innerHTML = `

    <div class="station-live-card">

      <h2>
        🚉 Live Station
      </h2>

      ${trains.map(train => `

        <div class="station-train-card">

          <h3>
            🚆 ${esc(
              train.trainNo ||
              train.train_no ||
              "-"
            )}
          </h3>

          <strong>
            ${esc(
              train.trainName ||
              train.train_name ||
              "-"
            )}
          </strong>

          <p>
            From:
            ${esc(
              train.sourceName ||
              train.from ||
              "-"
            )}
          </p>

          <p>
            To:
            ${esc(
              train.destName ||
              train.to ||
              "-"
            )}
          </p>

          <p>
            🕐 Arrival:
            ${esc(
              train.arrival?.actual ||
              train.arrival?.scheduled ||
              train.arrival ||
              "-"
            )}
          </p>

          <p>
            ⏱️ Delay:
            ${esc(
              train.arrival?.delay ??
              train.delay ??
              0
            )}
            min
          </p>

          <p>
            🚉 Platform:
            ${esc(
              train.platform ||
              "-"
            )}
          </p>

        </div>

      `).join("")}

    </div>

  `;
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
    text("seatDate");

  const coach =
    upper("seatClass");

  const quota =
    upper("seatQuota");

  if (!/^\d{5}$/.test(trainNo)) {

    errorBox(
      "seatResult",
      "Valid train number enter karo."
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
      "Date, class aur quota required."
    );

    return;
  }

  loading(
    "seatResult",
    "Seat availability check ho rahi hai..."
  );

  try {

    const response =
      await railway("SEATS", {
        trainNo,
        from,
        to,
        date: dateForAPI(date),
        coach,
        quota
      });

    renderSeats(
      response,
      "seatResult"
    );

  } catch (error) {

    errorBox(
      "seatResult",
      error.message
    );

  }
}

function renderSeats(
  response,
  resultId
) {

  const d =
    response?.display ||
    response?.data ||
    {};

  const list =
    d?.availability ||
    [];

  $(resultId).innerHTML = `

    <div class="availability-result">

      <h2>
        🚆 ${esc(
          d.trainName || "-"
        )}
      </h2>

      <p>
        <b>Train:</b>
        ${esc(
          d.trainNo || "-"
        )}
      </p>

      <p>
        ${esc(
          d.from || "-"
        )}
        →
        ${esc(
          d.to || "-"
        )}
      </p>

      <p>
        💰 Total Fare:
        ₹${esc(
          d.totalFare ||
          d.baseFare ||
          "-"
        )}
      </p>

      ${
        list.length
          ? list.map(item => `

              <div class="availability-card">

                <strong>
                  ${esc(
                    item.date || "-"
                  )}
                </strong>

                <p>
                  🎫
                  ${esc(
                    item.status || "-"
                  )}
                </p>

                ${
                  item.prediction
                    ? `
                      <p>
                        📊
                        ${esc(
                          item.prediction
                        )}
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

  const trainNo =
    upper("fareTrainNumber");

  const from =
    stationValue("fareFromStation");

  const to =
    stationValue("fareToStation");

  const date =
    text("fareDate");

  const travelClass =
    upper("fareClass");

  const quota =
    upper("fareQuota");

  if (
    !/^\d{5}$/.test(trainNo) ||
    !from ||
    !to ||
    !date ||
    !travelClass ||
    !quota
  ) {

    errorBox(
      "fareResult",
      "Fare enquiry details incomplete hain."
    );

    return;
  }

  loading(
    "fareResult",
    "Fare check ho raha hai..."
  );

  try {

    const response =
      await railway("FARE", {
        trainNo,
        from,
        to,
        date: dateForAPI(date),
        travelClass,
        quota
      });

    renderObject(
      "fareResult",
      response
    );

  } catch (error) {

    errorBox(
      "fareResult",
      error.message
    );

  }
}

/* =========================================================
   HISTORY
========================================================= */

async function checkHistory() {

  const trainNo =
    upper("historyTrainNumber");

  const date =
    text("historyDate");

  if (!/^\d{5}$/.test(trainNo)) {

    errorBox(
      "historyResult",
      "5 digit train number enter karo."
    );

    return;
  }

  if (!date) {

    errorBox(
      "historyResult",
      "Journey date required."
    );

    return;
  }

  loading(
    "historyResult",
    "Train history check ho rahi hai..."
  );

  try {

    const response =
      await railway("HISTORY", {
        trainNo,
        date: dateForAPI(date)
      });

    renderObject(
      "historyResult",
      response
    );

  } catch (error) {

    errorBox(
      "historyResult",
      error.message
    );

  }
}

/* =========================================================
   CANCELLED
========================================================= */

async function checkCancelled() {

  loading(
    "cancelledResult",
    "Cancelled trains check ho rahi hain..."
  );

  try {

    const response =
      await railway(
        "CANCELLED"
      );

    renderObject(
      "cancelledResult",
      response
    );

  } catch (error) {

    errorBox(
      "cancelledResult",
      error.message
    );

  }
}

/* =========================================================
   GENERIC
========================================================= */

function renderObject(
  resultId,
  response
) {

  const data =
    response?.data ||
    response?.result ||
    response;

  $(resultId).innerHTML = `

    <div class="generic-result">

      <pre>${esc(
        JSON.stringify(
          data,
          null,
          2
        )
      )}</pre>

    </div>

  `;
}

/* =========================================================
   FORM EVENTS
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadStations();

    /* PNR */
    $("pnrForm")?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        checkPNR();
      }
    );

    /* LIVE */
    $("liveForm")?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        checkLiveTrain();
      }
    );

    /* TRAIN INFO */
    $("trainInfoForm")?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        getTrainInfo();
      }
    );

    /* SEARCH */
    $("searchForm")?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        searchTrains();
      }
    );

    /* LIVE STATION */
    $("stationForm")?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        checkLiveStation();
      }
    );

    /* SEATS */
    $("seatForm")?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        checkSeats();
      }
    );

    /* FARE */
    $("fareForm")?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        checkFare();
      }
    );

    /* HISTORY */
    $("historyForm")?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        checkHistory();
      }
    );

    /* CANCELLED */
    $("checkCancelled")?.addEventListener(
      "click",
      checkCancelled
    );

    /* PNR only numbers */
    $("pnrNumber")?.addEventListener(
      "input",
      event => {

        event.target.value =
          event.target.value
            .replace(/\D/g, "")
            .slice(0, 10);

      }
    );

  }
);

/* =========================================================
   GLOBAL
========================================================= */

window.checkPNR = checkPNR;
window.checkLiveTrain = checkLiveTrain;
window.getTrainInfo = getTrainInfo;
window.searchTrains = searchTrains;
window.checkLiveStation = checkLiveStation;
window.checkSeats = checkSeats;
window.checkFare = checkFare;
window.checkHistory = checkHistory;
window.checkCancelled = checkCancelled;
