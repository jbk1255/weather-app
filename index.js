const weatherForm = document.querySelector(".weatherForm");
const cityInput = document.querySelector(".cityInput");
const card = document.querySelector(".card");
const unitSelect = document.querySelector(".unitSelect");
const forecastContainer = document.querySelector(".forecastContainer");

const apiKey = "YOUR API KEY";

let currentTempKelvin = null;
let currentFeelsLikeKelvin = null;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
function getCountryName(code) {
    return regionNames.of(code) || code;
}

function toCelsius(k) { return k - 273.15; }
function toFahrenheit(k) { return (k - 273.15) * 9 / 5 + 32; }

function formatTemp(kelvin, unit) {
    if (unit === "celsius") return `${toCelsius(kelvin).toFixed(1)}°C`;
    if (unit === "fahrenheit") return `${toFahrenheit(kelvin).toFixed(1)}°F`;
    return `${kelvin.toFixed(1)}K`;
}

function getCityLocalDate(timezoneOffsetSeconds) {
    const utcNowMillis = Date.now();
    const userOffsetSeconds = -new Date().getTimezoneOffset() * 60;
    const cityMillis = utcNowMillis + (timezoneOffsetSeconds - userOffsetSeconds) * 1000;
    return new Date(cityMillis);
}

weatherForm.addEventListener("submit", async event => {
    event.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return displayError("Please enter a valid location.");

    try {
        const weatherData = await getWeatherData(city);
        const forecastData = await getForecastData(city);

        unitSelect.value = "celsius";
        displayWeatherInfo(weatherData, unitSelect.value);
        displayForecast(forecastData, unitSelect.value);

    } catch (error) {
        displayError(error);
    }
});

unitSelect.addEventListener("change", () => {
    if (currentTempKelvin === null) return;
    const tempDisplay = card.querySelector(".tempDisplay");
    const feelsLikeDisplay = card.querySelector(".feelsLikeDisplay");

    if (tempDisplay) tempDisplay.textContent = formatTemp(currentTempKelvin, unitSelect.value);
    if (feelsLikeDisplay) feelsLikeDisplay.textContent = `Feels like: ${formatTemp(currentFeelsLikeKelvin, unitSelect.value)}`;

    const forecastTemps = document.querySelectorAll(".forecastTemp");
    forecastTemps.forEach(el => {
        const k = Number(el.dataset.kelvin);
        el.textContent = formatTemp(k, unitSelect.value);
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
    const { name: city, sys: { country }, timezone, main: { temp, humidity, feels_like }, weather: [{ description, id }] } = data;

    currentTempKelvin = temp;
    currentFeelsLikeKelvin = feels_like;

    const localDate = getCityLocalDate(timezone);

    card.textContent = "";
    card.style.display = "flex";
    setCardBackground(id);

    const cityDisplay = document.createElement("h1");
    cityDisplay.textContent = `${city}, ${getCountryName(country)}`;

    const localTimeDisplay = document.createElement("p");
    localTimeDisplay.classList.add("localTimeDisplay");
    localTimeDisplay.textContent = "Local time: " + localDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    const tempDisplay = document.createElement("p");
    tempDisplay.classList.add("tempDisplay");
    tempDisplay.textContent = formatTemp(temp, unit);

    const feels = document.createElement("p");
    feels.classList.add("feelsLikeDisplay");
    feels.textContent = `Feels like: ${formatTemp(feels_like, unit)}`;

    const humidityDisplay = document.createElement("p");
    humidityDisplay.classList.add("humidityDisplay");
    humidityDisplay.textContent = `Humidity: ${humidity}%`;

    const descDisplay = document.createElement("p");
    descDisplay.classList.add("descDisplay");
    descDisplay.textContent = description;

    const icon = document.createElement("p");
    icon.classList.add("weatherEmoji");
    icon.textContent = getWeatherEmoji(id);

    card.append(cityDisplay, localTimeDisplay, tempDisplay, feels, humidityDisplay, descDisplay, icon);

    unitSelect.style.display = "inline-block";
}

function displayForecast(data, unit) {
    forecastContainer.innerHTML = "";
    const filtered = data.list.filter(entry => entry.dt_txt.includes("12:00:00")).slice(0, 5);

    if (!filtered.length) {
        forecastContainer.style.display = "none";
        return;
    }

    forecastContainer.style.display = "flex";

    filtered.forEach(entry => {
        const dayLabel = new Date(entry.dt_txt).toLocaleDateString("en-US", { weekday: "short" });

        const div = document.createElement("div");
        div.classList.add("forecastCard");

        const d = document.createElement("p");
        d.classList.add("forecastDay");
        d.textContent = dayLabel;

        const temp = document.createElement("p");
        temp.classList.add("forecastTemp");
        temp.dataset.kelvin = entry.main.temp;
        temp.textContent = formatTemp(entry.main.temp, unit);

        const icon = document.createElement("p");
        icon.textContent = getWeatherEmoji(entry.weather[0].id);

        div.append(d, temp, icon);
        forecastContainer.appendChild(div);
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

function displayError(msg) {
    card.textContent = "";
    const p = document.createElement("p");
    p.classList.add("errorDisplay");
    p.textContent = msg instanceof Error ? msg.message : msg;
    card.appendChild(p);
    card.style.display = "flex";

    forecastContainer.style.display = "none";
    unitSelect.style.display = "none";

    currentTempKelvin = null;
    currentFeelsLikeKelvin = null;
}
