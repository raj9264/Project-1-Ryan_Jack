const http = require("http");
const countries = require("./data");

const PORT = process.env.PORT || 3000;

//Sends a JSON response to the client
function sendResponse(res, statusCode, data, sendBody = true) {
  const response = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(response),
  });

  if (sendBody) {
    res.end(response);
  } else {
    res.end();
  }
}

//Find country using name
function findCountry(name) {
  return countries.find(
    (country) => country.name.toLowerCase() === name.toLowerCase()
  );
}

//Parse request body
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const contentType = req.headers["content-type"];

        if (contentType === "application/json") {
          resolve(JSON.parse(body));
        } else if (
          contentType === "application/x-www-form-urlencoded"
        ) {
          const params = new URLSearchParams(body);
          resolve(Object.fromEntries(params));
        } else {
          reject(new Error("Unsupported Content-Type"));
        }
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  //GET/HEAD all countries with optional filtering
  if (
    pathname === "/api/countries" &&
    (req.method === "GET" || req.method === "HEAD")
  ) {
    let results = countries;

    const region = url.searchParams.get("region");
    const subregion = url.searchParams.get("subregion");
    const currency = url.searchParams.get("currency");
    const limit = url.searchParams.get("limit");

    if (region) {
      results = results.filter(
        (country) => country.region.toLowerCase() === region.toLowerCase()
      );
    }

    if (subregion) {
      results = results.filter(
        (country) =>
          country.subregion.toLowerCase() === subregion.toLowerCase()
      );
    }

    if (currency) {
      results = results.filter(
        (country) =>
          country.finance.currency.toLowerCase() === currency.toLowerCase()
      );
    }

    if (limit) {
      const limitNumber = Number.parseInt(limit, 10);

      if (Number.isNaN(limitNumber) || limitNumber < 1) {
        sendResponse(res, 400, {
          id: "invalidLimit",
          message: "The limit must be a positive number.",
        });
        return;
      }

      results = results.slice(0, limitNumber);
    }

    sendResponse(res, 200, results, req.method === "GET");
    return;
  }

  //GET/HEAD all unique regions
  if (
    pathname === "/api/regions" &&
    (req.method === "GET" || req.method === "HEAD")
  ) {
    const regions = [...new Set(countries.map((country) => country.region))];

    sendResponse(res, 200, regions, req.method === "GET");
    return;
  }

  //GET/HEAD  timezone for a country
  if (
    pathname.endsWith("/timezones") &&
    (req.method === "GET" || req.method === "HEAD")
  ) {
    const parts = pathname.split("/");

    if (
      parts.length === 5 &&
      parts[1] === "api" &&
      parts[2] === "countries" &&
      parts[4] === "timezones"
    ) {
      const name = decodeURIComponent(parts[3]);
      const country = findCountry(name);

      if (!country) {
        sendResponse(res, 404, {
          id: "countryNotFound",
          message: "The requested country was not found.",
        });
        return;
      }

      sendResponse(
        res,
        200,
        country.timezones,
        req.method === "GET"
      );
      return;
    }
  }

  //GET/HEAD one country using name
  if (
    pathname.startsWith("/api/countries/") &&
    (req.method === "GET" || req.method === "HEAD")
  ) {
    const name = decodeURIComponent(
      pathname.substring("/api/countries/".length)
    );

    const country = findCountry(name);

    if (!country) {
      sendResponse(res, 404, {
        id: "countryNotFound",
        message: "The requested country was not found.",
      });
      return;
    }

    sendResponse(res, 200, country, req.method === "GET");
    return;
  }

  //Adds a new country
  if (pathname === "/api/countries" && req.method === "POST") {
    try {
      const country = await getRequestBody(req);

      if (
        !country.name ||
        !country.capital ||
        !country.region ||
        !country.subregion ||
        !country.finance
      ) {
        sendResponse(res, 400, {
          id: "missingCountryData",
          message: "Required country data is missing.",
        });
        return;
      }

      if (findCountry(country.name)) {
        sendResponse(res, 400, {
          id: "countryExists",
          message: "That country already exists.",
        });
        return;
      }

      countries.push(country);

      sendResponse(res, 201, country);
      return;
    } catch {
      sendResponse(res, 400, {
        id: "invalidRequest",
        message: "The request body could not be parsed.",
      });
      return;
    }
  }

  //Edit an existing country
  if (
    pathname.startsWith("/api/countries/") &&
    req.method === "POST"
  ) {
    const name = decodeURIComponent(
      pathname.substring("/api/countries/".length)
    );

    const country = findCountry(name);

    if (!country) {
      sendResponse(res, 404, {
        id: "countryNotFound",
        message: "The requested country was not found.",
      });
      return;
    }

    try {
      const updates = await getRequestBody(req);

      Object.assign(country, updates);

      res.writeHead(204, {
        "Content-Type": "application/json",
        "Content-Length": 0,
      });

      res.end();
      return;
    } catch {
      sendResponse(res, 400, {
        id: "invalidRequest",
        message: "The request body could not be parsed.",
      });
      return;
    }
  }

  //No endpoint found
  sendResponse(res, 404, {
    id: "notFound",
    message: "The requested endpoint was not found.",
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});