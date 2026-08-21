import {
  configure,
  checkPNRStatus,
  getTrainInfo,
  trackTrain,
  getTrainHistory,
  liveAtStation,
  searchTrainBetweenStations,
  getAvailability,
  fareLookup,
  cancelList
} from "railkit";


function json(data, status = 200) {

  return Response.json(data, {

    status,

    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }

  });

}


function clean(value) {

  return String(value || "")
    .trim()
    .toUpperCase();

}


function dateToRailkit(value) {

  if (!value) return "";

  const s = String(value);

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    return s;
  }

  const m =
    s.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!m) return s;

  return `${m[3]}-${m[2]}-${m[1]}`;

}


function stationCode(value) {

  const aliases = {

    "BABHNAN": "BV",
    "BV": "BV",

    "AYODHYA": "AYC",
    "AYODHYA CANTT": "AYC",
    "AYC": "AYC",

    "AYODHYA DHAM": "AY",
    "AY": "AY",

    "GORAKHPUR": "GKP",
    "GORAKHPUR JN": "GKP",
    "GKP": "GKP",

    "BASTI": "BST",
    "BST": "BST",

    "LUCKNOW": "LKO",
    "LKO": "LKO",

    "GONDA": "GD",
    "GONDA JN": "GD",
    "GD": "GD",

    "VARANASI": "BSB",
    "VARANASI JN": "BSB",
    "BSB": "BSB",

    "PRAYAGRAJ": "PRYJ",
    "PRAYAGRAJ JN": "PRYJ",
    "PRYJ": "PRYJ",

    "NEW DELHI": "NDLS",
    "NDLS": "NDLS",

    "KANPUR": "CNB",
    "KANPUR CENTRAL": "CNB",
    "CNB": "CNB",

    "PATNA": "PNBE",
    "PATNA JN": "PNBE",
    "PNBE": "PNBE",

    "DELHI": "DLI",
    "DELHI JN": "DLI",
    "DLI": "DLI"

  };

  const s = clean(value);

  return aliases[s] || s;

}


function daysText(days) {

  const names = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ];

  const s = String(days || "");

  if (!/^[01]{7}$/.test(s)) {
    return s || "-";
  }

  return names
    .filter((_, i) => s[i] === "1")
    .join(", ") || "No running day";

}


