document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  let stations = [];

  /* =====================================================
     BASIC HELPERS
  ===================================================== */

  function esc(v) {
    if (v === null || v === undefined || v === "") return "-";

    return String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function val(obj, ...keys) {
    for (const key of keys) {
      const v = obj?.[key];

      if (
        v !== undefined &&
        v !== null &&
        v !== "" &&
        v !== "-"
      ) {
        return v;
      }
    }

    return "-";
  }

  function show(box, html) {
    if (box) box.innerHTML = html;
  }

  function loading(text) {
    return `
      <div class="loading">
        <div class="loader"></div>
        <strong>${esc(text)}</strong>
      </div>
    `;
  }

  function errorBox(text) {
    return `
      <div class="error-box">
        ❌ ${esc(text)}
      </div>
    `;
  }

  function successBox(text) {
    return `
      <div class="success-box">
        ✅ ${esc(text)}
      </div>
    `;
  }

  /* =====================================================
     DATE
     ===================================================== */

  function setToday() {
    const d = new Date();

    const date =
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0");

    [
      "liveDate",
      "searchDate",
      "seatDate",
      "fareDate",
      "historyDate"
    ].forEach(id => {
      const el = $(id);

      if (el && !el.value) {
        el.value = date;
      }
    });
  }

  setToday();

  /* =====================================================
     API
     ===================================================== */

  async function callAPI(params) {
    const query = new URLSearchParams();

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
      `/api/railway?${query.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        "Server ne valid JSON response nahi diya."
      );
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

  /* =====================================================
     STATION JSON
     ===================================================== */

  async function loadStations() {
    try {
      const response = await fetch(
        "/station.json",
        {
          cache: "force-cache"
        }
      );

      if (!response.ok) {
        throw new Error("station.json load failed");
      }

      const data = await response.json();

      stations =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.stations)
          ? data.stations
          : [];

      stations = stations
        .map(s => ({
          code:
            String(
              s.stnCode ??
              s.code ??
              ""
            ).trim().toUpperCase(),

          name:
            String(
              s.stnName ??
              s.name ??
              ""
            ).trim(),

          city:
            String(
              s.stnCity ??
              s.city ??
              ""
            ).trim()
        }))
        .filter(s => s.code && s.name);

      console.log(
        "AINEX stations loaded:",
        stations.length
      );

      setupAllStationInputs();

    } catch (error) {
      console.error(
        "Station JSON Error:",
        error
      );

      stations = [];

      setupAllStationInputs();
    }
  }

  /* =====================================================
     STATION CODE
     ===================================================== */

  function getStationCode(id) {
    const input = $(id);

    if (!input) return "";

    if (input.dataset.code) {
      return input.dataset.code.toUpperCase();
    }

    const text =
      input.value
        .trim()
        .toUpperCase();

    const bracket =
      text.match(/\(([A-Z]{2,5})\)/);

    if (bracket) {
      return bracket[1];
    }

    const found =
      stations.find(
        s =>
          s.code === text ||
          s.name.toUpperCase() === text
      );

    if (found) return found.code;

    return text;
  }

  /* =====================================================
     STATION AUTOCOMPLETE
     ===================================================== */

  function setupStationInput(
    inputId,
    suggestionId
  ) {
    const input = $(inputId);
    const box = $(suggestionId);

    if (!input || !box) return;

    input.addEventListener(
      "input",
      () => {
        input.dataset.code = "";

        const query =
          input.value
            .trim()
            .toUpperCase();

        box.innerHTML = "";

        if (!query) {
          box.style.display = "none";
          return;
        }

        const results =
          stations
            .filter(s =>
              s.code.includes(query) ||
              s.name.toUpperCase().includes(query) ||
              s.city.toUpperCase().includes(query)
            )
            .slice(0, 10);

        if (!results.length) {
          box.style.display = "none";
          return;
        }

        results.forEach(s => {
          const item =
            document.createElement("div");

          item.className =
            "station-suggestion";

          item.innerHTML = `
            <div class="station-suggestion-icon">
              🚉
            </div>

            <div>
              <strong>
                ${esc(s.name)}
              </strong>

              <span>
                ${esc(s.code)}
                ${s.city ? " • " + esc(s.city) : ""}
              </span>
            </div>
          `;

          item.addEventListener(
            "click",
            () => {
              input.value =
                `${s.name} (${s.code})`;

              input.dataset.code =
                s.code;

              box.innerHTML = "";
              box.style.display = "none";
            }
          );

          box.appendChild(item);
        });

        box.style.display = "block";
      }
    );

    input.addEventListener(
      "keydown",
      e => {
        if (e.key === "Escape") {
          box.innerHTML = "";
          box.style.display = "none";
        }
      }
    );

    document.addEventListener(
      "click",
      e => {
        if (
          e.target !== input &&
          !box.contains(e.target)
        ) {
          box.style.display = "none";
        }
      }
    );
  }

  function setupAllStationInputs() {
    [
      ["fromStation", "fromSuggestions"],
      ["toStation", "toSuggestions"],

      ["seatFrom", "seatFromSuggestions"],
      ["seatTo", "seatToSuggestions"],

      ["fareFrom", "fareFromSuggestions"],
      ["fareTo", "fareToSuggestions"],

      ["stationCode", "stationSuggestions"]
    ].forEach(pair => {
      setupStationInput(
        pair[0],
        pair[1]
      );
    });
  }

  loadStations();

  /* =====================================================
     PNR
     ===================================================== */

  $("pnrForm")?.addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      const pnr =
        ($("pnr")?.value || "")
          .replace(/\D/g, "")
          .slice(0, 10);

      const box = $("result");
      const btn = $("checkBtn");

      if (!/^\d{10}$/.test(pnr)) {
        show(
          box,
          errorBox(
            "Please enter valid 10 digit PNR."
          )
        );
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent =
          "⏳ CHECKING...";
      }

      show(
        box,
        loading(
          "Checking PNR status..."
        )
      );

      try {
        const result =
          await callAPI({
            action: "PNR",
            pnr
          });

        renderPNR(
          result?.data || result
        );

      } catch (err) {
        show(
          box,
          errorBox(err.message)
        );
      }

      if (btn) {
        btn.disabled = false;
        btn.textContent =
          "🔎 CHECK PNR STATUS";
      }
    }
  );

  function renderPNR(d) {
    const train =
      d?.train || {};

    const journey =
      d?.journey || {};

    const source =
      journey?.source || {};

    const destination =
      journey?.destination || {};

    const passengers =
      Array.isArray(d?.passengers)
        ? d.passengers
        : [];

    const passengerHTML =
      passengers
        .map((p, i) => {
          const booking =
            p?.booking || {};

          const current =
            p?.current || {};

          const status =
            val(
              current,
              "status",
              "details"
            );

          return `
            <div class="passenger">

              <div class="passenger-top">
                <b>
                  Passenger ${i + 1}
                </b>

                <span>
                  ${esc(status)}
                </span>
              </div>

              <div class="passenger-info">

                <div>
                  <small>
                    BOOKING STATUS
                  </small>
                  <b>
                    ${esc(
                      val(
                        booking,
                        "status",
                        "details"
                      )
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    CURRENT STATUS
                  </small>
                  <b>
                    ${esc(status)}
                  </b>
                </div>

                <div>
                  <small>
                    COACH
                  </small>
                  <b>
                    ${esc(
                      val(
                        current,
                        "coach",
                        "coachNumber"
                      )
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    SEAT / BERTH
                  </small>
                  <b>
                    ${esc(
                      val(
                        current,
                        "berthNo",
                        "berth",
                        "seat"
                      )
                    )}
                  </b>
                </div>

              </div>

            </div>
          `;
        })
        .join("");

    show(
      $("result"),
      `
        <div class="result-card">

          <div class="result-head">

            <small>
              PNR RESULT
            </small>

            <h2>
              PNR ${esc(
                val(d, "pnr")
              )}
            </h2>

            <p>
              ${esc(
                val(
                  d,
                  "status",
                  "message"
                )
              )}
            </p>

          </div>

          <div class="route">

            <div>
              <small>FROM</small>
              <b>
                ${esc(
                  val(
                    source,
                    "name",
                    "stationName",
                    "code"
                  )
                )}
              </b>
            </div>

            <div class="arrow">
              →
            </div>

            <div class="right">
              <small>TO</small>
              <b>
                ${esc(
                  val(
                    destination,
                    "name",
                    "stationName",
                    "code"
                  )
                )}
              </b>
            </div>

          </div>

          <div class="info-grid">

            <div>
              <small>TRAIN</small>
              <b>
                ${esc(
                  val(
                    train,
                    "name",
                    "trainName"
                  )
                )}
              </b>
            </div>

            <div>
              <small>TRAIN NUMBER</small>
              <b>
                ${esc(
                  val(
                    train,
                    "number",
                    "trainNumber",
                    "trainNo"
                  )
                )}
              </b>
            </div>

            <div>
              <small>JOURNEY DATE</small>
              <b>
                ${esc(
                  val(
                    journey,
                    "date",
                    "dateOfJourney"
                  )
                )}
              </b>
            </div>

            <div>
              <small>CLASS</small>
              <b>
                ${esc(
                  val(
                    journey,
                    "class"
                  )
                )}
              </b>
            </div>

          </div>

          ${
            passengers.length
              ? `
                <h3 class="passenger-heading">
                  Passenger Details
                </h3>

                <div class="passenger-list">
                  ${passengerHTML}
                </div>
              `
              : ""
          }

          <div class="privacy">
            🔒 Railway information fetched securely.
          </div>

        </div>
      `
    );
  }

  /* =====================================================
     LIVE TRAIN
     ===================================================== */

  $("liveForm")?.addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      const trainNo =
        $("liveTrain")?.value
          .trim() || "";

      const date =
        $("liveDate")?.value || "";

      const box =
        $("liveResult");

      if (!/^\d{5}$/.test(trainNo)) {
        show(
          box,
          errorBox(
            "Enter valid 5 digit train number."
          )
        );
        return;
      }

      if (!date) {
        show(
          box,
          errorBox(
            "Journey date required."
          )
        );
        return;
      }

      show(
        box,
        loading(
          "Fetching live train status..."
        )
      );

      try {
        const result =
          await callAPI({
            action: "LIVE",
            trainNo,
            date
          });

        renderLiveTrain(
          box,
          result,
          trainNo
        );

      } catch (err) {
        show(
          box,
          errorBox(err.message)
        );
      }
    }
  );

  /* =====================================================
     LIVE TRAIN PARSER
     ===================================================== */

  function findCurrentNext(d) {
    const display =
      d?.display || {};

    let current =
      display.currentStation ||
      display.current ||
      null;

    let next =
      display.nextStation ||
      display.next ||
      null;

    const list =
      Array.isArray(display.stations)
        ? display.stations
        : [];

    if (
      !current &&
      !next &&
      list.length
    ) {
      let currentIndex = -1;

      for (
        let i = 0;
        i < list.length;
        i++
      ) {
        const s = list[i];

        const departed =
          s.departureActual &&
          s.departureActual !== "-";

        const arrived =
          s.arrivalActual &&
          s.arrivalActual !== "-";

        if (departed || arrived) {
          currentIndex = i;
        }
      }

      if (currentIndex >= 0) {
        current =
          list[currentIndex];

        next =
          list[currentIndex + 1] ||
          null;
      } else {
        current = list[0] || null;
        next = list[1] || null;
      }
    }

    return {
      current,
      next,
      list
    };
  }

  function stationName(s) {
    if (!s) return "-";

    if (typeof s === "string") {
      return s;
    }

    return (
      s.stationName ||
      s.name ||
      s.stnName ||
      s.station ||
      "-"
    );
  }

  function stationCode(s) {
    if (!s) return "-";

    if (typeof s === "string") {
      return "";
    }

    return (
      s.stationCode ||
      s.code ||
      s.stnCode ||
      ""
    );
  }

  function currentTime(s) {
    if (!s) return "-";

    return (
      s.actualTime ||
      s.arrivalActual ||
      s.departureActual ||
      s.expected ||
      "-"
    );
  }

  function scheduledTime(s) {
    if (!s) return "-";

    return (
      s.scheduledTime ||
      s.arrivalScheduled ||
      s.departureScheduled ||
      "-"
    );
  }

  function delayTime(s) {
    if (!s) return 0;

    return (
      s.delay ||
      s.arrivalDelay ||
      s.departureDelay ||
      0
    );
  }

  function renderLiveTrain(
    box,
    result,
    trainNo
  ) {
    const d =
      result?.display || {};

    const info =
      findCurrentNext(result);

    const current =
      info.current;

    const next =
      info.next;

    const currentName =
      stationName(current);

    const nextName =
      stationName(next);

    const currentCode =
      stationCode(current);

    const nextCode =
      stationCode(next);

    const currentActual =
      currentTime(current);

    const currentScheduled =
      scheduledTime(current);

    const currentDelay =
      delayTime(current);

    const nextActual =
      currentTime(next);

    const nextScheduled =
      scheduledTime(next);

    const nextDelay =
      delayTime(next);

    const status =
      d.status || "-";

    show(
      box,
      `
        <div class="data-box live-train-result">

          <h3>
            📍 Live Train Status
          </h3>

          <p>
            <b>Train:</b>
            ${esc(
              d.trainName || "-"
            )}
          </p>

          <p>
            <b>Train Number:</b>
            ${esc(
              d.trainNo || trainNo
            )}
          </p>

          <!-- CURRENT -->

          <div class="current-location-card">

            <h2>
              🟢 CURRENT LOCATION
            </h2>

            <h3>
              ${esc(currentName)}
              ${
                currentCode
                  ? ` (${esc(currentCode)})`
                  : ""
              }
            </h3>

            <div class="live-info-grid">

              <div>
                <small>
                  ACTUAL TIME
                </small>

                <b>
                  ${esc(
                    currentActual
                  )}
                </b>
              </div>

              <div>
                <small>
                  SCHEDULED TIME
                </small>

                <b>
                  ${esc(
                    currentScheduled
                  )}
                </b>
              </div>

              <div>
                <small>
                  DELAY
                </small>

                <b>
                  ${esc(
                    currentDelay
                  )} min
                </b>
              </div>

              <div>
                <small>
                  PLATFORM
                </small>

                <b>
                  ${esc(
                    current?.platform ||
                    "-"
                  )}
                </b>
              </div>

            </div>

          </div>

          <!-- NEXT -->

          <div class="next-station-card">

            <h2>
              🔵 NEXT STATION
            </h2>

            <h3>
              ${esc(nextName)}
              ${
                nextCode
                  ? ` (${esc(nextCode)})`
                  : ""
              }
            </h3>

            <div class="live-info-grid">

              <div>
                <small>
                  EXPECTED / ACTUAL
                </small>

                <b>
                  ${esc(
                    nextActual
                  )}
                </b>
              </div>

              <div>
                <small>
                  SCHEDULED
                </small>

                <b>
                  ${esc(
                    nextScheduled
                  )}
                </b>
              </div>

              <div>
                <small>
                  DELAY
                </small>

                <b>
                  ${esc(
                    nextDelay
                  )} min
                </b>
              </div>

              <div>
                <small>
                  PLATFORM
                </small>

                <b>
                  ${esc(
                    next?.platform ||
                    "-"
                  )}
                </b>
              </div>

            </div>

          </div>

          <div class="live-status-text">

            <b>Status:</b>
            ${esc(status)}

          </div>

        </div>
      `
    );
  }

  /* =====================================================
     TRAIN INFORMATION
     ===================================================== */

  $("trainInfoForm")?.addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      const trainNo =
        $("trainInfoNo")?.value.trim() ||
        $("trainNo")?.value.trim() ||
        "";

      const box =
        $("trainInfoResult") ||
        $("trainResult");

      if (!/^\d{5}$/.test(trainNo)) {
        show(
          box,
          errorBox(
            "Valid 5 digit train number enter karo."
          )
        );
        return;
      }

      show(
        box,
        loading(
          "Train information load ho rahi hai..."
        )
      );

      try {
        const result =
          await callAPI({
            action: "TRAIN",
            trainNo
          });

        renderTrainInfo(
          box,
          result,
          trainNo
        );

      } catch (err) {
        show(
          box,
          errorBox(err.message)
        );
      }
    }
  );

  function renderTrainInfo(
    box,
    result,
    trainNo
  ) {
    const d =
      result?.display || {};

    show(
      box,
      `
        <div class="data-box">

          <h3>
            🚆 Train Information
          </h3>

          <h2>
            ${esc(
              d.trainName || "-"
            )}
          </h2>

          <p>
            <b>Train Number:</b>
            ${esc(
              d.trainNo || trainNo
            )}
          </p>

          <div class="route">

            <div>
              <small>FROM</small>
              <b>
                ${esc(
                  d.from || "-"
                )}
              </b>
              <span>
                ${esc(
                  d.fromCode || "-"
                )}
              </span>
            </div>

            <div class="arrow">
              →
            </div>

            <div>
              <small>TO</small>
              <b>
                ${esc(
                  d.to || "-"
                )}
              </b>
              <span>
                ${esc(
                  d.toCode || "-"
                )}
              </span>
            </div>

          </div>

          <div class="info-grid">

            <div>
              <small>
                DEPARTURE
              </small>
              <b>
                ${esc(
                  d.departure || "-"
                )}
              </b>
            </div>

            <div>
              <small>
                ARRIVAL
              </small>
              <b>
                ${esc(
                  d.arrival || "-"
                )}
              </b>
            </div>

            <div>
              <small>
                TRAVEL TIME
              </small>
              <b>
                ${esc(
                  d.travelTime || "-"
                )}
              </b>
            </div>

            <div>
              <small>
                RUNNING DAYS
              </small>
              <b>
                ${esc(
                  d.runningDays || "-"
                )}
              </b>
            </div>

          </div>

        </div>
      `
    );
  }

  /* =====================================================
     SEARCH TRAINS
     ===================================================== */

  $("searchForm")?.addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      const from =
        getStationCode(
          "fromStation"
        );

      const to =
        getStationCode(
          "toStation"
        );

      const date =
        $("searchDate")?.value || "";

      const box =
        $("searchResult");

      if (
        !/^[A-Z]{2,5}$/.test(from)
      ) {
        show(
          box,
          errorBox(
            "From station select karo."
          )
        );
        return;
      }

      if (
        !/^[A-Z]{2,5}$/.test(to)
      ) {
        show(
          box,
          errorBox(
            "To station select karo."
          )
        );
        return;
      }

      if (from === to) {
        show(
          box,
          errorBox(
            "From aur To same nahi ho sakte."
          )
        );
        return;
      }

      show(
        box,
        loading(
          "Searching trains..."
        )
      );

      try {
        const result =
          await callAPI({
            action: "SEARCH",
            from,
            to,
            date
          });

        renderSearch(
          box,
          result
        );

      } catch (err) {
        show(
          box,
          errorBox(err.message)
        );
      }
    }
  );

  function renderSearch(box, result) {
    const trains =
      Array.isArray(result?.display)
        ? result.display
        : [];

    if (!trains.length) {
      show(
        box,
        `
          <div class="data-box">
            <h3>
              🔎 Train Search
            </h3>

            <p>
              No train data available.
            </p>
          </div>
        `
      );
      return;
    }

    show(
      box,
      `
        <div class="data-box">

          <h3>
            🚆 ${trains.length}
            Trains Found
          </h3>

          <div class="train-list">

            ${trains.map(t => `
              <div class="train-item">

                <strong>
                  🚆
                  ${esc(t.trainNo)}
                  —
                  ${esc(t.trainName)}
                </strong>

                <p>
                  🟢
                  ${esc(t.from)}
                  (${esc(t.fromCode)})
                </p>

                <p>
                  🔴
                  ${esc(t.to)}
                  (${esc(t.toCode)})
                </p>

                <p>
                  🕐 Departure:
                  ${esc(t.departure)}
                </p>

                <p>
                  🕐 Arrival:
                  ${esc(t.arrival)}
                </p>

                <p>
                  ⏱️ Travel:
                  ${esc(t.travelTime)}
                </p>

                <p>
                  📅 Running:
                  ${esc(t.runningDays)}
                </p>

              </div>
            `).join("")}

          </div>

        </div>
      `
    );
  }

  /* =====================================================
     LIVE STATION
     ===================================================== */

  $("stationForm")?.addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      const station =
        getStationCode(
          "stationCode"
        );

      const hours =
        $("stationHours")?.value ||
        "2";

      const box =
        $("stationResult");

      if (
        !/^[A-Z]{2,5}$/.test(station)
      ) {
        show(
          box,
          errorBox(
            "Valid station select karo."
          )
        );
        return;
      }

      show(
        box,
        loading(
          "Fetching station trains..."
        )
      );

      try {
        const result =
          await callAPI({
            action: "STATION",
            station,
            hours
          });

        renderStation(
          box,
          result,
          station
        );

      } catch (err) {
        show(
          box,
          errorBox(err.message)
        );
      }
    }
  );

  function renderStation(
    box,
    result,
    station
  ) {
    const trains =
      Array.isArray(result?.display)
        ? result.display
        : [];

    show(
      box,
      `
        <div class="data-box">

          <h3>
            🚉 ${esc(station)}
            Live Station
          </h3>

          <p>
            <b>
              ${trains.length}
            </b>
            trains found
          </p>

          ${
            trains.length
              ? `
                <div class="train-list">

                  ${trains.map(t => `
                    <div class="train-item">

                      <strong>
                        🚆
                        ${esc(t.trainNo)}
                        —
                        ${esc(t.trainName)}
                      </strong>

                      <p>
                        🟢 Arrival:
                        ${esc(t.arrival)}
                      </p>

                      <p>
                        🔵 Departure:
                        ${esc(t.departure)}
                      </p>

                      <p>
                        ⏱️ Delay:
                        ${esc(t.delay)}
                        min
                      </p>

                      <p>
                        🛤️ Platform:
                        ${esc(t.platform)}
                      </p>

                    </div>
                  `).join("")}

                </div>
              `
              : `
                <p>
                  Live station data available nahi hai.
                </p>
              `
          }

        </div>
      `
    );
  }

  /* =====================================================
     SEAT AVAILABILITY
     ===================================================== */

  $("seatForm")?.addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      const trainNo =
        $("seatTrain")?.value.trim() ||
        "";

      const from =
        getStationCode("seatFrom");

      const to =
        getStationCode("seatTo");

      const date =
        $("seatDate")?.value || "";

      const coach =
        $("seatClass")?.value ||
        $("seatCoach")?.value ||
        "";

      const quota =
        $("seatQuota")?.value ||
        "";

      const box =
        $("seatResult");

      if (!/^\d{5}$/.test(trainNo)) {
        show(
          box,
          errorBox(
            "Valid 5 digit train number enter karo."
          )
        );
        return;
      }

      if (
        !/^[A-Z]{2,5}$/.test(from) ||
        !/^[A-Z]{2,5}$/.test(to)
      ) {
        show(
          box,
          errorBox(
            "From aur To station select karo."
          )
        );
        return;
      }

      show(
        box,
        loading(
          "Seat availability check ho rahi hai..."
        )
      );

      try {
        const result =
          await callAPI({
            action: "SEATS",
            trainNo,
            from,
            to,
            date,
            coach,
            quota
          });

        renderSeats(
          box,
          result
        );

      } catch (err) {
        show(
          box,
          errorBox(err.message)
        );
      }
    }
  );

  function renderSeats(box, result) {
    const d =
      result?.display || {};

    const list =
      Array.isArray(d.availability)
        ? d.availability
        : [];

    show(
      box,
      `
        <div class="data-box">

          <h3>
            💺 Seat Availability
          </h3>

          <p>
            <b>Train:</b>
            ${esc(d.trainName)}
          </p>

          <p>
            <b>Route:</b>
            ${esc(d.from)}
            →
            ${esc(d.to)}
          </p>

          <p>
            <b>Total Fare:</b>
            ₹${esc(d.totalFare)}
          </p>

          ${
            list.length
              ? `
                <div class="train-list">
                  ${list.map(x => `
                    <div class="train-item">

                      <strong>
                        📅 ${esc(x.date)}
                      </strong>

                      <p>
                        💺
                        ${esc(x.status)}
                      </p>

                      <p>
                        🔮
                        ${esc(x.prediction)}
                      </p>

                    </div>
                  `).join("")}
                </div>
              `
              : `
                <p>
                  Availability data available nahi hai.
                </p>
              `
          }

        </div>
      `
    );
  }

  /* =====================================================
     FARE
     ===================================================== */

  $("fareForm")?.addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      const trainNo =
        $("fareTrain")?.value.trim() ||
        "";

      const from =
        getStationCode("fareFrom");

      const to =
        getStationCode("fareTo");

      const date =
        $("fareDate")?.value || "";

      const travelClass =
        $("fareClass")?.value ||
        "";

      const quota =
        $("fareQuota")?.value ||
        "";

      const box =
        $("fareResult");

      if (
        !/^\d{5}$/.test(trainNo) ||
        !from ||
        !to ||
        !date ||
        !travelClass ||
        !quota
      ) {
        show(
          box,
          errorBox(
            "Fare enquiry details complete karo."
          )
        );
        return;
      }

      show(
        box,
        loading(
          "Fare calculate ho raha hai..."
        )
      );

      try {
        const result =
          await callAPI({
            action: "FARE",
            trainNo,
            from,
            to,
            date,
            travelClass,
            quota
          });

        renderFare(
          box,
          result
        );

      } catch (err) {
        show(
          box,
          errorBox(err.message)
        );
      }
    }
  );

  function renderFare(box, result) {
    const d =
      result?.data ||
      result?.display ||
      result ||
      {};

    show(
      box,
      `
        <div class="data-box">

          <h3>
            💰 Fare Details
          </h3>

          <div class="info-grid">

            <div>
              <small>
                BASE FARE
              </small>

              <b>
                ₹${esc(
                  val(
                    d,
                    "baseFare"
                  )
                )}
              </b>
            </div>

            <div>
              <small>
                TOTAL FARE
              </small>

              <b>
                ₹${esc(
                  val(
                    d,
                    "totalFare",
                    "fare"
                  )
                )}
              </b>
            </div>

          </div>

          <pre class="api-data">
${esc(
  JSON.stringify(
    d,
    null,
    2
  )
)}
          </pre>

        </div>
      `
    );
  }

  /* =====================================================
     TRAIN HISTORY
     ===================================================== */

  $("historyForm")?.addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      const trainNo =
        $("historyTrain")?.value.trim() ||
        "";

      const date =
        $("historyDate")?.value ||
        "";

      const box =
        $("historyResult");

      if (!/^\d{5}$/.test(trainNo)) {
        show(
          box,
          errorBox(
            "Valid 5 digit train number enter karo."
          )
        );
        return;
      }

      if (!date) {
        show(
          box,
          errorBox(
            "Journey date select karo."
          )
        );
        return;
      }

      show(
        box,
        loading(
          "Train history load ho rahi hai..."
        )
      );

      try {
        const result =
          await callAPI({
            action: "HISTORY",
            trainNo,
            date
          });

        renderHistory(
          box,
          result
        );

      } catch (err) {
        show(
          box,
          errorBox(err.message)
        );
      }
    }
  );

  function renderHistory(
    box,
    result
  ) {
    const d =
      result?.data ||
      result;

    const list =
      Array.isArray(d)
        ? d
        : Array.isArray(d?.stations)
        ? d.stations
        : Array.isArray(d?.history)
        ? d.history
        : [];

    if (!list.length) {
      show(
        box,
        `
          <div class="data-box">
            <h3>
              📜 Train History
            </h3>

            <p>
              Train history record available nahi hai.
            </p>
          </div>
        `
      );

      return;
    }

    show(
      box,
      `
        <div class="data-box">

          <h3>
            📜 Train History
          </h3>

          <div class="train-list">

            ${list.map(s => `
              <div class="train-item">

                <strong>
                  🚉
                  ${esc(
                    val(
                      s,
                      "stationName",
                      "stnName",
                      "name"
                    )
                  )}
                </strong>

                <p>
                  Arrival:
                  ${esc(
                    s?.arrival?.actual ||
                    s?.arrival?.scheduled ||
                    s?.arrival ||
                    "-"
                  )}
                </p>

                <p>
                  Departure:
                  ${esc(
                    s?.departure?.actual ||
                    s?.departure?.scheduled ||
                    s?.departure ||
                    "-"
                  )}
                </p>

                <p>
                  Platform:
                  ${esc(
                    val(
                      s,
                      "platform"
                    )
                  )}
                </p>

              </div>
            `).join("")}

          </div>

        </div>
      `
    );
  }

  /* =====================================================
     CANCELLED TRAINS
     ===================================================== */

  $("cancelledBtn")?.addEventListener(
    "click",
    async () => {
      const box =
        $("cancelledResult");

      show(
        box,
        loading(
          "Cancelled trains check ho rahi hain..."
        )
      );

      try {
        const result =
          await callAPI({
            action: "CANCELLED"
          });

        renderCancelled(
          box,
          result
        );

      } catch (err) {
        show(
          box,
          errorBox(err.message)
        );
      }
    }
  );

  function renderCancelled(
    box,
    result
  ) {
    const d =
      result?.data ||
      result;

    const trains =
      Array.isArray(d)
        ? d
        : Array.isArray(d?.trains)
        ? d.trains
        : [];

    if (!trains.length) {
      show(
        box,
        `
          <div class="data-box">

            <h3>
              ❌ Cancelled Trains
            </h3>

            <p>
              Cancelled train data available nahi hai.
            </p>

          </div>
        `
      );

      return;
    }

    show(
      box,
      `
        <div class="data-box">

          <h3>
            ❌ Cancelled Trains
          </h3>

          <div class="train-list">

            ${trains.map(t => `
              <div class="train-item">

                <strong>
                  🚆
                  ${esc(
                    val(
                      t,
                      "trainNo",
                      "trainNumber",
                      "number"
                    )
                  )}
                  —
                  ${esc(
                    val(
                      t,
                      "trainName",
                      "name"
                    )
                  )}
                </strong>

                <p>
                  ${esc(
                    val(
                      t,
                      "reason",
                      "status",
                      "message"
                    )
                  )}
                </p>

              </div>
            `).join("")}

          </div>

        </div>
      `
    );
  }

  /* =====================================================
     ENTER KEY / FORM SAFETY
     ===================================================== */

  document.querySelectorAll(
    "input"
  ).forEach(input => {
    input.addEventListener(
      "focus",
      () => {
        input.setAttribute(
          "autocomplete",
          "off"
        );
      }
    );
  });

  console.log(
    "🚆 AINEX Railway Script Loaded"
  );
});
