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
  return String(v ?? "").trim().toUpperCase();
}

function dateToRailkit(v) {
  if (!v) return "";

  const s = String(v).trim();

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
}

function stationCode(v) {
  const s = clean(v);

  const match = s.match(/\(([A-Z]{2,5})\)/);

  if (match) return match[1];

  return s;
}

function daysText(days) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const s = String(days ?? "");

  if (!/^[01]{7}$/.test(s)) return s || "-";

  return names
    .filter((_, i) => s[i] === "1")
    .join(", ") || "-";
}

function timeValue(v) {
  if (v == null || v === "") return "-";

  if (typeof v === "string" || typeof v === "number") {
    return String(v);
  }

  if (typeof v === "object") {
    return (
      v.actual ??
      v.expected ??
      v.scheduled ??
      v.time ??
      v.arrival ??
      v.departure ??
      "-"
    );
  }

  return "-";
}

function normalizeTrain(t = {}) {
  return {
    trainNo:
      t.trainNo ??
      t.train_no ??
      t.trainNumber ??
      t.number ??
      "-",

    trainName:
      t.trainName ??
      t.train_name ??
      t.name ??
      "-",

    from:
      t.from_stn_name ??
      t.sourceName ??
      t.fromStationName ??
      t.source_stn_name ??
      "-",

    fromCode:
      t.from_stn_code ??
      t.source_stn_code ??
      t.fromCode ??
      "-",

    to:
      t.to_stn_name ??
      t.destName ??
      t.toStationName ??
      t.dstn_stn_name ??
      "-",

    toCode:
      t.to_stn_code ??
      t.dest_stn_code ??
      t.toCode ??
      "-",

    departure:
      t.from_time ??
      t.departureTime ??
      timeValue(t.departure),

    arrival:
      t.to_time ??
      t.arrivalTime ??
      timeValue(t.arrival),

    travelTime:
      t.travel_time ??
      t.travelTime ??
      "-",

    distance:
      t.distance ??
      "-",

    runningDays:
      daysText(
        t.running_days ??
        t.runningDays
      ),

    platform:
      t.platform ??
      "-"
  };
}

function normalizeStationTrain(t = {}) {
  return {
    trainNo:
      t.trainNo ??
      t.train_no ??
      t.trainNumber ??
      "-",

    trainName:
      t.trainName ??
      t.train_name ??
      t.name ??
      "-",

    from:
      t.sourceName ??
      t.source_stn_name ??
      t.fromStationName ??
      "-",

    to:
      t.destName ??
      t.dstn_stn_name ??
      t.toStationName ??
      "-",

    arrival:
      timeValue(
        t.arrival?.actual ??
        t.arrival?.expected ??
        t.arrival?.scheduled ??
        t.arrival
      ),

    scheduledArrival:
      timeValue(
        t.arrival?.scheduled ??
        t.scheduledArrival
      ),

    departure:
      timeValue(
        t.departure?.actual ??
        t.departure?.expected ??
        t.departure?.scheduled ??
        t.departure
      ),

    scheduledDeparture:
      timeValue(
        t.departure?.scheduled ??
        t.scheduledDeparture
      ),

    delay:
      t.arrival?.delay ??
      t.delay ??
      0,

    platform:
      t.platform ??
      "-"
  };
}

function normalizeLiveTrain(result, trainNo) {
  const d = result?.data ?? result ?? {};

  const timeline =
    Array.isArray(d.timeline)
      ? d.timeline
      : Array.isArray(d.stations)
      ? d.stations
      : Array.isArray(d.route)
      ? d.route
      : [];

  const stations = timeline.map((s, index) => ({
    index,

    stationName:
      s.stationName ??
      s.stnName ??
      s.name ??
      s.station ??
      "-",

    stationCode:
      s.stationCode ??
      s.stnCode ??
      s.code ??
      "-",

    arrivalActual:
      timeValue(
        s.arrival?.actual ??
        s.arrivalActual ??
        s.actualArrival
      ),

    arrivalScheduled:
      timeValue(
        s.arrival?.scheduled ??
        s.arrivalScheduled ??
        s.scheduledArrival
      ),

    departureActual:
      timeValue(
        s.departure?.actual ??
        s.departureActual ??
        s.actualDeparture
      ),

    departureScheduled:
      timeValue(
        s.departure?.scheduled ??
        s.departureScheduled ??
        s.scheduledDeparture
      ),

    arrivalDelay:
      s.arrival?.delay ??
      s.arrivalDelay ??
      0,

    departureDelay:
      s.departure?.delay ??
      s.departureDelay ??
      0,

    platform:
      s.platform ??
      "-"
  }));

  return {
    trainNo:
      d.trainNo ??
      d.trainNumber ??
      trainNo,

    trainName:
      d.trainName ??
      d.name ??
      "-",

    status:
      d.statusNote ??
      d.currentStatus ??
      d.status ??
      d.message ??
      "-",

    currentStation:
      d.currentStation ??
      d.current_station ??
      null,

    nextStation:
      d.nextStation ??
      d.next_station ??
      null,

    current:
      d.current ??
      null,

    next:
      d.next ??
      null,

    stations
  };
}

