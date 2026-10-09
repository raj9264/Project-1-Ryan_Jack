const http = require("http");
const countries = require("./data");
const path = require("path");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, "public");

//Sends a JSON response to the client
function sendResponse(res, statusCode, data, sendBody = true) {
  const response = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(response),
  });

  res.end(sendBody ? response : undefined);
}

//Find country using name
function findCountry(name) {
  return countries.find(
    (country) => country.name.toLowerCase() === name.toLowerCase()
  );
}

//Converts dotted form fields into nested objects
function setNestedValue(target, key, value) {
  const parts = key.replace(/\]/g, "").split(/[.[]/);
  let current = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    if (!current[parts[index]] || typeof current[parts[index]] !== "object") {
      current[parts[index]] = {};
    }
    current = current[parts[index]];
  }

  current[parts[parts.length - 1]] = value;
}

//Parse request body
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      const contentType = (req.headers["content-type"] || "")
        .split(";")[0]
        .trim()
        .toLowerCase();

      try {
        if (contentType === "application/json") {
          const parsed = JSON.parse(body);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            reject(new Error("The JSON body must be an object."));
            return;
          }
          resolve(parsed);
        } else if (contentType === "application/x-www-form-urlencoded") {
          const params = new URLSearchParams(body);
          const parsed = {};
          for (const [key, value] of params.entries()) {
            setNestedValue(parsed, key, value);
          }
          resolve(parsed);
        } else {
          const error = new Error("Unsupported Content-Type");
          error.statusCode = 415; //looked up this error type
          reject(error);
        }
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}


