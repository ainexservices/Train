// api/railway.js

export default async function handler(req, res) {
  try {
    const q = req.query || {};

    const action = String(q.action || "").toLowerCase();

    const API_KEY =
      process.env.IRCTC_API_KEY ||
      "irctc_f376f7ad6c15ef809c464eb0337e6f6020da46de9bdaffce";

    /*
      IMPORTANT:
      Yahan apne API provider ka BASE URL lagana hai.
      Exact provider URL ke bina endpoint guess nahi karna chahiye.
    */
    const API_BASE =
      process.env.IRCTC_API_BASE || "";

    if (!API_BASE) {
      return res.status(500).json({
        success: false,
        error: "IRCTC_API_BASE environment variable missing"
      });
    }

    const endpoints = {
      pnr: "/pnr",
      live: "/live",
      train: "/train",
      search: "/trains",
      station: "/station",
      availability: "/availability",
      fare: "/fare",
      history: "/history",
      cancelled: "/cancelled"
    };

    if (!action || !endpoints[action]) {
      return res.status(400).json({
        success: false,
        error: "Invalid railway action",
        availableActions: Object.keys(endpoints)
      });
    }

    const params = new URLSearchParams();

    /*
      PNR
    */
    if (action === "pnr") {
      if (!/^\d{10}$/.test(String(q.pnr || ""))) {
        return res.status(400).json({
          success: false,
          error: "Please enter valid 10 digit PNR"
        });
      }

      params.set("pnr", q.pnr);
    }

    /*
      TRAIN / LIVE
    */
    if (
      action === "live" ||
      action === "train" ||
      action === "history"
    ) {
      if (!q.train) {
        return res.status(400).json({
          success: false,
          error: "Train number required"
        });
      }

      params.set("train", q.train);

      if (q.date) {
        params.set("date", q.date);
      }
    }

    /*
      BETWEEN STATIONS
    */
    if (action === "search") {
      if (!q.from || !q.to) {
        return res.status(400).json({
          success: false,
          error: "From and To station required"
        });
      }

      params.set("from", q.from);
      params.set("to", q.to);

      if (q.date) {
        params.set("date", q.date);
      }
    }

    /*
      LIVE STATION
    */
    if (action === "station") {
      if (!q.station) {
        return res.status(400).json({
          success: false,
          error: "Station required"
        });
      }

      params.set("station", q.station);
      params.set("hours", q.hours || "2");
    }

    /*
      AVAILABILITY / FARE
    */
    if (
      action === "availability" ||
      action === "fare"
    ) {
      const required = [
        ["train", q.train],
        ["from", q.from],
        ["to", q.to],
        ["date", q.date]
      ];

      for (const [name, value] of required) {
        if (!value) {
          return res.status(400).json({
            success: false,
            error: `${name} is required`
          });
        }

        params.set(name, value);
      }

      if (q.class) {
        params.set("class", q.class);
      }

      if (q.quota) {
        params.set("quota", q.quota);
      }
    }

    /*
      CANCELLED
    */
    if (action === "cancelled" && q.date) {
      params.set("date", q.date);
    }

    const url =
      API_BASE.replace(/\/$/, "") +
      endpoints[action] +
      (params.toString()
        ? "?" + params.toString()
        : "");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-API-Key": API_KEY,
        "Authorization": `Bearer ${API_KEY}`
      }
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw: text
      };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.message ||
          data?.error ||
          "Railway API request failed",
        providerResponse: data
      });
    }

    return res.status(200).json({
      success: true,
      action,
      data
    });

  } catch (error) {
    console.error("Railway API Error:", error);

    return res.status(500).json({
      success: false,
      error: "Railway service temporarily unavailable",
      message: error.message
    });
  }
}
