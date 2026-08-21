// api/railway.js

const API_KEY =
  process.env.IRCTC_API_KEY ||
  "irctc_f376f7ad6c15ef809c464eb0337e6f6020da46de9bdaffce";

const BASE =
  "https://indianrailapi.com/api/v2";

function json(res, status, data) {
  res.status(status).json(data);
}

function clean(v) {
  return String(v || "").trim();
}

function dateYYYYMMDD(value) {
  const d = clean(value);

  if (/^\d{8}$/.test(d)) return d;

  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d.replaceAll("-", "");
  }

  return "";
}

async function callAPI(path) {
  const url =
    `${BASE}${path}` +
    `${path.includes("?") ? "&" : "?"}apikey=${encodeURIComponent(API_KEY)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      Status: "ERROR",
      Message: text
    };
  }

  if (!response.ok) {
    const error = new Error(
      data?.Message ||
      data?.message ||
      `API Error ${response.status}`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

export default async function handler(req, res) {

  try {

    const q = req.query || {};

    const action = clean(q.action).toLowerCase();

    /* =========================
       PNR STATUS
    ========================= */

    if (action === "pnr") {

      const pnr = clean(
        q.pnr ||
        q.pnrNumber
      );

      if (!/^\d{10}$/.test(pnr)) {
        return json(res, 400, {
          success: false,
          error: "Please enter valid 10 digit PNR."
        });
      }

      const data = await callAPI(
        `/PNRCheck/apikey/${encodeURIComponent(API_KEY)}/PNRNumber/${pnr}/Route/1/`
      );

      return json(res, 200, {
        success: true,
        type: "pnr",
        data
      });
    }


    /* =========================
       LIVE TRAIN STATUS
    ========================= */

    if (action === "live") {

      const train = clean(
        q.train ||
        q.trainNumber
      );

      const date = dateYYYYMMDD(
        q.date ||
        q.journeyDate
      );

      if (!/^\d{5}$/.test(train)) {
        return json(res, 400, {
          success: false,
          error: "Valid 5 digit train number required."
        });
      }

      if (!date) {
        return json(res, 400, {
          success: false,
          error: "Journey date required."
        });
      }

      const data = await callAPI(
        `/livetrainstatus/apikey/${encodeURIComponent(API_KEY)}/trainnumber/${encodeURIComponent(train)}/date/${date}/`
      );

      return json(res, 200, {
        success: true,
        type: "live",
        data
      });
    }


    /* =========================
       TRAIN INFORMATION
    ========================= */

    if (action === "train") {

      const train = clean(
        q.train ||
        q.trainNumber
      );

      if (!/^\d{5}$/.test(train)) {
        return json(res, 400, {
          success: false,
          error: "Valid 5 digit train number required."
        });
      }

      const data = await callAPI(
        `/TrainInformation/apikey/${encodeURIComponent(API_KEY)}/TrainNumber/${encodeURIComponent(train)}/`
      );

      return json(res, 200, {
        success: true,
        type: "train",
        data
      });
    }


    /* =========================
       TRAINS BETWEEN STATIONS
    ========================= */

    if (action === "search") {

      const from = clean(
        q.from ||
        q.fromStation
      ).toUpperCase();

      const to = clean(
        q.to ||
        q.toStation
      ).toUpperCase();

      if (!from || !to) {
        return json(res, 400, {
          success: false,
          error: "From and To station required."
        });
      }

      const data = await callAPI(
        `/TrainBetweenStation/apikey/${encodeURIComponent(API_KEY)}/From/${encodeURIComponent(from)}/To/${encodeURIComponent(to)}`
      );

      return json(res, 200, {
        success: true,
        type: "search",
        data
      });
    }


    /* =========================
       LIVE STATION
    ========================= */

    if (action === "station") {

      const station = clean(
        q.station ||
        q.stationCode
      ).toUpperCase();

      const hours = clean(
        q.hours ||
        q.stationHours ||
        "2"
      );

      if (!station) {
        return json(res, 400, {
          success: false,
          error: "Station code required."
        });
      }

      if (!["2", "4"].includes(hours)) {
        return json(res, 400, {
          success: false,
          error: "Time window must be 2 or 4 hours."
        });
      }

      const data = await callAPI(
        `/LiveStation/apikey/${encodeURIComponent(API_KEY)}/StationCode/${encodeURIComponent(station)}/hours/${hours}/`
      );

      return json(res, 200, {
        success: true,
        type: "station",
        data
      });
    }


    /* =========================
       SEAT AVAILABILITY
    ========================= */

    if (action === "availability" || action === "seats") {

      const train = clean(
        q.train ||
        q.trainNumber
      );

      const from = clean(
        q.from ||
        q.fromStation
      ).toUpperCase();

      const to = clean(
        q.to ||
        q.toStation
      ).toUpperCase();

      const date = dateYYYYMMDD(
        q.date ||
        q.journeyDate
      );

      const classCode = clean(
        q.class ||
        q.classCode
      ).toUpperCase();

      const quota = clean(
        q.quota ||
        "GN"
      ).toUpperCase();

      if (!/^\d{5}$/.test(train)) {
        return json(res, 400, {
          success: false,
          error: "Valid train number required."
        });
      }

      if (!from || !to) {
        return json(res, 400, {
          success: false,
          error: "From and To station required."
        });
      }

      if (!date) {
        return json(res, 400, {
          success: false,
          error: "Journey date required."
        });
      }

      if (!classCode) {
        return json(res, 400, {
          success: false,
          error: "Class required."
        });
      }

      const data = await callAPI(
        `/SeatAvailability/apikey/${encodeURIComponent(API_KEY)}/TrainNumber/${encodeURIComponent(train)}/From/${encodeURIComponent(from)}/To/${encodeURIComponent(to)}/Date/${date}/Quota/${encodeURIComponent(quota)}/Class/${encodeURIComponent(classCode)}`
      );

      return json(res, 200, {
        success: true,
        type: "availability",
        data
      });
    }


    /* =========================
       FARE
    ========================= */

    if (action === "fare") {

      const train = clean(
        q.train ||
        q.trainNumber
      );

      const from = clean(
        q.from ||
        q.fromStation
      ).toUpperCase();

      const to = clean(
        q.to ||
        q.toStation
      ).toUpperCase();

      const quota = clean(
        q.quota ||
        "GN"
      ).toUpperCase();

      if (!/^\d{5}$/.test(train)) {
        return json(res, 400, {
          success: false,
          error: "Valid train number required."
        });
      }

      if (!from || !to) {
        return json(res, 400, {
          success: false,
          error: "From and To station required."
        });
      }

      const data = await callAPI(
        `/TrainFare/apikey/${encodeURIComponent(API_KEY)}/TrainNumber/${encodeURIComponent(train)}/From/${encodeURIComponent(from)}/To/${encodeURIComponent(to)}/Quota/${encodeURIComponent(quota)}`
      );

      return json(res, 200, {
        success: true,
        type: "fare",
        data
      });
    }


    /* =========================
       STATION SEARCH
    ========================= */

    if (action === "stationsearch") {

      const text = clean(
        q.text ||
        q.search ||
        q.station
      );

      if (!text) {
        return json(res, 400, {
          success: false,
          error: "Station search text required."
        });
      }

      const data = await callAPI(
        `/StationCodeOrName/apikey/${encodeURIComponent(API_KEY)}/SearchText/${encodeURIComponent(text)}/`
      );

      return json(res, 200, {
        success: true,
        type: "stationsearch",
        data
      });
    }


    /* =========================
       TRAIN HISTORY
    ========================= */

    if (action === "history") {

      const train = clean(
        q.train ||
        q.trainNumber
      );

      if (!/^\d{5}$/.test(train)) {
        return json(res, 400, {
          success: false,
          error: "Valid train number required."
        });
      }

      /*
       * Indian Rail API me standard TrainSchedule
       * route/schedule endpoint available hai.
       */

      const data = await callAPI(
        `/TrainSchedule/apikey/${encodeURIComponent(API_KEY)}/TrainNumber/${encodeURIComponent(train)}/`
      );

      return json(res, 200, {
        success: true,
        type: "history",
        data
      });
    }


    /* =========================
       CANCELLED TRAINS
    ========================= */

    if (action === "cancelled") {

      return json(res, 200, {
        success: false,
        type: "cancelled",
        error:
          "Cancelled train endpoint is not available in the documented Indian Rail API collection."
      });
    }


    /* =========================
       INVALID ACTION
    ========================= */

    return json(res, 400, {
      success: false,
      error: "Invalid action.",
      availableActions: [
        "pnr",
        "live",
        "train",
        "search",
        "station",
        "availability",
        "fare",
        "stationsearch",
        "history",
        "cancelled"
      ]
    });

  } catch (error) {

    console.error("RAILWAY API ERROR:", error);

    return json(res, error.status || 500, {
      success: false,
      error:
        error?.data?.Message ||
        error?.data?.message ||
        error.message ||
        "Railway API request failed.",
      providerResponse: error.data || null
    });
  }
}
