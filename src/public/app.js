const filterForm = document.querySelector("#filter-form");
const searchName = document.querySelector("#search-name");
const filterRegion = document.querySelector("#filter-region");
const filterSubregion = document.querySelector("#filter-subregion");
const filterCurrency = document.querySelector("#filter-currency");
const filterLimit = document.querySelector("#filter-limit");
const countryResults = document.querySelector("#country-results");
const resultsSummary = document.querySelector("#results-summary");
const countryCount = document.querySelector("#country-count");
const regionCount = document.querySelector("#region-count");
const listError = document.querySelector("#list-error");
const addForm = document.querySelector("#add-form");
const editForm = document.querySelector("#edit-form");
const addMessage = document.querySelector("#add-message");
const editMessage = document.querySelector("#edit-message");
const detailPanel = document.querySelector("#detail-panel");
const detailTitle = document.querySelector("#detail-title");
const detailContent = document.querySelector("#detail-content"); //wow

//Sends a request and parses the response
async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
        //Empty
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.hidden = false;
  element.className = isError
    ? "message message-error"
    : "message message-success";
}

function createFact(label, value) {
  const fact = document.createElement("div");
  fact.className = "detail-fact";

  const labelElement = document.createElement("span");
  labelElement.className = "detail-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.textContent = value || "Not available";

  fact.append(labelElement, valueElement);
  return fact;
}

//Create a country card with no data
function createCountryCard(country) {
  const card = document.createElement("article");
  card.className = "country-card";

  const top = document.createElement("div");
  top.className = "card-top";

  const region = document.createElement("span");
  region.className = "region-label";
  region.textContent = country.region + " - "|| "Region unknown";

  const subregion = document.createElement("span");
  subregion.className = "subregion-label";
  subregion.textContent = country.subregion || "";

  top.append(region, subregion);

  const name = document.createElement("h3");
  name.textContent = country.name;

  const capital = document.createElement("p");
  capital.className = "country-capital";
  capital.textContent = `Capital: ${country.capital || "Not available"}`;

  const footer = document.createElement("div");
  footer.className = "card-footer";

  const currency = document.createElement("span");
  currency.className = "country-code";
  currency.textContent = country.finance?.currency + " " || "No currency";

  const detailsButton = document.createElement("button");
  detailsButton.className = "text-button";
  detailsButton.type = "button";
  detailsButton.textContent = "View details →";
  detailsButton.addEventListener("click", () => showCountryDetails(country.name));

  footer.append(currency, detailsButton);
  card.append(top, name, capital, footer);

  return card;
}

//Loads countries
async function loadCountries() {
  listError.hidden = true;
  countryResults.replaceChildren();
  resultsSummary.textContent = "Loading countries…";

  const params = new URLSearchParams();
  if (searchName.value.trim()) params.set("name", searchName.value.trim());
  if (filterRegion.value) params.set("region", filterRegion.value);
  if (filterSubregion.value.trim()) {
    params.set("subregion", filterSubregion.value.trim());
  }
  if (filterCurrency.value.trim()) {
    params.set("currency", filterCurrency.value.trim());
  }
  if (filterLimit.value.trim()) params.set("limit", filterLimit.value.trim());

  const query = params.toString();
  const endpoint = query ? `/api/countries?${query}` : "/api/countries";

  try {
    const countries = await requestJson(endpoint);
    resultsSummary.textContent = `${countries.length} countries found`;
    countries.forEach((country) => {
      countryResults.append(createCountryCard(country));
    });

    if (countries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No countries match those filters. Try changing your search.";
      countryResults.append(empty);
    }
  } catch (error) {
    resultsSummary.textContent = "Could not load countries";
    listError.textContent = error.message;
    listError.hidden = false;
  }
}

