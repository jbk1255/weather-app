const weatherForm = document.querySelector(".weatherForm");
const cityInput = document.querySelector(".cityInput");
const card = document.querySelector(".card");
const unitSelect = document.querySelector(".unitSelect");
const forecastContainer = document.querySelector(".forecastContainer");
const inputError = document.querySelector(".inputError");
const suggestionsBox = document.querySelector(".suggestions");

const apiKey = "YOUR API KEY";

let currentTempKelvin = null;
let currentFeelsLikeKelvin = null;
let suggestionTimeoutId = null;
let selectedLocation = null;

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

function showLoading() {
    inputError.textContent = "";
    card.style.display = "flex";
    card.textContent = "";
    const spinner = document.createElement("div");
    spinner.classList.add("loadingSpinner");
    const text = document.createElement("p");
    text.classList.add("loadingText");
    text.textContent = "Loading...";
    card.append(spinner, text);
    forecastContainer.style.display = "none";
    unitSelect.style.display = "none";
}

function clearSuggestions() {
    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "none";
}

cityInput.addEventListener("input", () => {
    inputError.textContent = "";
    selectedLocation = null;
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
        if (!res.ok) {
            clearSuggestions();
            return;
        }
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
                country: loc.country,
                state: loc.state || ""
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
    if (!city) {
        displayError("Please enter a valid location.");
        return;
    }

    clearSuggestions();
    showLoading();

    try {
        let weatherPromise;
        let forecastPromise;

        if (selectedLocation) {
            weatherPromise = getWeatherDataByCoords(selectedLocation.lat, selectedLocation.lon);
            forecastPromise = getForecastDataByCoords(selectedLocation.lat, selectedLocation.lon);
        } else {
            weatherPromise = getWeatherData(city);
            forecastPromise = getForecastData(city);
        }

        const [weatherData, forecastData] = await Promise.all([
            weatherPromise,
            forecastPromise
        ]);

        unitSelect.value = "celsius";

        displayWeatherInfo(weatherData, "celsius");
        displayForecast(forecastData, "celsius");

    } catch (error) {
        displayError(error);
    }
});

unitSelect.addEventListener("change", () => {
    if (currentTempKelvin === null) return;

    const tempDisplay = card.querySelector(".tempDisplay");
    const feelsLikeDisplay = card.querySelector(".feelsLikeDisplay");

    if (tempDisplay)
        tempDisplay.textContent = formatTemp(currentTempKelvin, unitSelect.value);

    if (feelsLikeDisplay)
        feelsLikeDisplay.textContent = `Feels like: ${formatTemp(currentFeelsLikeKelvin, unitSelect.value)}`;

    const temps = document.querySelectorAll(".forecastTemp");
    temps.forEach(el => {
        el.textContent = formatTemp(Number(el.dataset.kelvin), unitSelect.value);
    });
});

async function getWeatherData(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("City not found. Try again.");
    return res.json();
}

async function getForecastData(city) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load forecast.");
    return res.json();
}

async function getWeatherDataByCoords(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("City not found. Try again.");
    return res.json();
}

async function getForecastDataByCoords(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load forecast.");
    return res.json();
}

function setCardBackground(id) {
    if (id === 800)
        card.style.background = "linear-gradient(180deg, hsl(210, 100%, 70%), hsl(40, 100%, 75%))";
    else if (id >= 200 && id < 600)
        card.style.background = "linear-gradient(180deg, hsl(210, 50%, 40%), hsl(210, 50%, 20%))";
    else if (id >= 600 && id < 700)
        card.style.background = "linear-gradient(180deg, hsl(0, 0%, 100%), hsl(0, 0%, 80%))";
    else if (id >= 700 && id < 800)
        card.style.background = "linear-gradient(180deg, hsl(210, 10%, 75%), hsl(40, 10%, 65%))";
    else
        card.style.background = "linear-gradient(180deg, hsl(210, 20%, 80%), hsl(0, 0%, 70%))";
}