export default {

  async fetch(request) {

    try {

      const url =
        new URL(request.url);

      const action =
        clean(
          url.searchParams.get(
            "action"
          )
        );


      /* =========================
         API KEY
      ========================= */

      const apiKey =
        process.env.RAILKIT_API_KEY;


      if (!apiKey) {

        return json({

          success: false,

          message:
            "RAILKIT_API_KEY missing. Vercel Environment Variables check karo."

        }, 500);

      }


      configure(apiKey);


      /* =========================
         PNR
      ========================= */

      if (action === "PNR") {

        const pnr =
          (
            url.searchParams.get(
              "pnr"
            ) || ""
          )
          .replace(/\D/g, "");


        if (!/^\d{10}$/.test(pnr)) {

          return json({

            success: false,

            message:
              "10 digit PNR enter karo."

          }, 400);

        }


        const result =
          await checkPNRStatus(
            pnr
          );


        return json(result);

      }


      /* =========================
         TRAIN INFORMATION
      ========================= */

      if (action === "TRAIN") {

        const trainNo =
          clean(
            url.searchParams.get(
              "trainNo"
            )
          );


        if (!/^\d{5}$/.test(trainNo)) {

          return json({

            success: false,

            message:
              "5 digit train number enter karo."

          }, 400);

        }


        const result =
          await getTrainInfo(
            trainNo
          );


        return json(result);

      }


      /* =========================
         LIVE TRAIN
      ========================= */

      if (action === "LIVE") {

        const trainNo =
          clean(
            url.searchParams.get(
              "trainNo"
            )
          );


        const date =
          dateToRailkit(
            url.searchParams.get(
              "date"
            )
          );


        if (!/^\d{5}$/.test(trainNo)) {

          return json({

            success: false,

            message:
              "5 digit train number enter karo."

          }, 400);

        }


        if (!date) {

          return json({

            success: false,

            message:
              "Journey date required."

          }, 400);

        }


        const result =
          await trackTrain(
            trainNo,
            date
          );


        return json(result);

      }


      /* =========================
         HISTORY
      ========================= */

      if (action === "HISTORY") {

        const trainNo =
          clean(
            url.searchParams.get(
              "trainNo"
            )
          );


        const date =
          dateToRailkit(
            url.searchParams.get(
              "date"
            )
          );


        if (
          !/^\d{5}$/.test(trainNo) ||
          !date
        ) {

          return json({

            success: false,

            message:
              "Train number aur date required."

          }, 400);

        }


        const result =
          await getTrainHistory(
            trainNo,
            date
          );


        return json(result);

      }


      /* =========================
         LIVE STATION
      ========================= */

      if (action === "STATION") {

        const station =
          stationCode(
            url.searchParams.get(
              "station"
            )
          );


        const hours =
          Number(
            url.searchParams.get(
              "hours"
            ) || 2
          );


        if (
          !/^[A-Z]{2,5}$/.test(
            station
          )
        ) {

          return json({

            success: false,

            message:
              "Valid station code select karo."

          }, 400);

        }


        if (
          ![2, 4, 8].includes(
            hours
          )
        ) {

          return json({

            success: false,

            message:
              "Hours 2, 4 ya 8 hona chahiye."

          }, 400);

        }


        const result =
          await liveAtStation(
            station,
            hours
          );


        return json(result);

      }


      /* =========================
         TRAIN SEARCH
      ========================= */

      if (action === "SEARCH") {

        const from =
          stationCode(
            url.searchParams.get(
              "from"
            )
          );


        const to =
          stationCode(
            url.searchParams.get(
              "to"
            )
          );


        const date =
          dateToRailkit(
            url.searchParams.get(
              "date"
            )
          );


        if (
          !/^[A-Z]{2,5}$/.test(from)
        ) {

          return json({

            success: false,

            message:
              "Invalid From station."

          }, 400);

        }


        if (
          !/^[A-Z]{2,5}$/.test(to)
        ) {

          return json({

            success: false,

            message:
              "Invalid To station."

          }, 400);

        }


        if (from === to) {

          return json({

            success: false,

            message:
              "From aur To same nahi ho sakte."

          }, 400);

        }


        const result =
          await searchTrainBetweenStations(
            from,
            to,
            date || undefined
          );


        return json(result);

      }


      /* =========================
         SEAT AVAILABILITY
      ========================= */

      if (action === "SEATS") {

        const trainNo =
          clean(
            url.searchParams.get(
              "trainNo"
            )
          );


        const from =
          stationCode(
            url.searchParams.get(
              "from"
            )
          );


        const to =
          stationCode(
            url.searchParams.get(
              "to"
            )
          );


        const date =
          dateToRailkit(
            url.searchParams.get(
              "date"
            )
          );


        const coach =
          clean(
            url.searchParams.get(
              "coach"
            )
          );


        const quota =
          clean(
            url.searchParams.get(
              "quota"
            )
          );


        if (
          !/^\d{5}$/.test(
            trainNo
          )
        ) {

          return json({

            success: false,

            message:
              "Invalid train number."

          }, 400);

        }


        if (
          !/^[A-Z]{2,5}$/.test(from) ||
          !/^[A-Z]{2,5}$/.test(to)
        ) {

          return json({

            success: false,

            message:
              "Invalid station."

          }, 400);

        }


        if (!date) {

          return json({

            success: false,

            message:
              "Journey date required."

          }, 400);

        }


        if (!coach) {

          return json({

            success: false,

            message:
              "Class required."

          }, 400);

        }


        if (!quota) {

          return json({

            success: false,

            message:
              "Quota required."

          }, 400);

        }


        const result =
          await getAvailability(
            trainNo,
            from,
            to,
            date,
            coach,
            quota
          );


        return json(result);

      }


      /* =========================
         FARE
      ========================= */

      if (action === "FARE") {

        const trainNo =
          clean(
            url.searchParams.get(
              "trainNo"
            )
          );


        const from =
          stationCode(
            url.searchParams.get(
              "from"
            )
          );


        const to =
          stationCode(
            url.searchParams.get(
              "to"
            )
          );


        const date =
          dateToRailkit(
            url.searchParams.get(
              "date"
            )
          );


        const travelClass =
          clean(
            url.searchParams.get(
              "travelClass"
            )
          );


        const quota =
          clean(
            url.searchParams.get(
              "quota"
            )
          );


        if (
          !/^\d{5}$/.test(trainNo) ||
          !/^[A-Z]{2,5}$/.test(from) ||
          !/^[A-Z]{2,5}$/.test(to) ||
          !date ||
          !travelClass ||
          !quota
        ) {

          return json({

            success: false,

            message:
              "Fare enquiry details incomplete hain."

          }, 400);

        }


        const result =
          await fareLookup(
            trainNo,
            from,
            to,
            date,
            travelClass,
            quota
          );


        return json(result);

      }


      /* =========================
         CANCELLED TRAINS
      ========================= */

      if (
        action === "CANCELLED"
      ) {

        const result =
          await cancelList();


        return json(result);

      }


      /* =========================
         INVALID ACTION
      ========================= */

      return json({

        success: false,

        message:
          "Invalid railway service."

      }, 400);


    } catch (error) {

      console.error(
        "AINEX RAILWAY ERROR:",
        error
      );


      return json({

        success: false,

        message:
          error?.message ||
          "Railway API request failed."

      }, 500);

    }

  }

};
