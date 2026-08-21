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

  return String(value ?? "")
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
    s.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return m
    ? `${m[3]}-${m[2]}-${m[1]}`
    : s;

}


function stationCode(value) {

  const s = clean(value);

  const aliases = {

    "BABHNAN": "BV",
    "BV": "BV",

    "AYODHYA": "AY",
    "AYODHYA DHAM": "AY",
    "AYODHYA DHAM JN": "AY",
    "AY": "AY",

    "AYODHYA CANTT": "AYC",
    "AYC": "AYC",

    "GORAKHPUR": "GKP",
    "GORAKHPUR JN": "GKP",
    "GKP": "GKP",

    "BASTI": "BST",
    "BST": "BST",

    "LUCKNOW": "LKO",
    "LUCKNOW JN": "LKO",
    "LKO": "LKO",

    "GONDA": "GD",
    "GONDA JN": "GD",
    "GD": "GD",

    "VARANASI": "BSB",
    "VARANASI JN": "BSB",
    "BSB": "BSB",

    "KANPUR": "CNB",
    "KANPUR CENTRAL": "CNB",
    "CNB": "CNB",

    "PRAYAGRAJ": "PRYJ",
    "PRAYAGRAJ JN": "PRYJ",
    "PRYJ": "PRYJ",

    "NEW DELHI": "NDLS",
    "NDLS": "NDLS",

    "DELHI": "DLI",
    "DELHI JN": "DLI",
    "DLI": "DLI",

    "ANAND VIHAR": "ANVT",
    "ANAND VIHAR TERMINAL": "ANVT",
    "ANVT": "ANVT",

    "PATNA": "PNBE",
    "PATNA JN": "PNBE",
    "PNBE": "PNBE",

    "MUMBAI CENTRAL": "MMCT",
    "MMCT": "MMCT",

    "LOKMANYA TILAK TERMINUS": "LTT",
    "LTT": "LTT"

  };

  return aliases[s] || s;

}


function daysText(days = "") {

  const names = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ];

  const s = String(days);

  if (!/^[01]{7}$/.test(s)) {
    return s || "-";
  }

  return names
    .filter((_, i) => s[i] === "1")
    .join(", ") || "No running day";

}


/* =====================================================
   PNR NORMALIZER
   Passenger details ko preserve karta hai
===================================================== */

function normalizePNR(result) {

  const data =
    result?.data ||
    result ||
    {};

  const passengers =
    Array.isArray(data?.passengers)
      ? data.passengers
      : [];


  const normalizedPassengers =
    passengers.map((p, index) => {

      const booking =
        p?.booking || {};

      const current =
        p?.current || {};


      return {

        passengerNo:
          p?.passengerNo ||
          p?.passengerNumber ||
          index + 1,

        bookingStatus:
          booking?.status ||
          booking?.details?.status ||
          p?.bookingStatus ||
          "-",

        currentStatus:
          current?.status ||
          current?.details?.status ||
          p?.currentStatus ||
          "-",

        coach:
          current?.coach ||
          current?.coachNumber ||
          p?.coach ||
          "-",

        berth:
          current?.berthNo ||
          current?.berth ||
          p?.berthNo ||
          p?.berth ||
          "-",

        seat:
          current?.seatNo ||
          current?.seat ||
          p?.seatNo ||
          p?.seat ||
          "-",

        raw: p

      };

    });


  return {

    ...result,

    passengerDetails:
      normalizedPassengers

  };

}