function displayWeatherInfo(data, unit) {
    inputError.textContent = "";

    const {
        sys: { country, sunrise, sunset },
        timezone,
        main: { temp, humidity, feels_like },
        weather: [{ description, id, icon }]
    } = data;

    currentTempKelvin = temp;
    currentFeelsLikeKelvin = feels_like;

    const local = getCityLocalDate(timezone);
    const sunriseDate = getCityDateFromUtc(sunrise, timezone);
    const sunsetDate = getCityDateFromUtc(sunset, timezone);

    card.textContent = "";
    card.style.display = "flex";
    setCardBackground(id);

    const cityDisplay = document.createElement("h1");

    if (selectedLocation) {
        const countryName = getCountryName(selectedLocation.country);
        const parts = [selectedLocation.name];
        if (selectedLocation.state) parts.push(selectedLocation.state);
        parts.push(countryName);
        cityDisplay.textContent = parts.join(", ");
    } else {
        cityDisplay.textContent = `${data.name}, ${getCountryName(country)}`;
    }

    const tempDisplay = document.createElement("p");
    tempDisplay.classList.add("tempDisplay");
    tempDisplay.textContent = formatTemp(temp, unit);

    const feelsLikeDisplay = document.createElement("p");
    feelsLikeDisplay.classList.add("feelsLikeDisplay");
    feelsLikeDisplay.textContent = `Feels like: ${formatTemp(feels_like, unit)}`;

    const humidityDisplay = document.createElement("p");
    humidityDisplay.classList.add("humidityDisplay");
    humidityDisplay.textContent = `Humidity: ${humidity}%`;

    const descDisplay = document.createElement("p");
    descDisplay.classList.add("descDisplay");
    descDisplay.textContent = description;

    const iconUrl = `https://openweathermap.org/img/wn/${icon}@4x.png`;
    const iconImg = document.createElement("img");
    iconImg.src = iconUrl;
    iconImg.alt = description;
    iconImg.classList.add("weatherIcon");

    const timeBox = document.createElement("div");
    timeBox.classList.add("timeBox");

    const localP = document.createElement("p");
    localP.textContent = "Local time: " + formatTime(local);

    const sunriseP = document.createElement("p");
    sunriseP.textContent = "Sunrise: " + formatTime(sunriseDate);

    const sunsetP = document.createElement("p");
    sunsetP.textContent = "Sunset: " + formatTime(sunsetDate);

    timeBox.append(localP, sunriseP, sunsetP);

    card.append(
        cityDisplay,
        tempDisplay,
        feelsLikeDisplay,
        humidityDisplay,
        descDisplay,
        iconImg,
        timeBox
    );

    unitSelect.style.display = "inline-block";
}

function displayForecast(data, unit) {
    forecastContainer.innerHTML = "";

    const filtered = data.list
        .filter(item => item.dt_txt.includes("12:00:00"))
        .slice(0, 5);

    if (!filtered.length) {
        forecastContainer.style.display = "none";
        return;
    }

    forecastContainer.style.display = "flex";

    filtered.forEach(entry => {
        const dayName = new Date(entry.dt_txt).toLocaleDateString("en-US", { weekday: "short" });

        const cardDiv = document.createElement("div");
        cardDiv.classList.add("forecastCard");

        const day = document.createElement("p");
        day.classList.add("forecastDay");
        day.textContent = dayName;

        const temp = document.createElement("p");
        temp.classList.add("forecastTemp");
        temp.dataset.kelvin = entry.main.temp;
        temp.textContent = formatTemp(entry.main.temp, unit);

        const iconCode = entry.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        const iconImg = document.createElement("img");
        iconImg.src = iconUrl;
        iconImg.alt = entry.weather[0].description;
        iconImg.classList.add("forecastIcon");

        cardDiv.append(day, temp, iconImg);
        forecastContainer.appendChild(cardDiv);
    });
}

function displayError(message) {
    const text = message instanceof Error ? message.message : message;
    inputError.textContent = text;

    card.style.display = "none";
    forecastContainer.style.display = "none";
    unitSelect.style.display = "none";

    currentTempKelvin = null;
    currentFeelsLikeKelvin = null;
}