export default {
  async fetch(request) {
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
            "RAILKIT_API_KEY missing. Vercel Environment Variables check karo."
        }, 500);
      }

      configure(apiKey);

      /* =========================
         PNR
      ========================= */

      if (action === "PNR") {
        const pnr =
          String(
            url.searchParams.get("pnr") || ""
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

        return json(
          await checkPNRStatus(pnr)
        );
      }

      /* =========================
         TRAIN INFO
      ========================= */

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

        const t =
          result?.data?.trainInfo;

        if (t) {
          result.display = {
            trainNo:
              t.train_no ?? trainNo,

            trainName:
              t.train_name ?? "-",

            from:
              t.from_stn_name ?? "-",

            fromCode:
              t.from_stn_code ?? "-",

            to:
              t.to_stn_name ?? "-",

            toCode:
              t.to_stn_code ?? "-",

            departure:
              t.from_time ?? "-",

            arrival:
              t.to_time ?? "-",

            travelTime:
              t.travel_time ?? "-",

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

        return json({
          ...result,
          display:
            normalizeLiveTrain(
              result,
              trainNo
            )
        });
      }

      /* =========================
         HISTORY
      ========================= */

      if (action === "HISTORY") {
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
              "Valid train number enter karo."
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

        const hours =
          Number(
            url.searchParams.get("hours") || 2
          );

        if (!/^[A-Z]{2,5}$/.test(station)) {
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

        const trains =
          Array.isArray(result?.data?.trains)
            ? result.data.trains
            : [];

        return json({
          ...result,

          display: trains.map(
            normalizeStationTrain
          )
        });
      }

      /* =========================
         SEARCH TRAINS
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

        if (!/^[A-Z]{2,5}$/.test(from)) {
          return json({
            success: false,
            message:
              "Invalid From station."
          }, 400);
        }

        if (!/^[A-Z]{2,5}$/.test(to)) {
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

        const data =
          Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.data?.trains)
            ? result.data.trains
            : [];

        return json({
          ...result,

          display:
            data.map(normalizeTrain)
        });
      }

      /* =========================
         SEAT AVAILABILITY
      ========================= */

      if (action === "SEATS") {
        const trainNo =
          clean(
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

        const coach =
          clean(
            url.searchParams.get("coach")
          );

        const quota =
          clean(
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
          !/^[A-Z]{2,5}$/.test(from) ||
          !/^[A-Z]{2,5}$/.test(to)
        ) {
          return json({
            success: false,
            message:
              "Invalid station."
          }, 400);
        }

        if (!date || !coach || !quota) {
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

        const d =
          result?.data ?? {};

        return json({
          ...result,

          display: {
            trainNo:
              d.train?.trainNo ??
              trainNo,

            trainName:
              d.train?.trainName ??
              "-",

            from:
              d.train?.fromStationName ??
              from,

            to:
              d.train?.toStationName ??
              to,

            baseFare:
              d.fare?.baseFare ??
              "-",

            totalFare:
              d.fare?.totalFare ??
              "-",

            availability:
              Array.isArray(d.availability)
                ? d.availability.map(x => ({
                    date:
                      x.date ?? "-",

                    status:
                      x.availabilityText ??
                      x.status ??
                      "-",

                    prediction:
                      x.prediction ??
                      "-"
                  }))
                : []
          }
        });
      }

      /* =========================
         FARE
      ========================= */

      if (action === "FARE") {
        const trainNo =
          clean(
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
            url.searchParams.get("travelClass")
          );

        const quota =
          clean(
            url.searchParams.get("quota")
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

      /* =========================
         CANCELLED TRAINS
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
};
