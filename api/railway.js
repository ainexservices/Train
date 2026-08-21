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

function clean(v) {
  return String(v || "").trim().toUpperCase();
}

function dateToRailkit(v) {
  if (!v) return "";

  const s = String(v);

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return m
    ? `${m[3]}-${m[2]}-${m[1]}`
    : s;
}

function stationCode(v) {
  return clean(v);
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

  return (
    names
      .filter((_, i) => s[i] === "1")
      .join(", ") ||
    "No running day"
  );
}

export default async function handler(request) {

  try {

    const url = new URL(request.url);

    const action = clean(
      url.searchParams.get("action")
    );

    const apiKey =
      process.env.RAILKIT_API_KEY;

    if (!apiKey) {
      return json({
        success: false,
        message:
          "RAILKIT_API_KEY missing. Vercel Environment Variables me key add karo."
      }, 500);
    }

    configure(apiKey);

    /* =========================
       PNR
    ========================= */

    if (action === "PNR") {

      const pnr = String(
        url.searchParams.get("pnr") || ""
      ).replace(/\D/g, "");

      if (!/^\d{10}$/.test(pnr)) {
        return json({
          success: false,
          message:
            "Please enter valid 10 digit PNR."
        }, 400);
      }

      const result =
        await checkPNRStatus(pnr);

      return json(result);
    }

    /* =========================
       TRAIN INFO
    ========================= */

    if (action === "TRAIN") {

      const trainNo = clean(
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

        result.display = {
          trainNo:
            t.train_no || trainNo,

          trainName:
            t.train_name || "-",

          from:
            t.from_stn_name || "-",

          fromCode:
            t.from_stn_code || "-",

          to:
            t.to_stn_name || "-",

          toCode:
            t.to_stn_code || "-",

          departure:
            t.from_time || "-",

          arrival:
            t.to_time || "-",

          travelTime:
            t.travel_time || "-",

          runningDays:
            daysText(t.running_days)
        };
      }

      return json(result);
    }

    /* =========================
       LIVE TRAIN
    ========================= */

    if (action === "LIVE") {

      const trainNo = clean(
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

      return json(
        await trackTrain(
          trainNo,
          date
        )
      );
    }

    /* =========================
       HISTORY
    ========================= */

    if (action === "HISTORY") {

      const trainNo = clean(
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

    /* =========================
       LIVE STATION
    ========================= */

    if (action === "STATION") {

      const station =
        stationCode(
          url.searchParams.get("station")
        );

      const hours = Number(
        url.searchParams.get("hours") || 2
      );

      if (!/^[A-Z]{1,5}$/.test(station)) {
        return json({
          success: false,
          message:
            "Valid station code enter karo."
        }, 400);
      }

      if (![2, 4, 8].includes(hours)) {
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
       SEARCH
    ========================= */

    if (action === "SEARCH") {

      const from =
        stationCode(
          url.searchParams.get("from")
        );

      const to =
        stationCode(
          url.searchParams.get("to")
        );

      const date =
        dateToRailkit(
          url.searchParams.get("date")
        );

      if (!/^[A-Z]{1,5}$/.test(from)) {
        return json({
          success: false,
          message:
            "Invalid From station."
        }, 400);
      }

      if (!/^[A-Z]{1,5}$/.test(to)) {
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
            "From aur To station same nahi ho sakte."
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
        Array.isArray(result.data)
      ) {

        result.display =
          result.data.map(t => ({
            trainNo:
              t.train_no || "-",

            trainName:
              t.train_name || "-",

            from:
              t.from_stn_name ||
              t.source_stn_name ||
              "-",

            fromCode:
              t.from_stn_code ||
              t.source_stn_code ||
              from,

            to:
              t.to_stn_name ||
              t.dstn_stn_name ||
              "-",

            toCode:
              t.to_stn_code ||
              t.dstn_stn_code ||
              to,

            departure:
              t.from_time || "-",

            arrival:
              t.to_time || "-",

            travelTime:
              t.travel_time || "-",

            distance:
              t.distance || "-",

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

    /* =========================
       SEAT AVAILABILITY
    ========================= */

    if (action === "SEATS") {

      const trainNo = clean(
        url.searchParams.get("trainNo")
      );

      const from =
        stationCode(
          url.searchParams.get("from")
        );

      const to =
        stationCode(
          url.searchParams.get("to")
        );

      const date =
        dateToRailkit(
          url.searchParams.get("date")
        );

      const coach = clean(
        url.searchParams.get("coach")
      );

      const quota = clean(
        url.searchParams.get("quota")
      );

      if (!/^\d{5}$/.test(trainNo)) {
        return json({
          success: false,
          message:
            "Invalid train number."
        }, 400);
      }

      if (
        !/^[A-Z]{1,5}$/.test(from) ||
        !/^[A-Z]{1,5}$/.test(to)
      ) {
        return json({
          success: false,
          message:
            "Invalid station."
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

      const result =
        await getAvailability(
          trainNo,
          from,
          to,
          date,
          coach,
          quota
        );

      if (
        result?.success &&
        result?.data
      ) {

        const d =
          result.data;

        result.display = {
          trainNo:
            d.train?.trainNo ||
            trainNo,

          trainName:
            d.train?.trainName ||
            "-",

          from:
            d.train?.fromStationName ||
            from,

          to:
            d.train?.toStationName ||
            to,

          baseFare:
            d.fare?.baseFare ?? "-",

          totalFare:
            d.fare?.totalFare ?? "-",

          availability:
            Array.isArray(
              d.availability
            )
              ? d.availability.map(x => ({
                  date:
                    x.date || "-",

                  status:
                    x.availabilityText ||
                    "-",

                  prediction:
                    x.prediction || "-"
                }))
              : []
        };
      }

      return json(result);
    }

    /* =========================
       FARE
    ========================= */

    if (action === "FARE") {

      const trainNo = clean(
        url.searchParams.get("trainNo")
      );

      const from =
        stationCode(
          url.searchParams.get("from")
        );

      const to =
        stationCode(
          url.searchParams.get("to")
        );

      const date =
        dateToRailkit(
          url.searchParams.get("date")
        );

      const travelClass =
        clean(
          url.searchParams.get(
            "travelClass"
          )
        );

      const quota =
        clean(
          url.searchParams.get("quota")
        );

      if (
        !/^\d{5}$/.test(trainNo) ||
        !/^[A-Z]{1,5}$/.test(from) ||
        !/^[A-Z]{1,5}$/.test(to) ||
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

    /* =========================
       CANCELLED
    ========================= */

    if (action === "CANCELLED") {
      return json(
        await cancelList()
      );
    }

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