export default {

  async fetch(request) {

    try {

      const url =
        new URL(request.url);

      const action =
        clean(
          url.searchParams.get("action")
        );


      /* =================================================
         API KEY
      ================================================= */

      const apiKey =
        process.env.RAILKIT_API_KEY;


      if (!apiKey) {

        return json({

          success: false,

          message:
            "RAILKIT_API_KEY missing. Vercel Environment Variables me API key add karo."

        }, 500);

      }


      configure(apiKey);


      /* =================================================
         PNR STATUS
      ================================================= */

      if (action === "PNR") {

        const pnr =
          (
            url.searchParams.get("pnr") ||
            ""
          )
          .replace(/\D/g, "")
          .slice(0, 10);


        if (!/^\d{10}$/.test(pnr)) {

          return json({

            success: false,

            message:
              "10 digit PNR enter karo."

          }, 400);

        }


        const result =
          await checkPNRStatus(pnr);


        /*
          Passenger information preserve
          + normalized passengerDetails
        */

        return json(
          normalizePNR(result)
        );

      }


      /* =================================================
         TRAIN INFORMATION
      ================================================= */

      if (action === "TRAIN") {

        const trainNo =
          clean(
            url.searchParams.get("trainNo")
          );


        if (!/^\d{5}$/.test(trainNo)) {

          return json({

            success: false,

            message:
              "5 digit train number enter karo."

          }, 400);

        }


        const result =
          await getTrainInfo(trainNo);


        if (
          result?.success &&
          result?.data?.trainInfo
        ) {

          const t =
            result.data.trainInfo;


          return json({

            ...result,

            display: {

              trainNo:
                t.train_no ||
                trainNo,

              trainName:
                t.train_name ||
                "-",

              from:
                t.from_stn_name ||
                "-",

              fromCode:
                t.from_stn_code ||
                "-",

              to:
                t.to_stn_name ||
                "-",

              toCode:
                t.to_stn_code ||
                "-",

              departure:
                t.from_time ||
                "-",

              arrival:
                t.to_time ||
                "-",

              travelTime:
                t.travel_time ||
                "-",

              runningDays:
                daysText(
                  t.running_days
                )

            }

          });

        }


        return json(result);

      }


      /* =================================================
         LIVE TRAIN
      ================================================= */

      if (action === "LIVE") {

        const trainNo =
          clean(
            url.searchParams.get("trainNo")
          );


        const date =
          dateToRailkit(
            url.searchParams.get("date")
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


      /* =================================================
         TRAIN HISTORY
      ================================================= */

      if (action === "HISTORY") {

        const trainNo =
          clean(
            url.searchParams.get("trainNo")
          );


        const date =
          dateToRailkit(
            url.searchParams.get("date")
          );


        if (
          !/^\d{5}$/.test(trainNo) ||
          !date
        ) {

          return json({

            success: false,

            message:
              "Train number aur journey date check karo."

          }, 400);

        }


        return json(
          await getTrainHistory(
            trainNo,
            date
          )
        );

      }


      /* =================================================
         LIVE STATION
      ================================================= */

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
          !/^[A-Z]{2,5}$/.test(station)
        ) {

          return json({

            success: false,

            message:
              "Valid station code enter karo."

          }, 400);

        }


        if (
          ![2, 4, 8].includes(hours)
        ) {

          return json({

            success: false,

            message:
              "Hours 2, 4 ya 8 hona chahiye."

          }, 400);

        }


        return json(
          await liveAtStation(
            station,
            hours
          )
        );

      }


      /* =================================================
         TRAIN SEARCH
      ================================================= */

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
          !/^[A-Z]{2,5}$/.test(from) ||
          !/^[A-Z]{2,5}$/.test(to)
        ) {

          return json({

            success: false,

            message:
              "Valid From aur To station select karo."

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


        if (
          result?.success &&
          Array.isArray(result?.data)
        ) {

          result.display =
            result.data.map(t => ({

              trainNo:
                t.train_no ||
                t.trainNo ||
                "-",

              trainName:
                t.train_name ||
                t.trainName ||
                "-",

              from:
                t.from_stn_name ||
                t.source_stn_name ||
                "-",

              fromCode:
                t.from_stn_code ||
                from,

              to:
                t.to_stn_name ||
                t.dstn_stn_name ||
                "-",

              toCode:
                t.to_stn_code ||
                to,

              departure:
                t.from_time ||
                "-",

              arrival:
                t.to_time ||
                "-",

              travelTime:
                t.travel_time ||
                "-",

              distance:
                t.distance ||
                "-",

              runningDays:
                daysText(
                  t.running_days
                ),

              halts:
                t.halts ?? "-"

            }));

        }


        return json(result);

      }


      /* =================================================
         SEAT AVAILABILITY
      ================================================= */

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
          !/^\d{5}$/.test(trainNo) ||
          !/^[A-Z]{2,5}$/.test(from) ||
          !/^[A-Z]{2,5}$/.test(to)
        ) {

          return json({

            success: false,

            message:
              "Train aur station details invalid hain."

          }, 400);

        }


        if (
          !date ||
          !coach ||
          !quota
        ) {

          return json({

            success: false,

            message:
              "Date, class aur quota required."

          }, 400);

        }


        return json(
          await getAvailability(
            trainNo,
            from,
            to,
            date,
            coach,
            quota
          )
        );

      }


      /* =================================================
         FARE
      ================================================= */

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


        return json(
          await fareLookup(
            trainNo,
            from,
            to,
            date,
            travelClass,
            quota
          )
        );

      }


      /* =================================================
         CANCELLED TRAINS
      ================================================= */

      if (action === "CANCELLED") {

        return json(
          await cancelList()
        );

      }


      /* =================================================
         INVALID ACTION
      ================================================= */

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
