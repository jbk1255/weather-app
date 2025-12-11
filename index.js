const weatherForm = document.querySelector(".weatherForm");
const cityInput = document.querySelector(".cityInput");
const card = document.querySelector(".card");
const unitSelect = document.querySelector(".unitSelect");
const forecastContainer = document.querySelector(".forecastContainer");
const inputError = document.querySelector(".inputError");
const suggestionsBox = document.querySelector(".suggestions");
const geoButton = document.querySelector(".geoButton");
const selectedDayInfo = document.querySelector(".selectedDayInfo");

const apiKey = "YOUR_API_KEY";
const LAST_SEARCH_KEY = "weatherAppLastSearch";

let currentTempKelvin = null;
let currentFeelsLikeKelvin = null;
let selectedLocation = null;
let suggestionTimeoutId = null;
let forecastEntries = [];

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
function getCountryName(code) {
    return regionNames.of(code) || code;
}

function toCelsius(k) { return k - 273.15; }
function toFahrenheit(k) { return (k - 273.15) * 9 / 5 + 32; }

function formatTemp(k, unit) {
    if (unit === "celsius") return `${toCelsius(k).toFixed(1)}°C`;
    if (unit === "fahrenheit") return `${toFahrenheit(k).toFixed(1)}°F`;
    return `${k.toFixed(1)}K`;
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getCityLocalDate(offsetSec) {
    const now = Date.now();
    const userOffset = -new Date().getTimezoneOffset() * 60;
    return new Date(now + (offsetSec - userOffset) * 1000);
}

function getCityDateFromUtc(dt, offsetSec) {
    const utcMillis = dt * 1000;
    const userOffset = -new Date().getTimezoneOffset() * 60;
    return new Date(utcMillis + (offsetSec - userOffset) * 1000);
}

function clearSuggestions() {
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
}

cityInput.addEventListener("input", () => {
    selectedLocation = null;
    inputError.textContent = "";
    inputError.classList.remove("inputErrorVisible");
    cityInput.classList.remove("cityInputError");

    const query = cityInput.value.trim();
    clearTimeout(suggestionTimeoutId);

    if (query.length < 2) {
        clearSuggestions();
        return;
    }

    suggestionTimeoutId = setTimeout(() => fetchSuggestions(query), 300);
});

async function fetchSuggestions(query) {
    try {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) return clearSuggestions();

        const locations = await res.json();
        renderSuggestions(locations);
    } catch {
        clearSuggestions();
    }
}

function renderSuggestions(locations) {
    suggestionsBox.innerHTML = "";

    if (!locations.length) {
        suggestionsBox.style.display = "none";
        return;
    }

    suggestionsBox.style.display = "block";

    locations.forEach(loc => {
        const item = document.createElement("div");
        item.classList.add("suggestionItem");

        const countryName = getCountryName(loc.country);
        const parts = [loc.name];
        if (loc.state) parts.push(loc.state);
        parts.push(countryName);
        const label = parts.join(", ");

        item.textContent = label;

        item.addEventListener("mousedown", () => {
            selectedLocation = {
                lat: loc.lat,
                lon: loc.lon,
                name: loc.name,
                state: loc.state || "",
                country: loc.country
            };

            cityInput.value = label;
            clearSuggestions();
        });

        suggestionsBox.appendChild(item);
    });
}

weatherForm.addEventListener("submit", async event => {
    event.preventDefault();

    const city = cityInput.value.trim();
    if (!city) return displayError("Please enter a valid location.");

    clearSuggestions();
    showLoading();

    try {
        let weatherPromise;
        let forecastPromise;

        if (selectedLocation) {
            const { lat, lon } = selectedLocation;
            weatherPromise = getWeatherByCoords(lat, lon);
            forecastPromise = getForecastByCoords(lat, lon);
        } else {
            weatherPromise = getWeather(city);
            forecastPromise = getForecast(city);
        }

        const [weatherData, forecastData] = await Promise.all([
            weatherPromise,
            forecastPromise
        ]);

        if (selectedLocation) {
            saveLastSearch({
                mode: "coords",
                lat: selectedLocation.lat,
                lon: selectedLocation.lon,
                label: cityInput.value
            });
        } else {
            saveLastSearch({
                mode: "city",
                name: cityInput.value
            });
        }

        unitSelect.value = "celsius";
        displayWeather(weatherData, "celsius");
        displayForecast(forecastData, "celsius");
    } catch (error) {
        displayError(error);
    }
});

