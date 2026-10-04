const http = require("http");
const countries = require("./data");

const PORT = process.env.PORT || 3000;

//Sends a response to the client.
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

//Creates an HTTP server.
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  //Tests endpoint.
  if (req.url === "/api/countries" &&
    (req.method === "GET" || req.method === "HEAD")
    ) {
    sendResponse(res, 200, countries, req.method === "GET");
    return;
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