//Loads a summary
async function loadSummary() {
  try {
    const regions = await requestJson("/api/regions");
    countryCount.textContent = "Ready";
    regionCount.textContent = regions.length;
    filterRegion.replaceChildren(new Option("All regions", ""));

    regions.sort().forEach((region) => {
      filterRegion.add(new Option(region, region));
    });

    // The total count is shown after the unfiltered list is requested.
    const allCountries = await requestJson("/api/countries");
    countryCount.textContent = allCountries.length;
  } catch (error) {
    countryCount.textContent = "-";
    regionCount.textContent = "-";
    listError.textContent = error.message;
    listError.hidden = false;
  }
}

//Displays full details for a country
async function showCountryDetails(name) {
  try {
    const country = await requestJson(`/api/countries/${encodeURIComponent(name)}`);
    const timezones = await requestJson(
      `/api/countries/${encodeURIComponent(name)}/timezones`
    );

    detailTitle.textContent = country.name;
    detailContent.replaceChildren();

    const grid = document.createElement("div");
    grid.className = "detail-grid";
    grid.append(
      createFact("Capital: ", country.capital),
      createFact("Region: ", country.region),
      createFact("Subregion: ", country.subregion),
      createFact("Currency: ", country.finance?.currency),
      createFact("Currency name: ", country.finance?.currency_name),
      createFact("Nationality: ", country.nationality),
      createFact("Latitude: ", country.latitude),
      createFact("Longitude: ", country.longitude)
    );
    detailContent.append(grid);

    const heading = document.createElement("h3");
    heading.className = "timezone-heading";
    heading.textContent = "Time zones";
    detailContent.append(heading);

    const timezoneList = document.createElement("div");
    timezoneList.className = "timezone-list";

    if (!timezones.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No time zone information is available.";
      timezoneList.append(empty);
    } else {
      timezones.forEach((timezone) => {
        const item = document.createElement("div");
        item.className = "timezone-item";

        const zoneName = document.createElement("strong");
        zoneName.textContent = timezone.zoneName || timezone.abbreviation || "Time zone";

        const offset = document.createElement("span");
        offset.textContent = timezone.gmtOffsetName || timezone.abbreviation || "";

        item.append(zoneName, offset);
        timezoneList.append(item);
      });
    }

    detailContent.append(timezoneList);
    detailPanel.hidden = false;
    detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    window.alert(error.message);
  }
}

function getNewCountry(form) {
  const formData = new FormData(form);

  return {
    name: formData.get("name").trim(),
    capital: formData.get("capital").trim(),
    region: formData.get("region").trim(),
    subregion: formData.get("subregion").trim(),
    finance: {
      currency: formData.get("currency").trim(),
      currency_name: formData.get("currency_name").trim(),
      currency_symbol: formData.get("currency_symbol").trim(),
    },
    nationality: formData.get("nationality").trim(),
    timezones: [],
  };
}

//Adds a country through the API.
addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  addMessage.hidden = true;

  try {
    const country = getNewCountry(addForm);
    await requestJson("/api/countries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(country),
    });

    addForm.reset();
    showMessage(addMessage, "Country added successfully.");
    await loadCountries();
    await loadSummary();
  } catch (error) {
    showMessage(addMessage, error.message, true);
  }
});

//Edits a country through the API.
editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  editMessage.hidden = true;

  const formData = new FormData(editForm);
  const name = formData.get("countryName").trim();
  const updates = {};

  ["capital", "region", "subregion"].forEach((field) => {
    const value = formData.get(field).trim();
    if (value) updates[field] = value;
  });

  const currency = formData.get("currency").trim();
  if (currency) updates.finance = { currency };

  if (Object.keys(updates).length === 0) {
    showMessage(editMessage, "Enter at least one field to update.", true);
    return;
  }

  try {
    await requestJson(`/api/countries/${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    editForm.reset();
    showMessage(editMessage, "Country updated successfully.");
    await loadCountries();
  } catch (error) {
    showMessage(editMessage, error.message, true);
  }
});

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadCountries();
});

//Resets all filters
document.querySelector("#clear-filters").addEventListener("click", () => {
  filterForm.reset();
  loadCountries();
});

//Hides details panel
document.querySelector("#close-detail").addEventListener("click", () => {
  detailPanel.hidden = true;
});

loadSummary();
loadCountries();