unitSelect.addEventListener("change", () => {
    if (currentTempKelvin === null) return;

    const unit = unitSelect.value;

    const tempDisplay = card.querySelector(".tempDisplay");
    const feelsLikeDisplay = card.querySelector(".feelsLikeDisplay");

    if (tempDisplay) {
        tempDisplay.textContent = formatTemp(currentTempKelvin, unit);
    }
    if (feelsLikeDisplay) {
        feelsLikeDisplay.textContent = `Feels like: ${formatTemp(currentFeelsLikeKelvin, unit)}`;
    }

    const forecastTemps = document.querySelectorAll(".forecastTemp");
    forecastTemps.forEach(el => {
        const k = Number(el.dataset.kelvin);
        el.textContent = formatTemp(k, unit);
    });

    if (forecastEntries.length > 0 && selectedDayInfo.classList.contains("selectedDayInfoVisible")) {
        const cards = forecastContainer.querySelectorAll(".forecastCard");
        let activeIndex = -1;
        cards.forEach((c, i) => {
            if (c.classList.contains("forecastCardActive")) activeIndex = i;
        });
        if (activeIndex >= 0) handleForecastClick(activeIndex);
    }
});

async function getWeather(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Location not found.");
    return res.json();
}

async function getForecast(city) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load forecast.");
    return res.json();
}

async function getWeatherByCoords(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Location not found.");
    return res.json();
}

async function getForecastByCoords(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load forecast.");
    return res.json();
}

function showLoading() {
    card.style.display = "flex";
    card.style.opacity = "1";
    card.style.transform = "none";
    card.classList.remove("cardAnimate");

    card.innerHTML = `
        <div class="loadingSpinner"></div>
        <p class="loadingText">Loading...</p>
    `;

    forecastContainer.style.display = "none";
    unitSelect.style.display = "none";
    selectedDayInfo.textContent = "";
    selectedDayInfo.classList.remove("selectedDayInfoVisible");
}

function displayWeather(data, unit) {
    const {
        sys: { country, sunrise, sunset },
        timezone,
        main: { temp, humidity, feels_like },
        weather: [{ description, id, icon }]
    } = data;

    currentTempKelvin = temp;
    currentFeelsLikeKelvin = feels_like;

    const local = getCityLocalDate(timezone);

    card.innerHTML = "";
    card.style.display = "flex";

    card.style.opacity = "";
    card.style.transform = "";
    card.classList.remove("cardAnimate");

    setWeatherBackground(id);

    const h1 = document.createElement("h1");
    if (selectedLocation) {
        const parts = [selectedLocation.name];
        if (selectedLocation.state) parts.push(selectedLocation.state);
        parts.push(getCountryName(selectedLocation.country));
        h1.textContent = parts.join(", ");
    } else {
        h1.textContent = `${data.name}, ${getCountryName(country)}`;
    }

    const tempP = document.createElement("p");
    tempP.classList.add("tempDisplay");
    tempP.textContent = formatTemp(temp, unit);

    const feelsP = document.createElement("p");
    feelsP.classList.add("feelsLikeDisplay");
    feelsP.textContent = `Feels like: ${formatTemp(feels_like, unit)}`;

    const humidityP = document.createElement("p");
    humidityP.classList.add("humidityDisplay");
    humidityP.textContent = `Humidity: ${humidity}%`;

    const tempBlock = document.createElement("div");
    tempBlock.classList.add("temperatureBlock");
    tempBlock.append(tempP, feelsP, humidityP);

    const descP = document.createElement("p");
    descP.classList.add("descDisplay");
    descP.textContent = description;

    const iconImg = document.createElement("img");
    iconImg.src = `https://openweathermap.org/img/wn/${icon}@4x.png`;
    iconImg.classList.add("weatherIcon");

    const timeBox = document.createElement("div");
    timeBox.classList.add("timeBox");
    timeBox.innerHTML = `
        <p>Local time: ${formatTime(local)}</p>
        <p>Sunrise: ${formatTime(getCityDateFromUtc(sunrise, timezone))}</p>
        <p>Sunset: ${formatTime(getCityDateFromUtc(sunset, timezone))}</p>
    `;

    card.append(h1, tempBlock, descP, iconImg, timeBox);

    unitSelect.style.display = "inline-block";

    void card.offsetWidth;
    card.classList.add("cardAnimate");
}

function setWeatherBackground(id) {
    if (id === 800)
        card.style.background = "linear-gradient(180deg, hsl(210, 100%, 70%), hsl(40,100%,75%))";
    else if (id >= 200 && id < 600)
        card.style.background = "linear-gradient(180deg, hsl(210,50%,40%), hsl(210,50%,20%))";
    else if (id >= 600 && id < 700)
        card.style.background = "linear-gradient(180deg, hsl(0,0%,100%), hsl(0,0%,80%))";
    else if (id >= 700 && id < 800)
        card.style.background = "linear-gradient(180deg, hsl(210,10%,75%), hsl(40,10%,65%))";
    else
        card.style.background = "linear-gradient(180deg, hsl(210,20%,80%), hsl(0,0%,70%))";
}

