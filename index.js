const weatherForm = document.querySelector(".weatherForm");
const cityInput = document.querySelector(".cityInput");
const card = document.querySelector(".card");
const unitSelect = document.querySelector(".unitSelect");
const forecastContainer = document.querySelector(".forecastContainer");

const apiKey = "801f9cedc5e0d85ab51861971bd1be08";

let currentTempKelvin = null;
let currentFeelsLikeKelvin = null;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
function getCountryName(code) {
    return regionNames.of(code) || code;
}

function toCelsius(k) { return k - 273.15; }
function toFahrenheit(k) { return (k - 273.15) * 9/5 + 32; }

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

weatherForm.addEventListener("submit", async event => {
    event.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return displayError("Please enter a valid location.");

    showLoading();

    try {
        const [weatherData, forecastData] = await Promise.all([
            getWeatherData(city),
            getForecastData(city)
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
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Invalid city name.");
    return res.json();
}

async function getForecastData(city) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}`;
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
    const { name: city, sys: { country, sunrise, sunset }, timezone,
            main: { temp, humidity, feels_like },
            weather: [{ description, id }] } = data;

    currentTempKelvin = temp;
    currentFeelsLikeKelvin = feels_like;

    const local = getCityLocalDate(timezone);
    const sunriseDate = getCityDateFromUtc(sunrise, timezone);
    const sunsetDate = getCityDateFromUtc(sunset, timezone);

    card.textContent = "";
    card.style.display = "flex";
    setCardBackground(id);

    const cityDisplay = document.createElement("h1");
    cityDisplay.textContent = `${city}, ${getCountryName(country)}`;

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

    const emoji = document.createElement("p");
    emoji.classList.add("weatherEmoji");
    emoji.textContent = getWeatherEmoji(id);

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
        emoji,
        timeBox
    );

    unitSelect.style.display = "inline-block";
}

function displayForecast(data, unit) {
    forecastContainer.innerHTML = "";

    const filtered = data.list.filter(item =>
        item.dt_txt.includes("12:00:00")
    ).slice(0, 5);

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

        const icon = document.createElement("p");
        icon.textContent = getWeatherEmoji(entry.weather[0].id);

        cardDiv.append(day, temp, icon);
        forecastContainer.appendChild(cardDiv);
    });
}

function getWeatherEmoji(id) {
    if (id >= 200 && id < 300) return "⛈";
    if (id >= 300 && id < 400) return "🌧";
    if (id >= 500 && id < 600) return "🌧";
    if (id >= 600 && id < 700) return "❄";
    if (id >= 700 && id < 800) return "🌫";
    if (id === 800) return "☀";
    if (id >= 801 && id < 810) return "☁";
    return "❓";
}

function displayError(message) {
    card.textContent = "";
    card.style.display = "flex";

    const p = document.createElement("p");
    p.classList.add("errorDisplay");
    p.textContent = message instanceof Error ? message.message : message;

    card.appendChild(p);

    forecastContainer.style.display = "none";
    unitSelect.style.display = "none";

    currentTempKelvin = null;
    currentFeelsLikeKelvin = null;
}
