document.addEventListener("DOMContentLoaded", () => {

  const $ = id => document.getElementById(id);

  let stations = [];

  /* =====================================================
     BASIC HELPERS
  ===================================================== */

  const today = () => {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  };


  const esc = value => {
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
  };


  const val = (obj, ...keys) => {

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
  };


  const show = (el, html) => {
    if (el) el.innerHTML = html;
  };


  const loading = text => `
    <div class="loading">
      <div class="loader"></div>
      <strong>${esc(text)}</strong>
    </div>
  `;


  const error = text => `
    <div class="error-box">
      ❌ ${esc(text)}
    </div>
  `;


  const apiDate = date => {

    if (!date) return "";

    const m = String(date).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    return m
      ? `${m[3]}-${m[2]}-${m[1]}`
      : date;
  };


  /* =====================================================
     DEFAULT DATES
  ===================================================== */

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


  /* =====================================================
     RAILWAY API
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
        "Railway server ne valid JSON response nahi diya."
      );
    }


    if (
      !response.ok ||
      data?.success === false
    ) {

      throw new Error(
        data?.message ||
        data?.error ||
        "Railway API request failed."
      );

    }

    return data;
  }


  /* =====================================================
     STATION.JSON
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
          `station.json load failed: ${response.status}`
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

            code: String(
              s.stnCode ||
              s.code ||
              ""
            ).trim().toUpperCase(),

            name: String(
              s.stnName ||
              s.name ||
              ""
            ).trim(),

            city: String(
              s.stnCity ||
              s.city ||
              ""
            ).trim()

          }))
          .filter(
            s => s.code && s.name
          );


      console.log(
        "AINEX Railway:",
        stations.length,
        "stations loaded"
      );


      setupStationInputs();

    } catch (err) {

      console.error(
        "Station JSON Error:",
        err
      );

    }

  }


  /* =====================================================
     STATION AUTOCOMPLETE
  ===================================================== */

  const stationFields = [

    ["fromStation", "fromSuggestions"],
    ["toStation", "toSuggestions"],

    ["seatFrom", "seatFromSuggestions"],
    ["seatTo", "seatToSuggestions"],

    ["fareFrom", "fareFromSuggestions"],
    ["fareTo", "fareToSuggestions"],

    ["stationCode", "stationSuggestions"]

  ];


  function setupStationInputs() {

    stationFields.forEach(
      ([inputId, boxId]) => {

        setupStationInput(
          inputId,
          boxId
        );

      }
    );

  }


  function setupStationInput(
    inputId,
    boxId
  ) {

    const input = $(inputId);
    const box = $(boxId);

    if (!input || !box) return;


    input.addEventListener(
      "input",
      () => {

        input.dataset.code = "";

        const q =
          input.value
            .trim()
            .toUpperCase();


        box.innerHTML = "";


        if (!q) {

          box.style.display = "none";

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
                code.startsWith(q) ||
                name.startsWith(q) ||
                city.startsWith(q) ||
                code.includes(q) ||
                name.includes(q) ||
                city.includes(q)
              );

            })
            .slice(0, 15);


        if (!matches.length) {

          box.innerHTML = `
            <div class="station-suggestion">
              ❌ No station found
            </div>
          `;

          box.style.display = "block";

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


    const bracket =
      text.match(
        /\(([A-Z]{2,5})\)/
      );


    if (bracket) {
      return bracket[1];
    }


    const found =
      stations.find(
        s =>
          s.code === text ||
          s.name.toUpperCase() === text ||
          s.city.toUpperCase() === text
      );


    return found
      ? found.code
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


      const box = $("result");
      const btn = $("checkBtn");


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
        btn.textContent = "⏳ CHECKING...";

      }


      show(
        box,
        loading("Checking PNR status...")
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
          error(err.message)
        );

      }


      if (btn) {

        btn.disabled = false;
        btn.textContent = "CHECK";

      }

    }
  );


  function renderPNR(d) {

    const train = d?.train || {};
    const journey = d?.journey || {};

    const from =
      journey?.source || {};

    const to =
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
                  val(
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
                  ${esc(
                    val(
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
                    from,
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
                    to,
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
            passengerHTML
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
     CURRENT + NEXT ONLY
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
        $("liveDate")?.value || "";


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

            date: apiDate(date)

          });


        renderLive(
          box,
          result?.data || result,
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

      const currentIndex =
        list.findIndex(
          x =>
            x?.isCurrent === true ||
            x?.current === true ||
            String(
              x?.status || ""
            ).toUpperCase() === "CURRENT"
        );


      if (currentIndex >= 0) {

        current =
          list[currentIndex];

        next =
          list[currentIndex + 1] ||
          null;

      }

    }


    const stationName =
      x =>
        val(
          x,
          "stationName",
          "name",
          "station",
          "stnName"
        );


    const scheduled =
      x =>
        val(
          x?.arrival || {},
          "scheduled",
          "scheduledTime",
          "time"
        );


    const actual =
      x =>
        val(
          x?.arrival || {},
          "actual",
          "actualTime",
          "time",
          "scheduled"
        );


    const delay =
      x =>
        x?.arrival?.delay ??
        x?.delay ??
        "-";


    show(
      box,

      `
        <div class="data-box">

          <h3>
            📍 Live Train Status
          </h3>


          <p>
            <b>Train:</b>
            ${esc(
              val(
                d,
                "trainName",
                "name"
              )
            )}
          </p>


          <p>
            <b>Train Number:</b>
            ${esc(
              val(
                d,
                "trainNo",
                "trainNumber"
              ) !== "-"
                ? val(
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
                    📍 Current Station
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
                          actual(current)
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
                        ${
                          delay(current) === "-"
                            ? "-"
                            : `${esc(
                                delay(current)
                              )} min late`
                        }
                      </b>
                    </div>


                    <div>
                      <small>
                        PLATFORM
                      </small>

                      <b>
                        ${esc(
                          val(
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
                    ⏭️ Next Station
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
                          actual(next)
                        )}
                      </b>
                    </div>


                    <div>
                      <small>
                        SCHEDULED ARRIVAL
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
                        ${
                          delay(next) === "-"
                            ? "-"
                            : `${esc(
                                delay(next)
                              )} min late`
                        }
                      </b>
                    </div>


                    <div>
                      <small>
                        PLATFORM
                      </small>

                      <b>
                        ${esc(
                          val(
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
                  📍 Current/Next station data API se nahi mila.
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
        $("searchDate")?.value || "";


      const box =
        $("searchResult");


      if (!/^[A-Z]{2,5}$/.test(from)) {

        show(
          box,
          error(
            "Valid From station select karein."
          )
        );

        return;

      }


      if (!/^[A-Z]{2,5}$/.test(to)) {

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

            date: apiDate(date)

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
      Array.isArray(result?.display)
        ? result.display
        : Array.isArray(result?.data)
          ? result.data
          : [];


    if (!trains.length) {

      show(
        box,
        `
          <div class="data-box">
            <h3>🔎 Train Search</h3>
            <p>No train data available.</p>
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

            ${trains.map(t => `

              <div class="train-item">

                <strong>
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
                  🟢 Departure:
                  ${esc(
                    val(
                      t,
                      "departure",
                      "departureTime",
                      "from_time"
                    )
                  )}
                </p>


                <p>
                  🔴 Arrival:
                  ${esc(
                    val(
                      t,
                      "arrival",
                      "arrivalTime",
                      "to_time"
                    )
                  )}
                </p>


                <p>
                  ⏱️ Travel:
                  ${esc(
                    val(
                      t,
                      "travelTime",
                      "travel_time"
                    )
                  )}
                </p>


                <p>
                  📅 Running:
                  ${esc(
                    val(
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
          $("stationHours")?.value || 2
        );


      const box =
        $("stationResult");


      if (!/^[A-Z]{2,5}$/.test(station)) {

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
          result?.data || result,
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
            🚉 ${esc(station)} Live Station
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
                      🚆
                      ${esc(
                        val(
                          t,
                          "trainNo",
                          "trainNumber"
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
                      🕐 Arrival:
                      ${esc(
                        val(
                          t,
                          "arrival",
                          "arrivalTime"
                        )
                      )}
                    </p>


                    <p>
                      🟢 Platform:
                      ${esc(
                        val(
                          t,
                          "platform"
                        )
                      )}
                    </p>


                    <p>
                      ⏱️ Delay:
                      ${esc(
                        val(
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


      if (!/^\d{5}$/.test(trainNo)) {

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
                  <small>TRAIN NUMBER</small>
                  <b>
                    ${esc(
                      val(
                        d,
                        "trainNo",
                        "train_no",
                        "trainNumber"
                      ) || trainNo
                    )}
                  </b>
                </div>


                <div>
                  <small>TRAIN NAME</small>
                  <b>
                    ${esc(
                      val(
                        d,
                        "trainName",
                        "train_name",
                        "name"
                      )
                    )}
                  </b>
                </div>


                <div>
                  <small>FROM</small>
                  <b>
                    ${esc(
                      val(
                        d,
                        "from",
                        "from_stn_name"
                      )
                    )}
                  </b>
                </div>


                <div>
                  <small>TO</small>
                  <b>
                    ${esc(
                      val(
                        d,
                        "to",
                        "to_stn_name"
                      )
                    )}
                  </b>
                </div>


                <div>
                  <small>DEPARTURE</small>
                  <b>
                    ${esc(
                      val(
                        d,
                        "departure",
                        "from_time"
                      )
                    )}
                  </b>
                </div>


                <div>
                  <small>ARRIVAL</small>
                  <b>
                    ${esc(
                      val(
                        d,
                        "arrival",
                        "to_time"
                      )
                    )}
                  </b>
                </div>


                <div>
                  <small>TRAVEL TIME</small>
                  <b>
                    ${esc(
                      val(
                        d,
                        "travelTime",
                        "travel_time"
                      )
                    )}
                  </b>
                </div>


                <div>
                  <small>RUNNING DAYS</small>
                  <b>
                    ${esc(
                      val(
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
        getStationCode("seatFrom");


      const to =
        getStationCode("seatTo");


      const date =
        $("seatDate")?.value || "";


      const coach =
        $("seatClass")?.value || "";


      const quota =
        $("seatQuota")?.value || "";


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

            date: apiDate(date),

            coach,

            quota

          });


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
                <b>Train:</b>
                ${esc(
                  val(
                    d,
                    "trainName"
                  )
                )}
              </p>

              <p>
                <b>Total Fare:</b>
                ₹${esc(
                  val(
                    d,
                    "totalFare"
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
                            val(
                              x,
                              "date"
                            )
                          )}
                        </strong>

                        <p>
                          💺 ${esc(
                            val(
                              x,
                              "status",
                              "availabilityText"
                            )
                          )}
                        </p>

                        <p>
                          🔮 ${esc(
                            val(
                              x,
                              "prediction"
                            )
                          )}
                        </p>

                      </div>

                    `).join("")
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


      } catch (err) {

        show(
          box,
          error(err.message)
        );

      }

    }
  );


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
        getStationCode("fareFrom");


      const to =
        getStationCode("fareTo");


      const date =
        $("fareDate")?.value || "";


      const travelClass =
        $("fareClass")?.value || "";


      const quota =
        $("fareQuota")?.value || "";


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

            date: apiDate(date),

            travelClass,

            quota

          });


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
                  <small>BASE FARE</small>

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
                  <small>TOTAL FARE</small>

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
     TRAIN HISTORY
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
        $("historyDate")?.value || "";


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

            date: apiDate(date)

          });


        const d =
          result?.data || result;


        const list =
          Array.isArray(d?.stations)
            ? d.stations
            : Array.isArray(d?.history)
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
                                val(
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
                                val(
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
                                val(
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


      } catch (err) {

        show(
          box,
          error(err.message)
        );

      }

    }
  );


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
          "Fetching cancelled trains..."
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

                      ${trains.map(
                        t => `

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
                                  "message"
                                )
                              )}
                            </p>

                          </div>

                        `
                      ).join("")}

                    </div>
                  `
                  : `
                    <div class="success-box">
                      ✅ Cancelled train data available nahi hai.
                    </div>
                  `
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

  loadStations();

});
