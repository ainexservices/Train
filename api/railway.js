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

const response = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

const clean = v => String(v ?? "").trim().toUpperCase();

const dateFormat = v => {
  const s = String(v ?? "").trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
};

const station = v => {
  const aliases = {
    BV: "BV",
    BABHNAN: "BV",

    AYC: "AYC",
    AYODHYA: "AYC",
    "AYODHYA CANTT": "AYC",

    AY: "AY",
    "AYODHYA DHAM": "AY",

    GKP: "GKP",
    GORAKHPUR: "GKP",
    "GORAKHPUR JN": "GKP",

    BST: "BST",
    BASTI: "BST",

    LKO: "LKO",
    LUCKNOW: "LKO",

    GD: "GD",
    GONDA: "GD",
    "GONDA JN": "GD",

    BSB: "BSB",
    VARANASI: "BSB",
    "VARANASI JN": "BSB",

    PRYJ: "PRYJ",
    PRAYAGRAJ: "PRYJ",
    "PRAYAGRAJ JN": "PRYJ",

    CNB: "CNB",
    KANPUR: "CNB",
    "KANPUR CENTRAL": "CNB",

    NDLS: "NDLS",
    "NEW DELHI": "NDLS",

    DLI: "DLI",
    DELHI: "DLI",

    PNBE: "PNBE",
    PATNA: "PNBE",
    "PATNA JN": "PNBE",

    LTT: "LTT",
    "LOKMANYA TILAK TERMINUS": "LTT",

    ASR: "ASR",
    AMRITSAR: "ASR",
    "AMRITSAR JN": "ASR"
  };

  const x = clean(v);
  return aliases[x] || x;
};

const trainOK = v => /^\d{5}$/.test(clean(v));
const stationOK = v => /^[A-Z]{2,5}$/.test(clean(v));

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const action = clean(url.searchParams.get("action"));

      /* API KEY FROM VERCEL */
      const apiKey = process.env.RAILKIT_API_KEY;

      if (!apiKey) {
        return response({
          success: false,
          message:
            "RAILKIT_API_KEY missing. Vercel Environment Variables me API key add karo."
        }, 500);
      }

      configure(apiKey);

      /* PNR */
      if (action === "PNR") {
        const pnr = String(
          url.searchParams.get("pnr") || ""
        ).replace(/\D/g, "");

        if (!/^\d{10}$/.test(pnr)) {
          return response({
            success: false,
            message: "10 digit PNR enter karo."
          }, 400);
        }

        return response(await checkPNRStatus(pnr));
      }

      /* TRAIN INFO */
      if (action === "TRAIN") {
        const trainNo = clean(
          url.searchParams.get("trainNo")
        );

        if (!trainOK(trainNo)) {
          return response({
            success: false,
            message: "5 digit train number enter karo."
          }, 400);
        }

        return response(await getTrainInfo(trainNo));
      }

      /* LIVE TRAIN */
      if (action === "LIVE") {
        const trainNo = clean(
          url.searchParams.get("trainNo")
        );

        const date = dateFormat(
          url.searchParams.get("date")
        );

        if (!trainOK(trainNo)) {
          return response({
            success: false,
            message: "5 digit train number enter karo."
          }, 400);
        }

        if (!date) {
          return response({
            success: false,
            message: "Journey date required."
          }, 400);
        }

        return response(
          await trackTrain(trainNo, date)
        );
      }

      /* HISTORY */
      if (action === "HISTORY") {
        const trainNo = clean(
          url.searchParams.get("trainNo")
        );

        const date = dateFormat(
          url.searchParams.get("date")
        );

        if (!trainOK(trainNo) || !date) {
          return response({
            success: false,
            message: "Train number aur date required."
          }, 400);
        }

        return response(
          await getTrainHistory(trainNo, date)
        );
      }

      /* LIVE STATION */
      if (action === "STATION") {
        const code = station(
          url.searchParams.get("station")
        );

        const hours = Number(
          url.searchParams.get("hours") || 2
        );

        if (!stationOK(code)) {
          return response({
            success: false,
            message: "Valid station select karo."
          }, 400);
        }

        if (![2, 4, 8].includes(hours)) {
          return response({
            success: false,
            message: "Hours 2, 4 ya 8 hona chahiye."
          }, 400);
        }

        return response(
          await liveAtStation(code, hours)
        );
      }

      /* TRAIN SEARCH */
      if (action === "SEARCH") {
        const from = station(
          url.searchParams.get("from")
        );

        const to = station(
          url.searchParams.get("to")
        );

        const date = dateFormat(
          url.searchParams.get("date")
        );

        if (!stationOK(from) || !stationOK(to)) {
          return response({
            success: false,
            message: "From aur To station valid nahi hai."
          }, 400);
        }

        if (from === to) {
          return response({
            success: false,
            message: "From aur To same nahi ho sakte."
          }, 400);
        }

        return response(
          await searchTrainBetweenStations(
            from,
            to,
            date || undefined
          )
        );
      }

      /* SEAT AVAILABILITY */
      if (action === "SEATS") {
        const trainNo = clean(
          url.searchParams.get("trainNo")
        );

        const from = station(
          url.searchParams.get("from")
        );

        const to = station(
          url.searchParams.get("to")
        );

        const date = dateFormat(
          url.searchParams.get("date")
        );

        const coach = clean(
          url.searchParams.get("coach")
        );

        const quota = clean(
          url.searchParams.get("quota")
        );

        if (!trainOK(trainNo)) {
          return response({
            success: false,
            message: "Invalid train number."
          }, 400);
        }

        if (!stationOK(from) || !stationOK(to)) {
          return response({
            success: false,
            message: "Invalid station."
          }, 400);
        }

        if (!date || !coach || !quota) {
          return response({
            success: false,
            message: "Date, class aur quota required."
          }, 400);
        }

        return response(
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

      /* FARE */
      if (action === "FARE") {
        const trainNo = clean(
          url.searchParams.get("trainNo")
        );

        const from = station(
          url.searchParams.get("from")
        );

        const to = station(
          url.searchParams.get("to")
        );

        const date = dateFormat(
          url.searchParams.get("date")
        );

        const travelClass = clean(
          url.searchParams.get("travelClass")
        );

        const quota = clean(
          url.searchParams.get("quota")
        );

        if (
          !trainOK(trainNo) ||
          !stationOK(from) ||
          !stationOK(to) ||
          !date ||
          !travelClass ||
          !quota
        ) {
          return response({
            success: false,
            message: "Fare details incomplete hain."
          }, 400);
        }

        return response(
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

      /* CANCELLED TRAINS */
      if (action === "CANCELLED") {
        return response(
          await cancelList()
        );
      }

      return response({
        success: false,
        message: "Invalid railway service."
      }, 400);

    } catch (error) {
      console.error("AINEX RAILWAY ERROR:", error);

      return response({
        success: false,
        message:
          error?.message ||
          "Railway API request failed."
      }, 500);
    }
  }
};
