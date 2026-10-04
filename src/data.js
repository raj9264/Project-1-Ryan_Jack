const fs = require("fs");
const path = require("path");

//Loads the country's JSON file when the server starts
const filePath = path.join(__dirname, "..", "data", "countries.json");

const countries = JSON.parse(fs.readFileSync(filePath, "utf8"));

module.exports = countries;