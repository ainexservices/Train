document.addEventListener("DOMContentLoaded", () => {

  const $ = id => document.getElementById(id);

  let stations = [];


  /* =========================
     DATE
  ========================= */

  function today() {

    const d = new Date();

    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );

  }

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


  /* =========================
     STATION DATABASE
  ========================= */

  async function loadStations() {

    try {

      const response =
        await fetch("/data/stations.json", {
          cache: "force-cache"
        });

      if (!response.ok) {
        throw new Error("Station database load nahi hua.");
      }

      const json =
        await response.json();

      stations =
        Array.isArray(json)
          ? json
          : Array.isArray(json.stations)
          ? json.stations
          : [];

      console.log(
        `AINEX: ${stations.length} stations loaded`
      );

    } catch (error) {

      console.error(
        "Station database error:",
        error
      );

      stations = [];

    }

  }


  loadStations();


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
     HELPERS
  ========================= */

  function esc(value) {

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return "-";
    }

    return String(value)
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
        v !== ""
      ) {
        return v;
      }

    }

    return "-";

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


  function show(box, html) {

    if (box) {
      box.innerHTML = html;
    }

  }


  function apiData(result) {

    return result?.data ?? result;

  }


  /* =========================
     STATION HELPERS
  ========================= */

  function stationFields(s) {

    return {

      code:
        s?.stnCode ||
        s?.code ||
        s?.station_code ||
        "",

      name:
        s?.stnName ||
        s?.name ||
        s?.station_name ||
        "",

      city:
        s?.stnCity ||
        s?.city ||
        ""

    };

  }


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

        const query =
          input.value
            .trim()
            .toUpperCase();

        input.dataset.code = "";

        box.innerHTML = "";

        if (!query) {

          box.style.display = "none";

          return;

        }


        const matches =
          stations
            .filter(s => {

              const x =
                stationFields(s);

              return (
                x.code
                  .toUpperCase()
                  .includes(query) ||

                x.name
                  .toUpperCase()
                  .includes(query) ||

                x.city
                  .toUpperCase()
                  .includes(query)
              );

            })
            .slice(0, 10);


        if (!matches.length) {

          box.style.display = "none";

          return;

        }


        matches.forEach(s => {

          const x =
            stationFields(s);

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
                ${esc(x.name)}
              </strong>

              <span>
                ${esc(x.code)}
                ${x.city
                  ? ` • ${esc(x.city)}`
                  : ""}
              </span>

            </div>
          `;


          item.addEventListener(
            "click",
            () => {

              input.value =
                `${x.name} (${x.code})`;

              input.dataset.code =
                x.code;

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

  }


  [
    ["fromStation", "fromSuggestions"],
    ["toStation", "toSuggestions"],
    ["seatFrom", "seatFromSuggestions"],
    ["seatTo", "seatToSuggestions"],
    ["fareFrom", "fareFromSuggestions"],
    ["fareTo", "fareToSuggestions"],
    ["stationCode", "stationSuggestions"]
  ].forEach(x => {

    setupStationInput(
      x[0],
      x[1]
    );

  });


  function getStationCode(id) {

    const input = $(id);

    if (!input) return "";

    if (input.dataset.code) {

      return input.dataset.code
        .trim()
        .toUpperCase();

    }


    const text =
      input.value
        .trim()
        .toUpperCase();


    const code =
      text.match(
        /\(([A-Z]{2,5})\)/
      );

    if (code) {

      return code[1];

    }


    const exact =
      stations.find(s => {

        const x =
          stationFields(s);

        return (
          x.code.toUpperCase() ===
          text
        );

      });


    if (exact) {

      return stationFields(exact)
        .code
        .toUpperCase();

    }


    return text;

  }


  /* ==================================================
     PNR
  ================================================== */

  $("pnrForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      const pnr =
        $("pnr")
          .value
          .replace(/\D/g, "")
          .slice(0, 10);

      const box =
        $("result");

      const btn =
        $("checkBtn");


      if (!/^\d{10}$/.test(pnr)) {

        show(
          box,
          errorBox(
            "10 digit PNR enter karo."
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
          box,
          apiData(result)
        );


      } catch (err) {

        show(
          box,
          errorBox(err.message)
        );

      }


      btn.disabled = false;

      btn.textContent =
        "🔎 CHECK PNR STATUS";

    }
  );


  function renderPNR(box, d) {

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


    const passengersHTML =
      passengers.map((p, i) => {

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

              <span class="unknown">
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
      box,
      `
        <div class="result-card">

          <div class="result-head">

            <small>
              PNR RESULT
            </small>

            <h2>
              PNR ${esc(d?.pnr)}
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

              <small>
                FROM
              </small>

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

              <small>
                TO
              </small>

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

              <small>
                TRAIN
              </small>

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

              <small>
                TRAIN NUMBER
              </small>

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

              <small>
                JOURNEY DATE
              </small>

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

              <small>
                CLASS
              </small>

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
                  ${passengersHTML}
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


  /* ==================================================
     LIVE TRAIN
  ================================================== */

  $("liveForm")?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      const trainNo =
        $("liveTrain")
          .value
          .trim();

      const date =
        $("liveDate")
          .value;

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
          "Live train location fetch ho rahi hai..."
        )
      );


      try {

        const result =
          await callAPI({
            action: "LIVE",
            trainNo,
            date
          });


        renderLive(
          box,
          apiData(result),
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


  function findStations(d) {

    if (
      Array.isArray(d?.stations)
    ) {
      return d.stations;
    }

    if (
      Array.isArray(d?.timeline)
    ) {
      return d.timeline;
    }

    if (
      Array.isArray(d?.route)
    ) {
      return d.route;
    }

    if (
      Array.isArray(d?.trainRoute)
    ) {
      return d.trainRoute;
    }

    return [];

  }


  function isCurrent(s) {

    return Boolean(
      s?.current ||
      s?.isCurrent ||
      s?.currentStation ||
      s?.status === "CURRENT" ||
      s?.status === "current"
    );

  }


  function stationName(s) {

    return val(
      s,
      "stationName",
      "name",
      "station",
      "stnName"
    );

  }


  function scheduledArrival(s) {

    return val(
      s?.arrival || {},
      "scheduled",
      "scheduledTime",
      "time"
    );

  }


  function actualArrival(s) {

    return val(
      s?.arrival || {},
      "actual",
      "actualTime"
    );

  }


  function scheduledDeparture(s) {

    return val(
      s?.departure || {},
      "scheduled",
      "scheduledTime",
      "time"
    );

  }


  function actualDeparture(s) {

    return val(
      s?.departure || {},
      "actual",
      "actualTime"
    );

  }


  function delayText(s) {

    const delay =
      s?.delay ??
      s?.arrival?.delay ??
      s?.departure?.delay;

    if (
      delay !== undefined &&
      delay !== null &&
      delay !== ""
    ) {

      return `${delay} min late`;

    }

    return "Delay data unavailable";

  }


  function renderLive(box, d, trainNo) {

    const list =
      findStations(d);


    let currentIndex =
      list.findIndex(isCurrent);


    if (currentIndex < 0) {

      currentIndex =
        list.findIndex(s =>
          s?.status === "DEPARTED" ||
          s?.status === "departed"
        );

    }


    const current =
      currentIndex >= 0
        ? list[currentIndex]
        : d?.currentStation || null;


    const next =
      currentIndex >= 0 &&
      list[currentIndex + 1]
        ? list[currentIndex + 1]
        : d?.nextStation || null;


    const currentName =
      current
        ? stationName(current)
        : val(
            d,
            "currentStationName",
            "currentStation"
          );


    const nextName =
      next
        ? stationName(next)
        : val(
            d,
            "nextStationName",
            "nextStation"
          );


    const currentDelay =
      current
        ? delayText(current)
        : val(
            d,
            "delay",
            "delayText"
          );


    show(
      box,
      `
        <div class="data-box">

          <h3>
            🚆 ${esc(
              val(
                d,
                "trainName",
                "name"
              )
            )}
          </h3>

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
                <div class="live-current">

                  <h3>
                    📍 CURRENT LOCATION
                  </h3>

                  <div class="live-station-name">
                    ${esc(currentName)}
                  </div>

                  <div class="time-grid">

                    <div class="time-box">

                      <small>
                        SCHEDULED ARRIVAL
                      </small>

                      <b>
                        ${esc(
                          scheduledArrival(
                            current
                          )
                        )}
                      </b>

                    </div>


                    <div class="time-box">

                      <small>
                        ACTUAL ARRIVAL
                      </small>

                      <b>
                        ${esc(
                          actualArrival(
                            current
                          )
                        )}
                      </b>

                    </div>


                    <div class="time-box">

                      <small>
                        SCHEDULED DEPARTURE
                      </small>

                      <b>
                        ${esc(
                          scheduledDeparture(
                            current
                          )
                        )}
                      </b>

                    </div>


                    <div class="time-box">

                      <small>
                        ACTUAL DEPARTURE
                      </small>

                      <b>
                        ${esc(
                          actualDeparture(
                            current
                          )
                        )}
                      </b>

                    </div>

                  </div>


         