function displayForecast(data, unit) {
    forecastContainer.innerHTML = "";

    const filtered = data.list.filter(x => x.dt_txt.includes("12:00:00")).slice(0, 5);
    forecastEntries = filtered;
    selectedDayInfo.textContent = "";
    selectedDayInfo.classList.remove("selectedDayInfoVisible");

    if (!filtered.length) {
        forecastContainer.style.display = "none";
        return;
    }

    forecastContainer.style.display = "flex";

    filtered.forEach((entry, index) => {
        const cardDiv = document.createElement("div");
        cardDiv.classList.add("forecastCard");

        const day = new Date(entry.dt_txt).toLocaleDateString("en-US", { weekday: "short" });
        const description = entry.weather[0].description;

        cardDiv.innerHTML = `
            <p class="forecastDay">${day}</p>
            <p class="forecastTemp" data-kelvin="${entry.main.temp}">
                ${formatTemp(entry.main.temp, unit)}
            </p>
            <div class="forecastIconWrapper">
                <img src="https://openweathermap.org/img/wn/${entry.weather[0].icon}@2x.png"
                     class="forecastIcon" alt="${description}">
            </div>
            <p class="forecastDesc">${description}</p>
        `;

        cardDiv.addEventListener("click", () => handleForecastClick(index));

        forecastContainer.appendChild(cardDiv);
    });

    forecastContainer.classList.remove("forecastAnimate");
    void forecastContainer.offsetWidth;
    forecastContainer.classList.add("forecastAnimate");
}

function handleForecastClick(index) {
    const cards = forecastContainer.querySelectorAll(".forecastCard");
    cards.forEach(c => c.classList.remove("forecastCardActive"));

    const activeCard = cards[index];
    const entry = forecastEntries[index];
    if (!activeCard || !entry) return;

    activeCard.classList.add("forecastCardActive");

    const unit = unitSelect.value || "celsius";
    const dayLabel = new Date(entry.dt_txt).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const tempStr = formatTemp(entry.main.temp, unit);
    const desc = entry.weather[0].description;

    selectedDayInfo.textContent = `${dayLabel} — ${tempStr}, ${desc}`;
    selectedDayInfo.classList.add("selectedDayInfoVisible");
}

function displayError(message) {
    inputError.textContent = message instanceof Error ? message.message : message;
    inputError.classList.add("inputErrorVisible");
    cityInput.classList.add("cityInputError");
    card.style.display = "none";
    forecastContainer.style.display = "none";
    unitSelect.style.display = "none";
    selectedDayInfo.textContent = "";
    selectedDayInfo.classList.remove("selectedDayInfoVisible");
    currentTempKelvin = null;
    currentFeelsLikeKelvin = null;
}

function saveLastSearch(data) {
    try {
        localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(data));
    } catch {}
}

function loadLastSearch() {
    try {
        const raw = localStorage.getItem(LAST_SEARCH_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

if (geoButton) {
    geoButton.addEventListener("click", () => {
        if (!navigator.geolocation) {
            displayError("Geolocation is not supported on this browser.");
            return;
        }

        geoButton.disabled = true;
        geoButton.textContent = "Locating...";

        navigator.geolocation.getCurrentPosition(
            async pos => {
                const { latitude, longitude } = pos.coords;
                clearSuggestions();
                showLoading();
                try {
                    const [weatherData, forecastData] = await Promise.all([
                        getWeatherByCoords(latitude, longitude),
                        getForecastByCoords(latitude, longitude)
                    ]);

                    selectedLocation = null;
                    cityInput.value = "Current location";

                    saveLastSearch({
                        mode: "coords",
                        lat: latitude,
                        lon: longitude,
                        label: "Current location"
                    });

                    unitSelect.value = "celsius";
                    displayWeather(weatherData, "celsius");
                    displayForecast(forecastData, "celsius");
                } catch (err) {
                    displayError(err);
                } finally {
                    geoButton.disabled = false;
                    geoButton.textContent = "Use My Location";
                }
            },
            () => {
                displayError("Could not get your location.");
                geoButton.disabled = false;
                geoButton.textContent = "Use My Location";
            }
        );
    });
}

window.addEventListener("load", async () => {
    cityInput.focus();
    const last = loadLastSearch();
    if (!last) return;

    try {
        showLoading();
        let weatherData;
        let forecastData;

        if (last.mode === "coords") {
            weatherData = await getWeatherByCoords(last.lat, last.lon);
            forecastData = await getForecastByCoords(last.lat, last.lon);
            cityInput.value = last.label || "Last location";
        } else if (last.mode === "city") {
            weatherData = await getWeather(last.name);
            forecastData = await getForecast(last.name);
            cityInput.value = last.name;
        } else {
            card.style.display = "none";
            forecastContainer.style.display = "none";
            return;
        }

        unitSelect.value = "celsius";
        displayWeather(weatherData, "celsius");
        displayForecast(forecastData, "celsius");
    } catch {
        card.style.display = "none";
        forecastContainer.style.display = "none";
    }
});
