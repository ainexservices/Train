document.addEventListener("DOMContentLoaded", () => {

  const $ = id => document.getElementById(id);

  let stations = [];


  /* =====================================================
     HELPERS
  ===================================================== */

  function esc(value) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) return "-";

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function value(obj, ...keys) {

    if (!obj || typeof obj !== "object") {
      return "-";
    }

    for (const key of keys) {

      if (
        obj[key] !== undefined &&
        obj[key] !== null &&
        obj[key] !== ""
      ) {
        return obj[key];
      }

    }

    return "-";
  }


  function show(box, html) {

    if (box) {
      box.innerHTML = html;
    }

  }


  function loading(text) {

    return `
      <div class="loading">
        <div class="loader"></div>
        <strong>${esc(text)}</strong>
      </div>
    `;

  }


  function error(message) {

    return `
      <div class="error-box">
        ❌ ${esc(message)}
      </div>
    `;

  }


  function success(message) {

    return `
      <div class="success-box">
        ✅ ${esc(message)}
      </div>
    `;

  }


  function today() {

    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");

  }


  function railDate(date) {

    if (!date) return "";

    const m =
      String(date).match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );

    return m
      ? `${m[3]}-${m[2]}-${m[1]}`
      : date;

  }


  function setDates() {

    [
      "liveDate",
      "seatDate",
      "fareDate",
      "searchDate",
      "historyDate"
    ].forEach(id => {

      const el = $(id);

      if (el && !el.value) {
        el.value = today();
      }

    });

  }


  /* =====================================================
     API
  ===================================================== */

  async function callAPI(params) {

    const query =
      new URLSearchParams(params);


    const response =
      await fetch(
        `/api/railway?${query.toString()}`,
        {
          method: "GET",
          headers: {
            "Accept": "application/json"
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


  /* =====================================================
     STATION JSON
  ===================================================== */

  async function loadStations() {

    try {

      const response =
        await fetch(
          "/station.json",
          {
            cache: "no-store"
          }
        );


      if (!response.ok) {

        throw new Error(
          `station.json error ${response.status}`
        );

      }


      const json =
        await response.json();


      const list =
        Array.isArray(json)
          ? json
          : Array.isArray(json.stations)
            ? json.stations
            : [];


      stations =
        list
          .map(s => ({

            code:
              String(
                s.stnCode ||
                s.code ||
                ""
              )
              .trim()
              .toUpperCase(),

            name:
              String(
                s.stnName ||
                s.name ||
                ""
              )
              .trim(),

            city:
              String(
                s.stnCity ||
                s.city ||
                ""
              )
              .trim()

          }))
          .filter(
            s =>
              s.code &&
              s.name
          );


      console.log(
        `AINEX: ${stations.length} stations loaded`
      );


      setupAutocomplete();


    } catch (err) {

      console.error(
        "STATION JSON:",
        err
      );

    }

  }


  /* =====================================================
     AUTOCOMPLETE
  ===================================================== */

  const stationInputs = [

    ["fromStation", "fromSuggestions"],
    ["toStation", "toSuggestions"],

    ["seatFrom", "seatFromSuggestions"],
    ["seatTo", "seatToSuggestions"],

    ["fareFrom", "fareFromSuggestions"],
    ["fareTo", "fareToSuggestions"],

    ["stationCode", "stationSuggestions"]

  ];


  function setupAutocomplete() {

    stationInputs.forEach(
      ([inputId, boxId]) => {

        const input = $(inputId);
        const box = $(boxId);

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

              box.style.display =
                "none";

              return;

            }


            const matches =
              stations
                .filter(s => {

                  const code =
                    s.code.toUpperCase();

                  const name =
                    s.name.toUpperCase();

                  const city =
                    s.city.toUpperCase();


                  return (
                    code.startsWith(query) ||
                    name.startsWith(query) ||
                    city.startsWith(query) ||
                    code.includes(query) ||
                    name.includes(query) ||
                    city.includes(query)
                  );

                })
                .slice(0, 15);


            if (!matches.length) {

              box.innerHTML = `
                <div class="station-suggestion">
                  ❌ No station found
                </div>
              `;

              box.style.display =
                "block";

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
                    ${esc(s.name)}
                  </strong>

                  <span>
                    ${esc(s.code)}
                    ${
                      s.city
                        ? ` • ${esc(s.city)}`
                        : ""
                    }
                  </span>

                </div>

              `;


              item.addEventListener(
                "mousedown",
                e => {

                  e.preventDefault();


                  input.value =
                    `${s.name} (${s.code})`;


                  input.dataset.code =
                    s.code;


                  box.innerHTML = "";

                  box.style.display =
                    "none";

                }
              );


              box.appendChild(item);

            });


            box.style.display =
              "block";

          }
        );


        input.addEventListener(
          "keydown",
          e => {

            if (e.key === "Escape") {

              box.innerHTML = "";

              box.style.display =
                "none";

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

              box.style.display =
                "none";

            }

          }
        );

      }
    );

  }


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


    const station =
      stations.find(
        s =>
          s.code === text ||
          s.name.toUpperCase() === text
      );


    return station
      ? station.code
      : text;

  }


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


      const box =
        $("result");


      const btn =
        $("checkBtn");


      if (!/^\d{10}$/.test(pnr)) {

        show(
          box,
          error(
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


        console.log(
          "PNR RESPONSE:",
          result
        );


        renderPNR(result);


      } catch (err) {

        console.error(
          "PNR ERROR:",
          err
        );


        show(
          box,
          error(err.message)
        );


      } finally {

        if (btn) {

          btn.disabled = false;

          btn.textContent =
            "🔎 CHECK PNR STATUS";

        }

      }

    }
  );


  function renderPNR(result) {

    const box =
      $("result");


    const d =
      result?.data ||
      result ||
      {};


    const train =
      d?.train ||
      {};


    const journey =
      d?.journey ||
      {};


    const source =
      journey?.source ||
      d?.source ||
      {};


    const destination =
      journey?.destination ||
      d?.destination ||
      {};


    let passengers =
      Array.isArray(
        d?.passengerDetails
      )
        ? d.passengerDetails
        : Array.isArray(
            d?.passengers
          )
          ? d.passengers
          : [];


    const passengerHTML =
      passengers.length

        ? passengers.map(
            (p, index) => {

              const booking =
                p?.booking ||
                {};


              const current =
                p?.current ||
                {};


              const bookingStatus =
                p?.bookingStatus ||
                booking?.status ||
                booking?.details?.status ||
                "-";


              const currentStatus =
                p?.currentStatus ||
                current?.status ||
                current?.details?.status ||
                "-";


              const coach =
                p?.coach ||
                current?.coach ||
                current?.coachNumber ||
                "-";


              const berth =
                p?.berth ||
                p?.berthNo ||
                current?.berth ||
                current?.berthNo ||
                "-";


              const seat =
                p?.seat ||
                p?.seatNo ||
                current?.seat ||
                current?.seatNo ||
                "-";


              return `

                <div class="passenger">

                  <div class="passenger-top">

                    <b>
                      👤 Passenger ${
                        esc(
                          p?.passengerNo ||
                          p?.passengerNumber ||
                          index + 1
                        )
                      }
                    </b>

                    <span>
                      ${esc(
                        currentStatus
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
                          bookingStatus
                        )}
                      </b>

                    </div>


                    <div>

                      <small>
                        CURRENT STATUS
                      </small>

                      <b>
                        ${esc(
                          currentStatus
                        )}
                      </b>

                    </div>


                    <div>

                      <small>
                        COACH
                      </small>

                      <b>
                        ${esc(coach)}
                      </b>

                    </div>


                    <div>

                      <small>
                        SEAT / BERTH
                      </small>

                      <b>
                        ${
                          seat !== "-"
                            ? esc(seat)
                            : esc(berth)
                        }
                      </b>

                    </div>

                  </div>

                </div>

              `;

            }
          ).join("")

        : `

          <div class="error-box">

            Passenger details API response
            mein available nahi hain.

          </div>

        `;


    show(
      box,

      `

      <div class="result-card">


        <div class="result-head">

          <small>
            PNR STATUS
          </small>

          <h2>
            PNR ${esc(
              d?.pnr ||
              result?.pnr ||
              "-"
            )}
          </h2>

          <p>
            ${esc(
              d?.status ||
              d?.message ||
              "PNR status fetched successfully"
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


        <h3 class="passenger-heading">
          👥 Passenger Details
        </h3>


        <div class="passenger-list">

          ${passengerHTML}

        </div>


        <div class="privacy">

          🔒 Railway information fetched securely.

        </div>


      </div>

      `
    );

  }


  /* =====================================================
     LIVE TRAIN
     CURRENT + NEXT
  ===================================================== */

  $("liveForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const trainNo =
        ($("liveTrain")?.value || "")
          .replace(/\D/g, "")
          .slice(0, 5);


      const date =
        $("liveDate")?.value ||
        "";


      const box =
        $("liveResult");


      if (!/^\d{5}$/.test(trainNo)) {

        show(
          box,
          error(
            "Enter valid 5 digit train number."
          )
        );

        return;

      }


      if (!date) {

        show(
          box,
          error(
            "Journey date select karein."
          )
        );

        return;

      }


      show(
        box,
        loading(
          "Fetching live train location..."
        )
      );


      try {

        const result =
          await callAPI({

            action: "LIVE",

            trainNo,

            date: railDate(date)

          });


        renderLive(
          box,
          result?.data ||
          result,
          trainNo
        );


      } catch (err) {

        show(
          box,
          error(err.message)
        );

      }

    }
  );


  function renderLive(
    box,
    d,
    trainNo
  ) {

    const list =
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


    if (!current && list.length) {

      const index =
        list.findIndex(
          x =>
            x?.isCurrent === true ||
            x?.current === true ||
            String(
              x?.status ||
              ""
            ).toUpperCase() ===
              "CURRENT"
        );


      if (index >= 0) {

        current =
          list[index];

        next =
          list[index + 1] ||
          null;

      }

    }


    const stationName =
      x =>
        value(
          x,
          "stationName",
          "name",
          "station",
          "stnName"
        );


    function arrival(x) {

      return value(
        x?.arrival || {},
        "actual",
        "actualTime",
        "time",
        "scheduled"
      );

    }


    function scheduled(x) {

      return value(
        x?.arrival || {},
        "scheduled",
        "scheduledTime",
        "time"
      );

    }


    function delay(x) {

      return (
        x?.arrival?.delay ??
        x?.delay ??
        "-"
      );

    }


    function delayText(x) {

      const d =
        delay(x);

      if (
        d === "-" ||
        d === "" ||
        d === null
      ) {
        return "-";
      }

      return `${d} min late`;

    }


    show(
      box,

      `

      <div class="data-box">

        <h3>
          📍 Live Train Status
        </h3>


        <p>
          <b>
            Train:
          </b>

          ${esc(
            value(
              d,
              "trainName",
              "name"
            )
          )}
        </p>


        <p>
          <b>
            Train Number:
          </b>

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


        ${
          current
            ? `

              <div class="current-location-card">

                <h2>
                  📍 CURRENT LOCATION
                </h2>

                <h3>
                  ${esc(
                    stationName(current)
                  )}
                </h3>


                <div class="live-info-grid">

                  <div>

                    <small>
                      ACTUAL ARRIVAL
                    </small>

                    <b>
                      ${esc(
                        arrival(current)
                      )}
                    </b>

                  </div>


                  <div>

                    <small>
                      SCHEDULED
                    </small>

                    <b>
                      ${esc(
                        scheduled(current)
                      )}
                    </b>

                  </div>


                  <div>

                    <small>
                      DELAY
                    </small>

                    <b>
                      ${esc(
                        delayText(current)
                      )}
                    </b>

                  </div>


                  <div>

                    <small>
                      PLATFORM
                    </small>

                    <b>
                      ${esc(
                        value(
                          current,
                          "platform"
                        )
                      )}
                    </b>

                  </div>

                </div>

              </div>

            `
            : ""
        }


        ${
          next
            ? `

              <div class="next-station-card">

                <h2>
                  ⏭️ NEXT STATION
                </h2>

                <h3>
                  ${esc(
                    stationName(next)
                  )}
                </h3>


                <div class="live-info-grid">

                  <div>

                    <small>
                      EXPECTED ARRIVAL
                    </small>

                    <b>
                      ${esc(
                        arrival(next)
                      )}
                    </b>

                  </div>


                  <div>

                    <small>
                      SCHEDULED
                    </small>

                    <b>
                      ${esc(
                        scheduled(next)
                      )}
                    </b>

                  </div>


                  <div>

                    <small>
                      DELAY
                    </small>

                    <b>
                      ${esc(
                        delayText(next)
                      )}
                    </b>

                  </div>


                  <div>

                    <small>
                      PLATFORM
                    </small>

                    <b>
                      ${esc(
                        value(
                          next,
                          "platform"
                        )
                      )}
                    </b>

                  </div>

                </div>

              </div>

            `
            : ""
        }


        ${
          !current && !next
            ? `

              <div class="error-box">

                📍 API se current/next
                station data nahi mila.

              </div>

            `
            : ""
        }

      </div>

      `
    );

  }


  /* =====================================================
     TRAIN SEARCH
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
        $("searchDate")?.value ||
        "";


      const box =
        $("searchResult");


      if (
        !/^[A-Z]{2,5}$/.test(from)
      ) {

        show(
          box,
          error(
            "Valid From station select karein."
          )
        );

        return;

      }


      if (
        !/^[A-Z]{2,5}$/.test(to)
      ) {

        show(
          box,
          error(
            "Valid To station select karein."
          )
        );

        return;

      }


      if (from === to) {

        show(
          box,
          error(
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

            date:
              railDate(date)

          });


        renderSearch(
          box,
          result
        );


      } catch (err) {

        show(
          box,
          error(err.message)
        );

      }

    }
  );


  function renderSearch(
    box,
    result
  ) {

    const trains =
      Array.isArray(
        result?.display
      )
        ? result.display
        : Array.isArray(
            result?.data
          )
          ? result.data
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

                ${esc(
                  value(
                    t,
                    "trainNo",
                    "trainNumber",
                    "number"
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
                🟢 Departure:
                ${esc(
                  value(
                    t,
                    "departure",
                    "departureTime"
                  )
                )}
              </p>


              <p>
                🔴 Arrival:
                ${esc(
                  value(
                    t,
                    "arrival",
                    "arrivalTime"
                  )
                )}
              </p>


              <p>
                ⏱️ Travel:
                ${esc(
                  value(
                    t,
                    "travelTime",
                    "travel_time"
                  )
                )}
              </p>


              <p>
                📅 Running:
                ${esc(
                  value(
                    t,
                    "runningDays",
                    "running_days"
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
        Number(
          $("stationHours")?.value ||
          2
        );


      const box =
        $("stationResult");


      if (
        !/^[A-Z]{2,5}$/.test(station)
      ) {

        show(
          box,
          error(
            "Valid station select karein."
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
          result?.data ||
          result,
          station
        );


      } catch (err) {

        show(
          box,
          error(err.message)
        );

      }

    }
  );


  function renderStation(
    box,
    d,
    station
  ) {

    const trains =
      Array.isArray(d?.trains)
        ? d.trains
        : Array.isArray(d)
          ? d
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


        <div class="train-list">

          ${
            trains.length

              ? trains.map(t => `

                <div class="train-item">

                  <strong>

                    🚆
                    ${esc(
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
                    🕐 Arrival:
                    ${esc(
                      value(
                        t,
                        "arrival",
                        "arrivalTime"
                      )
                    )}
                  </p>


                  <p>
                    🟢 Platform:
                    ${esc(
                      value(
                        t,
                        "platform"
                      )
                    )}
                  </p>


                  <p>
                    ⏱️ Delay:
                    ${esc(
                      value(
                        t,
                        "delay"
                      )
                    )}
                  </p>

                </div>

              `).join("")

              : `

                <div class="error-box">

                  No live train data available.

                </div>

              `
          }

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
        ($("trainInfoNo")?.value || "")
          .replace(/\D/g, "")
          .slice(0, 5);


      const box =
        $("trainInfoResult");


      if (
        !/^\d{5}$/.test(trainNo)
      ) {

        show(
          box,
          error(
            "Valid 5 digit train number enter karein."
          )
        );

        return;

      }


      show(
        box,
        loading(
          "Fetching train information..."
        )
      );


      try {

        const result =
          await callAPI({

            action: "TRAIN",

            trainNo

          });


        const d =
          result?.display ||
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


            <div class="info-grid">

              <div>
                <small>
                  TRAIN NUMBER
                </small>

                <b>
                  ${esc(
                    value(
                      d,
                      "trainNo",
                      "train_no",
                      "trainNumber"
                    ) !== "-"
                      ? value(
                          d,
                          "trainNo",
                          "train_no",
                          "trainNumber"
                        )
                      : trainNo
                  )}
                </b>
              </div>


              <div>
                <small>
                  TRAIN NAME
                </small>

                <b>
                  ${esc(
                    value(
                      d,
                      "trainName",
                      "train_name",
                      "name"
                    )
                  )}
                </b>
              </div>


              <div>
                <small>
                  FROM
                </small>

                <b>
                  ${esc(
                    value(
                      d,
                      "from",
                      "from_stn_name"
                    )
                  )}
                </b>
              </div>


              <div>
                <small>
                  TO
                </small>

                <b>
                  ${esc(
                    value(
                      d,
                      "to",
                      "to_stn_name"
                    )
                  )}
                </b>
              </div>


              <div>
                <small>
                  DEPARTURE
                </small>

                <b>
                  ${esc(
                    value(
                      d,
                      "departure",
                      "from_time"
                    )
                  )}
                </b>
              </div>


              <div>
                <small>
                  ARRIVAL
                </small>

                <b>
                  ${esc(
                    value(
                      d,
                      "arrival",
                      "to_time"
                    )
                  )}
                </b>
              </div>


              <div>
                <small>
                  TRAVEL TIME
                </small>

                <b>
                  ${esc(
                    value(
                      d,
                      "travelTime",
                      "travel_time"
                    )
                  )}
                </b>
              </div>


              <div>
                <small>
                  RUNNING DAYS
                </small>

                <b>
                  ${esc(
                    value(
                      d,
                      "runningDays",
                      "running_days"
                    )
                  )}
                </b>
              </div>

            </div>

          </div>

          `
        );


      } catch (err) {

        show(
          box,
          error(err.message)
        );

      }

    }
  );


  /* =====================================================
     SEAT AVAILABILITY
  ===================================================== */

  $("seatForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const trainNo =
        ($("seatTrain")?.value || "")
          .replace(/\D/g, "")
          .slice(0, 5);


      const from =
        getStationCode(
          "seatFrom"
        );


      const to =
        getStationCode(
          "seatTo"
        );


      const date =
        $("seatDate")?.value ||
        "";


      const coach =
        $("seatClass")?.value ||
        "";


      const quota =
        $("seatQuota")?.value ||
        "";


      const box =
        $("seatResult");


      if (
        !/^\d{5}$/.test(trainNo) ||
        !/^[A-Z]{2,5}$/.test(from) ||
        !/^[A-Z]{2,5}$/.test(to) ||
        !date ||
        !coach ||
        !quota
      ) {

        show(
          box,
          error(
            "Train, From, To, Date, Class aur Quota complete karein."
          )
        );

        return;

      }


      show(
        box,
        loading(
          "Checking seat availability..."
        )
      );


      try {

        const result =
          await callAPI({

            action: "SEATS",

            trainNo,

            from,

            to,

            date:
              railDate(date),

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
          error(err.message)
        );

      }

    }
  );


  function renderSeats(
    box,
    result
  ) {

    const d =
      result?.display ||
      result?.data ||
      result;


    const availability =
      Array.isArray(
        d?.availability
      )
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
          <b>
            Train:
          </b>

          ${esc(
            value(
              d,
              "trainName"
            )
          )}
        </p>


        <p>
          <b>
            Total Fare:
          </b>

          ₹${esc(
            value(
              d,
              "totalFare"
            )
          )}
        </p>


        <div class="train-list">

          ${
            availability.length

              ? availability.map(
                  a => `

                    <div class="train-item">

                      <strong>
                        📅 ${esc(
                          value(
                            a,
                            "date"
                          )
                        )}
                      </strong>

                      <p>
                        💺 ${esc(
                          value(
                            a,
                            "status",
                            "availabilityText"
                          )
                        )}
                      </p>

                      <p>
                        🔮 ${esc(
                          value(
                            a,
                            "prediction"
                          )
                        )}
                      </p>

                    </div>

                  `
                ).join("")

              : `
                <div class="error-box">
                  Availability data available nahi hai.
                </div>
              `
          }

        </div>

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
        ($("fareTrain")?.value || "")
          .replace(/\D/g, "")
          .slice(0, 5);


      const from =
        getStationCode(
          "fareFrom"
        );


      const to =
        getStationCode(
          "fareTo"
        );


      const date =
        $("fareDate")?.value ||
        "";


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
        !/^[A-Z]{2,5}$/.test(from) ||
        !/^[A-Z]{2,5}$/.test(to) ||
        !date ||
        !travelClass ||
        !quota
      ) {

        show(
          box,
          error(
            "Fare enquiry details complete karein."
          )
        );

        return;

      }


      show(
        box,
        loading(
          "Checking fare..."
        )
      );


      try {

        const result =
          await callAPI({

            action: "FARE",

            trainNo,

            from,

            to,

            date:
              railDate(date),

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
          error(err.message)
        );

      }

    }
  );


  function renderFare(
    box,
    result
  ) {

    const d =
      result?.display ||
      result?.data ||
      result;


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
                value(
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
                value(
                  d,
                  "totalFare",
                  "fare"
                )
              )}
            </b>

          </div>

        </div>

      </div>

      `
    );

  }


  /* =====================================================
     HISTORY
  ===================================================== */

  $("historyForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const trainNo =
        ($("historyTrain")?.value || "")
          .replace(/\D/g, "")
          .slice(0, 5);


      const date =
        $("historyDate")?.value ||
        "";


      const box =
        $("historyResult");


      if (
        !/^\d{5}$/.test(trainNo) ||
        !date
      ) {

        show(
          box,
          error(
            "Train number aur date enter karein."
          )
        );

        return;

      }


      show(
        box,
        loading(
          "Fetching train history..."
        )
      );


      try {

        const result =
          await callAPI({

            action: "HISTORY",

            trainNo,

            date:
              railDate(date)

          });


        renderHistory(
          box,
          result
        );


      } catch (err) {

        show(
          box,
          error(err.message)
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
      Array.isArray(
        d?.stations
      )
        ? d.stations
        : Array.isArray(
            d?.history
          )
          ? d.history
          : [];


    show(
      box,

      `

      <div class="data-box">

        <h3>
          📜 Train History
        </h3>


        ${
          list.length

            ? `

              <div class="train-list">

                ${list.map(
                  s => `

                    <div class="train-item">

                      <strong>
                        🚉 ${esc(
                          value(
                            s,
                            "stationName",
                            "name",
                            "station"
                          )
                        )}
                      </strong>


                      <p>
                        Arrival:
                        ${esc(
                          value(
                            s?.arrival || {},
                            "actual",
                            "scheduled",
                            "time"
                          )
                        )}
                      </p>


                      <p>
                        Departure:
                        ${esc(
                          value(
                            s?.departure || {},
                            "actual",
                            "scheduled",
                            "time"
                          )
                        )}
                      </p>

                    </div>

                  `
                ).join("")}

              </div>

            `

            : `

              <div class="error-box">
                History data available nahi hai.
              </div>

            `
        }

      </div>

      `
    );

  }


  /* =====================================================
     CANCELLED
  ===================================================== */

  $("cancelledBtn")?.addEventListener(
    "click",
    async () => {

      const box =
        $("cancelledResult");


      show(
        box,
        loading(
          "Fetching cancelled trains..."
        )
      );


      try {

        const result =
          await callAPI({
            action: "CANCELLED"
          });


        const d =
          result?.data ||
          result;


        const trains =
          Array.isArray(d)
            ? d
            : Array.isArray(
                d?.trains
              )
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

                    ${trains.map(
                      t => `

                        <div class="train-item">

                          <strong>

                            🚆
                            ${esc(
                              value(
                                t,
                                "trainNo",
                                "trainNumber",
                                "number"
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
                                "message"
                              )
                            )}
                          </p>

                        </div>

                      `
                    ).join("")}

                  </div>

                `

                : success(
                    "Cancelled train data available nahi hai."
                  )
            }

          </div>

          `
        );


      } catch (err) {

        show(
          box,
          error(err.message)
        );

      }

    }
  );


  /* =====================================================
     INPUT LIMITS
  ===================================================== */

  $("pnr")?.addEventListener(
    "input",
    e => {

      e.target.value =
        e.target.value
          .replace(/\D/g, "")
          .slice(0, 10);

    }
  );


  [
    "liveTrain",
    "trainInfoNo",
    "seatTrain",
    "fareTrain",
    "historyTrain"
  ].forEach(id => {

    $(id)?.addEventListener(
      "input",
      e => {

        e.target.value =
          e.target.value
            .replace(/\D/g, "")
            .slice(0, 5);

      }
    );

  });


  /* =====================================================
     START
  ===================================================== */

  setDates();

  loadStations();

});
