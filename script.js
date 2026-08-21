document.addEventListener("DOMContentLoaded", () => {

  const $ = id => document.getElementById(id);

  /* =========================
     HELPERS
  ========================= */

  const esc = value =>
    String(value ?? "-")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const value = (obj, ...keys) => {

    for (const key of keys) {

      const v = obj?.[key];

      if (
        v !== undefined &&
        v !== null &&
        v !== ""
      ) return v;

    }

    return "-";
  };


  const loading = text => `
    <div class="loading">
      <div class="loader"></div>
      <strong>${esc(text)}</strong>
    </div>
  `;


  const errorBox = message => `
    <div class="error-box">
      ❌ ${esc(message)}
    </div>
  `;


  const show = (box, html) => {

    if (box) box.innerHTML = html;

  };


  /* =========================
     DATE
  ========================= */

  const today = new Date();

  const todayValue =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");


  [
    "searchDate",
    "liveDate",
    "seatDate",
    "fareDate",
    "historyDate"
  ].forEach(id => {

    const el = $(id);

    if (el && !el.value) {
      el.value = todayValue;
    }

  });


  /* =========================
     API
  ========================= */

  async function callAPI(params) {

    const query =
      new URLSearchParams(params);

    const response =
      await fetch(
        `/api/railway?${query.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        }
      );


    const text =
      await response.text();

    let data;

    try {

      data = JSON.parse(text);

    } catch {

      throw new Error(
        "Server ne valid JSON response nahi diya."
      );

    }


    if (
      !response.ok ||
      data?.success === false
    ) {

      throw new Error(
        data?.message ||
        data?.error ||
        "Railway request failed."
      );

    }


    return data;

  }


  /* =========================
     STATION DATABASE
  ========================= */

  let stations = [];


  async function loadStations() {

    try {

      const response =
        await fetch(
          "/data/stations.json",
          {
            cache: "force-cache"
          }
        );


      if (!response.ok) {
        throw new Error(
          "Station database load nahi hua."
        );
      }


      const data =
        await response.json();


      stations =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.stations)
          ? data.stations
          : [];


    } catch (error) {

      console.error(
        "STATION DATABASE:",
        error
      );

      stations = [];

    }

  }


  loadStations();


  /* =========================
     STATION SEARCH
  ========================= */

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


        const matches =
          stations
            .filter(s => {

              const code =
                String(
                  s.stnCode || ""
                ).toUpperCase();

              const name =
                String(
                  s.stnName || ""
                ).toUpperCase();

              const city =
                String(
                  s.stnCity || ""
                ).toUpperCase();


              return (
                code.includes(query) ||
                name.includes(query) ||
                city.includes(query)
              );

            })
            .slice(0, 8);


        if (!matches.length) {

          box.style.display = "none";
          return;

        }


        matches.forEach(s => {

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
                ${esc(s.stnName)}
              </strong>

              <span>
                ${esc(s.stnCode)}
                ${s.stnCity ? ` • ${esc(s.stnCity)}` : ""}
              </span>

            </div>

          `;


          item.addEventListener(
            "click",
            () => {

              input.value =
                `${s.stnName} (${s.stnCode})`;

              input.dataset.code =
                s.stnCode;


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

  }


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


  function getStationCode(id) {

    const input = $(id);

    if (!input) return "";

    if (input.dataset.code) {
      return input.dataset.code;
    }


    const text =
      input.value
        .trim()
        .toUpperCase();


    const match =
      text.match(
        /\(([A-Z]{2,5})\)/
      );


    if (match) {
      return match[1];
    }


    const found =
      stations.find(s =>
        String(
          s.stnCode || ""
        ).toUpperCase() === text
      );


    return found?.stnCode || text;

  }


  /* =========================
     PNR
  ========================= */

  $("pnrForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      const pnr =
        $("pnr")
          .value
          .replace(/\D/g, "")
          .slice(0, 10);


      const box = $("result");
      const btn = $("checkBtn");


      if (!/^\d{10}$/.test(pnr)) {

        show(
          box,
          errorBox(
            "Valid 10 digit PNR enter karo."
          )
        );

        return;

      }


      btn.disabled = true;
      btn.textContent =
        "⏳ CHECKING...";


      show(
        box,
        loading(
          "PNR status check ho raha hai..."
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


      } catch (error) {

        show(
          box,
          errorBox(error.message)
        );

      }


      btn.disabled = false;
      btn.textContent =
        "🔎 CHECK PNR STATUS";

    }
  );


  /* =========================
     PNR RESULT
  ========================= */

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
      passengers.map((p, i) => {

        const booking =
          p?.booking || {};

        const current =
          p?.current || {};


        return `

          <div class="passenger">

            <div class="passenger-top">

              <b>
                Passenger ${i + 1}
              </b>

              <span>
                ${esc(
                  value(
                    current,
                    "status",
                    "details"
                  )
                )}
              </span>

            </div>


            <div class="passenger-info">

              <div>
                <small>
                  BOOKING STATUS
                </small>

                <b>
                  ${esc(
                    value(
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
                  ${esc(
                    value(
                      current,
                      "status",
                      "details"
                    )
                  )}
                </b>
              </div>


              <div>
                <small>
                  COACH
                </small>

                <b>
                  ${esc(
                    value(
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
                    value(
                      current,
                      "berthNo",
                      "berth"
                    )
                  )}
                </b>
              </div>

            </div>

          </div>

        `;

      }).join("");


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
              value(d, "pnr")
            )}
          </h2>

          <p>
            ${esc(
              value(
                d,
                "status",
                "message"
              )
            )}
          </p>

        </div>


        <div class="route">

          <div>

            <small>
              FROM
            </small>

            <b>
              ${esc(
                value(
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

            <small>
              TO
            </small>

            <b>
              ${esc(
                value(
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

            <small>
              TRAIN
            </small>

            <b>
              ${esc(
                value(
                  train,
                  "name",
                  "trainName"
                )
              )}
            </b>

          </div>


          <div>

            <small>
              TRAIN NUMBER
            </small>

            <b>
              ${esc(
                value(
                  train,
                  "number",
                  "trainNumber",
                  "trainNo"
                )
              )}
            </b>

          </div>


          <div>

            <small>
              JOURNEY DATE
            </small>

            <b>
              ${esc(
                value(
                  journey,
                  "date",
                  "dateOfJourney"
                )
              )}
            </b>

          </div>


          <div>

            <small>
              CLASS
            </small>

            <b>
              ${esc(
                value(
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


  /* =========================
     TRAIN SEARCH
  ========================= */

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
        $("searchDate").value;

      const box =
        $("searchResult");


      if (!from || !to) {

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
          "Trains search ho rahi hain..."
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


        renderTrainSearch(
          box,
          result?.data || result
        );


      } catch (error) {

        show(
          box,
          errorBox(error.message)
        );

      }

    }
  );


  function renderTrainSearch(box, d) {

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
          <h3>🔎 Train Search</h3>
          <p>
            Is route/date ke liye train data nahi mila.
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
          🚆 ${trains.length} Trains Found
        </h3>


        <div class="train-list">

          ${trains.map(t => {

            const no =
              value(
                t,
                "train_no",
                "trainNo",
                "trainNumber",
                "number"
              );

            const name =
              value(
                t,
                "train_name",
                "trainName",
                "name"
              );

            const dep =
              value(
                t,
                "from_time",
                "departure",
                "departureTime"
              );

            const arr =
              value(
                t,
                "to_time",
                "arrival",
                "arrivalTime"
              );

            const days =
              value(
                t,
                "running_days",
                "runningDays"
              );


            return `

              <div class="train-item">

                <strong>
                  🚆 ${esc(no)}
                  — ${esc(name)}
                </strong>

                <p>
                  🟢 Departure:
                  ${esc(dep)}
                </p>

                <p>
                  🔴 Arrival:
                  ${esc(arr)}
                </p>

                <p>
                  📅 Running:
                  ${esc(days)}
                </p>

              </div>

            `;

          }).join("")}

        </div>

      </div>

      `
    );

  }


  /* =========================
     LIVE TRAIN
  ========================= */

  $("liveForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const trainNo =
        $("liveTrain")
          .value
          .trim();

      const date =
        $("liveDate").value;

      const box =
        $("liveResult");


      if (!/^\d{5}$/.test(trainNo)) {

        show(
          box,
          errorBox(
            "5 digit train number enter karo."
          )
        );

        return;

      }


      show(
        box,
        loading(
          "Live train location check ho rahi hai..."
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
          result?.data || result,
          trainNo
        );


      } catch (error) {

        show(
          box,
          errorBox(error.message)
        );

      }

    }
  );


  function renderLiveTrain(
    box,
    d,
    trainNo
  ) {

    const timeline =
      Array.isArray(d?.timeline)
        ? d.timeline
        : Array.isArray(d?.stations)
        ? d.stations
        : Array.isArray(d?.route)
        ? d.route
        : [];


    let current =
      d?.currentStation ||
      d?.current ||
      null;

    let next =
      d?.nextStation ||
      d?.next ||
      null;


    if (!current && timeline.length) {

      const currentIndex =
        timeline.findIndex(
          s =>
            s?.current === true ||
            s?.isCurrent === true ||
            s?.status === "CURRENT"
        );


      if (currentIndex >= 0) {

        current =
          timeline[currentIndex];

        next =
          timeline[currentIndex + 1] ||
          null;

      }

    }


    const trainName =
      value(
        d,
        "trainName",
        "name"
      );


    const currentName =
      value(
        current || {},
        "stationName",
        "name",
        "station"
      );


    const nextName =
      value(
        next || {},
        "stationName",
        "name",
        "station"
      );


    const currentActual =
      value(
        current || {},
        "actualArrival",
        "actual",
        "arrivalActual",
        "arrival"
      );


    const currentScheduled =
      value(
        current || {},
        "scheduledArrival",
        "scheduled",
        "arrivalScheduled"
      );


    const nextScheduled =
      value(
        next || {},
        "scheduledArrival",
        "scheduled",
        "arrivalScheduled"
      );


    const delay =
      value(
        current || {},
        "delay",
        "delayMinutes",
        "lateBy"
      );


    show(
      box,

      `

      <div class="data-box">

        <h3>
          📍 Live Train Status
        </h3>

        <p>
          <b>Train:</b>
          ${esc(trainName)}
        </p>

        <p>
          <b>Train Number:</b>
          ${esc(
            value(
              d,
              "trainNo",
              "trainNumber"
            ) !== "-"
              ? value(
                  d,
                  "trainNo",
                  "trainNumber"
                )
              : trainNo
          )}
        </p>


        <div class="live-current">

          <h3>
            🟢 CURRENT LOCATION
          </h3>

          <div class="live-station-name">
            ${esc(currentName)}
          </div>


          <div class="time-grid">

            <div class="time-box">

              <small>
                ACTUAL TIME
              </small>

              <b>
                ${esc(currentActual)}
              </b>

            </div>


            <div class="time-box">

              <small>
                SCHEDULED TIME
              </small>

              <b>
                ${esc(currentScheduled)}
              </b>

            </div>


            <div class="time-box">

              <small>
                DELAY
              </small>

              <b>
                ${esc(delay)} min
              </b>

            </div>

          </div>

        </div>


        <div class="live-next">

          <h3>
            🔵 NEXT STATION
          </h3>

          <div class="live-station-name">
            ${esc(nextName)}
          </div>


          <div class="time-grid">

            <div class="time-box">

              <small>
                EXPECTED / ACTUAL
              </small>

              <b>
                ${esc(
                  value(
                    next || {},
                    "actualArrival",
                    "actual",
                    "arrival"
                  )
                )}
              </b>

            </div>


            <div class="time-box">

              <small>
                SCHEDULED
              </small>

              <b>
                ${esc(nextScheduled)}
              </b>

            </div>

          </div>

        </div>


        <p>
          <b>Status:</b>
          ${esc(
            value(
              d,
              "status",
              "statusNote",
              "message"
            )
          )}
        </p>

      </div>

      `
    );

  }


  /* =========================
     SEAT AVAILABILITY
  ========================= */

  $("seatForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const trainNo =
        $("seatTrain").value.trim();

      const from =
        getStationCode("seatFrom");

      const to =
        getStationCode("seatTo");

      const date =
        $("seatDate").value;

      const coach =
        $("seatClass").value;

      const quota =
        $("seatQuota").value;

      const box =
        $("seatResult");


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
          result?.data || result
        );


      } catch (error) {

        show(
          box,
          errorBox(error.message)
        );

      }

    }
  );


  function renderSeats(box, d) {

    const availability =
      Array.isArray(d?.availability)
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
          ${esc(
            value(
              d?.train || d,
              "trainName",
              "name"
            )
          )}
        </p>


        <div class="train-list">

          ${
            availability.length
              ? availability.map(x => `

                <div class="train-item">

                  <strong>
                    📅 ${esc(
                      value(
                        x,
                        "date"
                      )
                    )}
                  </strong>

                  <p>
                    💺 Availability:
                    ${esc(
                      value(
                        x,
                        "availabilityText",
                        "status",
                        "availability"
                      )
                    )}
                  </p>

                  <p>
                    📊 Prediction:
                    ${esc(
                      value(
                        x,
                        "prediction"
                      )
                    )}
                  </p>

                </div>

              `).join("")
              : `
                <div class="train-item">
                  <strong>
                    Seat data available nahi hai.
                  </strong>
                </div>
              `
          }

        </div>

      </div>

      `
    );

  }


  /* =========================
     FARE
  ========================= */

  $("fareForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const box =
        $("fareResult");


      show(
        box,
        loading(
          "Fare check ho raha hai..."
        )
      );


      try {

        const result =
          await callAPI({

            action: "FARE",

            trainNo:
              $("fareTrain").value.trim(),

            from:
              getStationCode("fareFrom"),

            to:
              getStationCode("fareTo"),

            date:
              $("fareDate").value,

            travelClass:
              $("fareClass").value,

            quota:
              $("fareQuota").value

          });


        const d =
          result?.data || result;


        show(
          box,

          `

          <div class="data-box">

            <h3>
              💰 Fare Result
            </h3>

            <p>
              <b>Base Fare:</b>
              ₹${esc(
                value(
                  d,
                  "baseFare"
                )
              )}
            </p>

            <p>
              <b>Total Fare:</b>
              ₹${esc(
                value(
                  d,
                  "totalFare",
                  "fare"
                )
              )}
            </p>

          </div>

          `
        );


      } catch (error) {

        show(
          box,
          errorBox(error.message)
        );

      }

    }
  );


  /* =========================
     LIVE STATION
  ========================= */

  $("stationForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const stationCodeValue =
        getStationCode(
          "stationCode"
        );

      const hours =
        $("stationHours").value;

      const box =
        $("stationResult");


      show(
        box,
        loading(
          "Station trains check ho rahi hain..."
        )
      );


      try {

        const result =
          await callAPI({

            action: "STATION",

            station:
              stationCodeValue,

            hours

          });


        renderStation(
          box,
          result?.data || result,
          stationCodeValue
        );


      } catch (error) {

        show(
          box,
          errorBox(error.message)
        );

      }

    }
  );


  function renderStation(
    box,
    d,
    code
  ) {

    const trains =
      Array.isArray(d?.trains)
        ? d.trains
        : [];


    show(
      box,

      `

      <div class="data-box">

        <h3>
          🚉 ${esc(code)} Live Station
        </h3>

        <p>
          <b>${trains.length}</b>
          trains found
        </p>


        <div class="train-list">

          ${
            trains.length
              ? trains.map(t => `

                <div class="train-item">

                  <strong>
                    🚆 ${esc(
                      value(
                        t,
                        "trainNo",
                        "trainNumber"
                      )
                    )}
                    —
                    ${esc(
                      value(
                        t,
                        "trainName",
                        "name"
                      )
                    )}
                  </strong>

                  <p>
                    🟢 Arrival:
                    ${esc(
                      value(
                        t?.arrival || t,
                        "actual",
                        "scheduled",
                        "time"
                      )
                    )}
                  </p>

                  <p>
                    🛤️ Platform:
                    ${esc(
                      value(
                        t,
                        "platform"
                      )
                    )}
                  </p>

                </div>

              `).join("")
              : `
                <div class="train-item">
                  No live train data available.
                </div>
              `
          }

        </div>

      </div>

      `
    );

  }


  /* =========================
     TRAIN INFO
  ========================= */

  $("trainInfoForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const box =
        $("trainInfoResult");


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

            trainNo:
              $("trainInfoNumber")
                .value
                .trim()

          });


        const d =
          result?.data?.trainInfo ||
          result?.data ||
          result;


        show(
          box,

          `

          <div class="data-box">

            <h3>
              🚆 Train Information
            </h3>

            <p>
              <b>Train Number:</b>
              ${esc(
                value(
                  d,
                  "train_no",
                  "trainNo",
                  "trainNumber"
                )
              )}
            </p>

            <p>
              <b>Train Name:</b>
              ${esc(
                value(
                  d,
                  "train_name",
                  "trainName",
                  "name"
                )
              )}
            </p>

            <p>
              <b>From:</b>
              ${esc(
                value(
                  d,
                  "from_stn_name",
                  "from",
                  "source"
                )
              )}
            </p>

            <p>
              <b>To:</b>
              ${esc(
                value(
                  d,
                  "to_stn_name",
                  "to",
                  "destination"
                )
              )}
            </p>

            <p>
              <b>Departure:</b>
              ${esc(
                value(
                  d,
                  "from_time",
                  "departure"
                )
              )}
            </p>

            <p>
              <b>Arrival:</b>
              ${esc(
                value(
                  d,
                  "to_time",
                  "arrival"
                )
              )}
            </p>

            <p>
              <b>Travel Time:</b>
              ${esc(
                value(
                  d,
                  "travel_time",
                  "travelTime"
                )
              )}
            </p>

            <p>
              <b>Running Days:</b>
              ${esc(
                value(
                  d,
                  "running_days",
                  "runningDays"
                )
              )}
            </p>

          </div>

          `
        );


      } catch (error) {

        show(
          box,
          errorBox(error.message)
        );

      }

    }
  );


  /* =========================
     HISTORY
  ========================= */

  $("historyForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const box =
        $("historyResult");


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

            trainNo:
              $("historyTrain")
                .value
                .trim(),

            date:
              $("historyDate").value

          });


        const d =
          result?.data || result;


        show(
          box,

          `

          <div class="data-box">

            <h3>
              📜 Train History
            </h3>

            <pre style="
              white-space:pre-wrap;
              word-break:break-word;
              margin-top:15px;
              font-family:inherit;
              color:#637086;
            ">${esc(
              JSON.stringify(
                d,
                null,
                2
              )
            )}</pre>

          </div>

          `
        );


      } catch (error) {

        show(
          box,
          errorBox(error.message)
        );

      }

    }
  );


  /* =========================
     CANCELLED
  ========================= */

  $("cancelBtn")?.addEventListener(
    "click",
    async () => {

      const box =
        $("cancelResult");

      const btn =
        $("cancelBtn");


      btn.disabled = true;


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


        const d =
          result?.data || result;


        const trains =
          Array.isArray(d)
            ? d
            : Array.isArray(d?.trains)
            ? d.trains
            : [];


        show(
          box,

          `

          <div class="data-box">

            <h3>
              ❌ Cancelled Trains
            </h3>

            ${
              trains.length
                ? `

                  <div class="train-list">

                    ${trains.map(t => `

                      <div class="train-item">

                        <strong>
                          🚆 ${esc(
                            value(
                              t,
                              "trainNo",
                              "trainNumber"
                            )
                          )}
                          —
                          ${esc(
                            value(
                              t,
                              "trainName",
                              "name"
                            )
                          )}
                        </strong>

                        <p>
                          ${esc(
                            value(
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

                `
                : `
                  <p>
                    Cancelled train data available nahi hai.
                  </p>
                `
            }

          </div>

          `
        );


      } catch (error) {

        show(
          box,
          errorBox(error.message)
        );

      }


      btn.disabled = false;

    }
  );


  /* =========================
     CLOSE SUGGESTIONS
  ========================= */

  document.addEventListener(
    "click",
    e => {

      if (
        !e.target.closest(".autocomplete")
      ) {

        document
          .querySelectorAll(".suggestions")
          .forEach(box => {

            box.style.display = "none";

          });

      }

    }
  );

});
