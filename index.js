// WEATHER APP

const weatherForm = document.querySelector(".weatherForm");
const cityInput = document.querySelector(".cityInput");
const card = document.querySelector(".card");
const unitSelect = document.querySelector(".unitSelect");
const apiKey = "YOUR_API_KEY";

let currentTempKelvin = null;

function toCelsius(k) {
    return k - 273.15;
}

function toFahrenheit(k) {
    return (k - 273.15) * 9/5 + 32;
}

function formatTemp(kelvin, unit) {
    switch (unit) {
        case "celsius":
            return `${toCelsius(kelvin).toFixed(1)}°C`;
        case "fahrenheit":
            return `${toFahrenheit(kelvin).toFixed(1)}°F`;
        case "kelvin":
        default:
            return `${kelvin.toFixed(1)}K`;
    }
}

weatherForm.addEventListener("submit", async event => {
    event.preventDefault();

    const city = cityInput.value.trim();

    if (city) {
        try {
            const weatherData = await getWeatherData(city);

            // Reset unit to default (Celsius) for each new search
            unitSelect.value = "celsius";

            displayWeatherInfo(weatherData, unitSelect.value);
        } catch (error) {
            console.error(error);
            displayError(error);
        }
    } else {
        displayError("Please enter a valid location.");
    }
});

unitSelect.addEventListener("change", () => {
    if (currentTempKelvin !== null) {
        const tempDisplay = card.querySelector(".tempDisplay");
        if (tempDisplay) {
            tempDisplay.textContent = formatTemp(currentTempKelvin, unitSelect.value);
        }
    }
});

async function getWeatherData(city) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
        throw new Error(`Could not fetch weather data for ${city}. Please enter a valid location.`);
    }

    return await response.json();
}

function setCardBackground(weatherId) {
    let gradient;

    if (weatherId === 800) {
        // Clear sky → bright blue gradient
        gradient = "linear-gradient(180deg, hsl(210, 100%, 70%), hsl(40, 100%, 75%))";
    } else if (weatherId >= 200 && weatherId < 600) {
        // Thunderstorm, drizzle, rain → darker blue/grey
        gradient = "linear-gradient(180deg, hsl(210, 50%, 40%), hsl(210, 50%, 20%))";
    } else if (weatherId >= 600 && weatherId < 700) {
        // Snow → white/grey
        gradient = "linear-gradient(180deg, hsl(0, 0%, 100%), hsl(0, 0%, 80%))";
    } else if (weatherId >= 700 && weatherId < 800) {
        // Fog / mist / haze → desaturated
        gradient = "linear-gradient(180deg, hsl(210, 10%, 75%), hsl(40, 10%, 65%))";
    } else if (weatherId >= 801 && weatherId < 810) {
        // Clouds → light grey/blue
        gradient = "linear-gradient(180deg, hsl(210, 20%, 80%), hsl(0, 0%, 70%))";
    } else {
        // Fallback (same as your original)
        gradient = "linear-gradient(180deg, hsl(210, 100%, 75%), hsl(40, 100%, 75%))";
    }

    card.style.background = gradient;
}

function displayWeatherInfo(data, unit) {

    const {name: city, 
           main: {temp, humidity}, 
           weather: [{description, id}]} = data;

    currentTempKelvin = temp;

    card.textContent = "";
    card.style.display = "flex";

    // Set background based on weather here 👇
    setCardBackground(id);

    const cityDisplay = document.createElement("h1");
    const tempDisplay = document.createElement("p");
    const humidityDisplay = document.createElement("p");
    const descDisplay = document.createElement("p");
    const weatherEmoji = document.createElement("p");

    cityDisplay.textContent = city;
    tempDisplay.textContent = formatTemp(temp, unit);
    humidityDisplay.textContent = `Humidity: ${humidity}%`;
    descDisplay.textContent = description;
    weatherEmoji.textContent = getWeatherEmoji(id);

    cityDisplay.classList.add("cityDisplay");
    tempDisplay.classList.add("tempDisplay");
    humidityDisplay.classList.add("humidityDisplay");
    descDisplay.classList.add("descDisplay");
    weatherEmoji.classList.add("weatherEmoji");

    card.appendChild(cityDisplay);
    card.appendChild(tempDisplay);
    card.appendChild(humidityDisplay);
    card.appendChild(descDisplay);
    card.appendChild(weatherEmoji);

    unitSelect.style.display = "inline-block";
}

function getWeatherEmoji(weatherId) {
    switch (true) {
        case (weatherId >= 200 && weatherId < 300): return "⛈";
        case (weatherId >= 300 && weatherId < 400): return "🌧";
        case (weatherId >= 500 && weatherId < 600): return "🌧";
        case (weatherId >= 600 && weatherId < 700): return "❄";
        case (weatherId >= 700 && weatherId < 800): return "🌫";
        case (weatherId === 800): return "☀";
        case (weatherId >= 801 && weatherId < 810): return "☁";
        default: return "❓";
    }
}

function displayError(message) {
    const errorDisplay = document.createElement("p");
    errorDisplay.textContent = message instanceof Error ? message.message : message;
    errorDisplay.classList.add("errorDisplay");

    card.textContent = "";
    card.style.display = "flex";
    card.appendChild(errorDisplay);

    unitSelect.style.display = "none";
    currentTempKelvin = null;
}
