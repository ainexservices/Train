async function loadStations() {

  const sources = [
    "/station.json?v=" + Date.now(),
    "https://raw.githubusercontent.com/ainexservices/Train/main/station.json"
  ];

  let loaded = false;

  for (const url of sources) {

    try {

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) continue;

      const data = await response.json();

      const list = Array.isArray(data)
        ? data
        : data?.stations;

      if (!Array.isArray(list) || !list.length) {
        continue;
      }

      stations = [];
      stationMap.clear();

      list.forEach(item => {

        const code = String(
          item?.stnCode ||
          item?.stationCode ||
          item?.code ||
          ""
        ).trim().toUpperCase();

        if (!code) return;

        const station = {
          stnCode: code,

          stnName: String(
            item?.stnName ||
            item?.stationName ||
            item?.name ||
            code
          ).trim(),

          stnCity: String(
            item?.stnCity ||
            item?.city ||
            item?.stnName ||
            item?.stationName ||
            code
          ).trim()
        };

        if (!stationMap.has(code)) {
          stationMap.set(code, station);
          stations.push(station);
        }

      });

      if (stations.length > 0) {

        loaded = true;

        console.log(
          "✅ Stations loaded:",
          stations.length
        );

        break;
      }

    } catch (error) {

      console.warn(
        "Station source failed:",
        url,
        error
      );

    }
  }

  /*
     Final fallback — important stations.
     Agar dono JSON source temporarily fail
     ho jayein tab bhi autocomplete completely
     band nahi hoga.
  */

  if (!loaded) {

    const fallback = [
      ["NDLS","New Delhi","New Delhi"],
      ["DLI","Delhi Junction","Delhi"],
      ["LKO","Lucknow Charbagh","Lucknow"],
      ["LJN","Lucknow Junction","Lucknow"],
      ["GKP","Gorakhpur Junction","Gorakhpur"],
      ["BST","Basti","Basti"],
      ["BV","Babhnan","Babhnan"],
      ["AYC","Ayodhya Cantt","Ayodhya"],
      ["AY","Ayodhya Dham Junction","Ayodhya"],
      ["GD","Gonda Junction","Gonda"],
      ["CNB","Kanpur Central","Kanpur"],
      ["PRYJ","Prayagraj Junction","Prayagraj"],
      ["BSB","Varanasi Junction","Varanasi"],
      ["PNBE","Patna Junction","Patna"],
      ["HWH","Howrah Junction","Kolkata"],
      ["SDAH","Sealdah","Kolkata"],
      ["CSMT","Chhatrapati Shivaji Maharaj Terminus","Mumbai"],
      ["LTT","Lokmanya Tilak Terminus","Mumbai"],
      ["BVI","Borivali","Mumbai"],
      ["ADI","Ahmedabad Junction","Ahmedabad"],
      ["BRC","Vadodara Junction","Vadodara"],
      ["ST","Surat","Surat"],
      ["JP","Jaipur Junction","Jaipur"],
      ["AII","Ajmer Junction","Ajmer"],
      ["AGC","Agra Cantt","Agra"],
      ["BPL","Bhopal Junction","Bhopal"],
      ["JBP","Jabalpur Junction","Jabalpur"],
      ["NGP","Nagpur Junction","Nagpur"],
      ["PUNE","Pune Junction","Pune"],
      ["MAS","Chennai Central","Chennai"],
      ["SBC","KSR Bengaluru City Junction","Bengaluru"],
      ["HYB","Hyderabad Deccan","Hyderabad"],
      ["SC","Secunderabad Junction","Secunderabad"]
    ];

    fallback.forEach(item => {

      const station = {
        stnCode: item[0],
        stnName: item[1],
        stnCity: item[2]
      };

      stationMap.set(
        station.stnCode,
        station
      );

      stations.push(station);

    });

    console.log(
      "⚠️ Fallback stations loaded:",
      stations.length
    );
  }

  setupAutocomplete();
}