function serveStaticFile(res, fileName) {
  const filePath = path.join(publicDirectory, fileName);
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      sendResponse(res, 404, {
        id: "notFound",
        message: "The requested page was not found.",
      });
      return;
    }

    const extension = path.extname(fileName);
    const contentTypes = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".svg": "image/svg+xml",
    };

    res.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "Content-Length": contents.length,
    });
    res.end(contents);
  });
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  } catch {
    sendResponse(res, 400, {
      id: "invalidUrl",
      message: "The request URL is invalid.",
    }, req.method !== "HEAD");
    return;
  }

  const pathname = url.pathname;
  const isReadMethod = req.method === "GET" || req.method === "HEAD";


  if (isReadMethod && pathname === "/") {
    serveStaticFile(res, "index.html");
    return;
  }
  if (isReadMethod && (pathname === "/docs" || pathname === "/docs/")) {
    serveStaticFile(res, "docs.html");
    return;
  }
  if (isReadMethod && ["/styles.css", "/app.js"].includes(pathname)) {
    serveStaticFile(res, pathname.substring(1));
    return;
  }



  //GET/HEAD all countries with a filter
  if (pathname === "/api/countries" && isReadMethod) {
    let results = countries;
    const nameFilter = url.searchParams.get("name");
    const region = url.searchParams.get("region");
    const subregion = url.searchParams.get("subregion");
    const currency = url.searchParams.get("currency");
    const limit = url.searchParams.get("limit");


    if (nameFilter) {
      results = results.filter(
        (country) => country.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

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
          country.finance && country.finance.currency && country.finance.currency.toLowerCase() === currency.toLowerCase()
      );
    }

    if (limit !== null) {
      const limitNumber = Number.parseInt(limit, 10);

      if (!Number.isInteger(limitNumber) || limitNumber < 1) {
        sendResponse(res, 400, {
          id: "invalidLimit",
          message: "The limit must be a positive number.",
        }, req.method !== "HEAD");
        return;
      }

      results = results.slice(0, limitNumber);
    }

    sendResponse(res, 200, results, req.method !== "HEAD");
    return;
  }

  //GET/HEAD all unique regions
  if ( pathname === "/api/regions" && isReadMethod) {
    const regions = [...new Set(countries.map((country) => country.region))];

    sendResponse(res, 200, regions, req.method !== "HEAD");
    return;
  }

  //GET/HEAD  timezone for a country
  const timezoneMatch = pathname.match(/^\/api\/countries\/([^/]+)\/timezones$/);
  if (timezoneMatch && isReadMethod) {

    let name;
    try {
      name = decodeURIComponent(timezoneMatch[1]);
    } catch {
      sendResponse(res, 400, {
        id: "invalidCountryName",
        message: "The country name is not properly URL-encoded.",
      }, req.method !== "HEAD");
      return;
    }
      
      const country = findCountry(name);
      if (!country) {
        sendResponse(res, 404, {
          id: "countryNotFound",
          message: "The requested country was not found.",
        }, req.method !== "HEAD");
        return;
      }

      sendResponse(
        res,
        200,
        country.timezones,
        req.method !== "HEAD"
      );
      return;
  }

  //GET/HEAD one country using name
  const countryMatch = pathname.match(/^\/api\/countries\/([^/]+)$/);
  if (countryMatch && isReadMethod) {
    let name;
    try {name = decodeURIComponent(countryMatch[1]);}
    catch {
      sendResponse(res, 400, {
        id: "invalidCountryName",
        message: "The country name is not properly URL-encoded.",
      }, req.method !== "HEAD");
      return;
    }

    const country = findCountry(name);

    if (!country) {
      sendResponse(res, 404, {
        id: "countryNotFound",
        message: "The requested country was not found.",
      }, req.method !== "HEAD");
      return;
    }

    sendResponse(res, 200, country, req.method !== "HEAD");
    return;
  }

  //Adds a new country
  if (pathname === "/api/countries" && req.method === "POST") {
    try {
      const country = await getRequestBody(req);

      if (
        typeof country.name !== "string" || !country.name.trim()
        || typeof country.capital !== "string" || !country.capital.trim()
        || typeof country.region !== "string" || !country.region.trim()
        || typeof country.subregion !== "string" || !country.subregion.trim()
        || !country.finance || typeof country.finance !== "object"
        || typeof country.finance.currency !== "string"
        || !country.finance.currency.trim()
      ) {
        sendResponse(res, 400, {
          id: "missingCountryData",
          message: "Name, capital, region, subregion, and finance.currency are required.", //more specific
        });
        return;
      }

      if (findCountry(country.name.trim())) {
        sendResponse(res, 400, {
          id: "countryExists",
          message: "That country already exists.",
        });
        return;
      }


      country.name = country.name.trim();
      countries.push(country);

      sendResponse(res, 201, country);
      return;
    } catch (error) {
      sendResponse(res, error.statusCode || 400, {
        id: error.statusCode === 415 ? "unsupportedMediaType" : "invalidRequest",
        message: error.statusCode === 415 
        ? "Use application.json or application/x-www-form-urlencoded."
        : "The request body could not be parsed.",
      });
      return;
    }
  }

  //Edit an existing country
  if (
    countryMatch &&
    req.method === "POST"
  ) {
    let name;
    try {name = decodeURIComponent(countryMatch[1]); 

    } catch {
      sendResponse(res, 400, {
        id: "invalidCountryName",
        message: "The country name is not properly URL-encoded.",
      });
      return;
    }

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

      if (updates.name && updates.name.toLowerCase() !== country.name.toLowerCase()
        && findCountry(updates.name)) {
        sendResponse(res, 400, {
          id: "countryExists",
          message: "Another country already uses that name.",
        });
        return;
      }
      if (updates.finance && typeof updates.finance === "object") {
        country.finance = { ...(country.finance || {}), ...updates.finance };
        delete updates.finance;
      }

      Object.assign(country, updates);

      res.writeHead(204, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": 0,
      });

      res.end();
      return;
    } catch (error) {
      sendResponse(res, error.statusCode || 400, {
        id: error.statusCode === 415 ? "unsupportedMediaType" : "invalidRequest",
        message: error.statusCode === 415
          ? "Use application/json or application/x-www-form-urlencoded."
          :"The request body could not be parsed.",
      });
      return;
    }
  }

  //No endpoint found
  sendResponse(res, 404, {
    id: "notFound",
    message: "The requested endpoint was not found.",
  }, req.method !== "HEAD");
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});