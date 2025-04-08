// -------------------------------------GLOBAL VARIABLES-----------------------------------------

let map;
let currentInfowindow = null;
let stationsData = [];
let currentCircles = [];
let button_bikes_active = false;
let button_stands_active = false;
let activeMarker = null;
let weatherData = [];
let airData = [];
let weather_forecast_data = [];
let markers = {};
let directionsService;
let directionsRenderer;
let selectedStationName = null;
let selectedStationNum = null;
let selectedLocation = { lat: 0, lng: 0 };
let selectedDate = null;
let previousActiveMarker = null;
let fromMarker = null;
let toMarker = null;
let searchBox;
let predictionDataCache = null;

// --------------------------------------FUNCTIONS NEED TO LOAD AT START------------------------------------------
window.onload = initialize;

// Functions needed to be called when page load
function initialize() {
  loadGoogleMapsAPI();
  getWeatherForecast();
  getAndDisplayWeatherAndAir();
  populateDateDropdown();
  // fetchPredictions();
  addEventListener();
}

// add event listener to related elements
function addEventListener() {
  document
    .getElementById("current_location")
    .addEventListener("click", function () {
      simulateLocation({
        latitude: 53.349805,
        longitude: -6.26031,
      });
    });
  document.addEventListener("DOMContentLoaded", function () {
    createPredictionsTable(yourPredictionsData);
  });
  document.getElementById("submit").addEventListener("click", displayBikeRoute);
  document
    .getElementById("set_as_start")
    .addEventListener("click", function () {
      if (selectedStationName) {
        setDropdownValue("from", selectedStationName);
        clearDirections();
      } else {
        showNotice("Please select a station first.");
      }
    });

  document.getElementById("set_as_end").addEventListener("click", function () {
    if (selectedStationName) {
      setDropdownValue("to", selectedStationName);
      clearDirections();
    } else {
      showNotice("Please select a station first.");
    }
  });

  document
    .getElementById("serach_for_bike")
    .addEventListener("click", searchForBike);
  document
    .getElementById("serach_for_stand")
    .addEventListener("click", searchForStand);

  const fromDropdown = document.getElementById("from");
  const toDropdown = document.getElementById("to");
  fromDropdown.addEventListener("change", function () {
    zoomToStation(fromDropdown.value, "from");
  });
  toDropdown.addEventListener("change", function () {
    zoomToStation(toDropdown.value, "to");
  });

  document
    .getElementById("search_location")
    .addEventListener("click", function () {
      var address = document.getElementById("location").value;
      locateAddress(address);
    });

  document
    .getElementById("close_prediction")
    .addEventListener("click", function () {
      var predictionDiv = document.getElementById("prediction");
      predictionDiv.style.display = "none";
    });

  document
    .getElementById("current_location")
    .addEventListener("click", function () {
      simulateLocation({
        latitude: 53.349805,
        longitude: -6.26031,
      });
    });

  document
    .getElementById("location")
    .addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();

        var address = document.getElementById("location").value;
        locateAddress(address);
      }
    });

  document.getElementById("dateSelect").addEventListener("change", function () {
    selectedDate = this.value;
    console.log("Selected date:", selectedDate);
  });
}

// dynamically load the Google Maps API
function loadGoogleMapsAPI() {
  var script = document.createElement("script");

  //  initMap() is automatically executed in JavaScript file because it is specified as a callback function after the Google Maps JavaScript API script is loaded.

  //load maps，marker，places libraries of Google Mps
  script.src =
    "https://maps.googleapis.com/maps/api/js?key=AIzaSyDogACQCk-e5fzcI75vEP2bsxHjDYJe2Jk&callback=initMap&libraries=maps,places,geometry&v=beta";

  script.async = true;
  document.head.appendChild(script);
}

// load google chart package
google.charts.load("current", { packages: ["corechart"] });

// -----------------------------------------------WEATHER -----------------------------------------------------

// Get weather data from RDS
function getWeather() {
  return fetch("/weather")
    .then((response) => response.json())
    .then((data) => {
      console.log("I am weather data from RDS");
      // console.log(data);
      return data;
    });
}

// Get air quality data from RDS
function getAir() {
  return fetch("/airquality")
    .then((response) => response.json())
    .then((data) => {
      console.log("I am air data from RDS");
      // console.log(data);
      return data;
    });
}

// Display weather and air data
function displayWeatherAndAir(weatherData, airData) {
  const weatherText = document.getElementById("weather_content");
  const weatherTemp = document.getElementById("weather_temp");
  const temperature = weatherData.temp.toFixed(1);
  const weatherCondition = weatherData.weather_description;
  const wind = weatherData.wind_speed;
  const windDeg = weatherData.wind_deg;
  const humidity = weatherData.humidity;
  const pm2_5 = airData.pm2_5.toFixed(1);
  const pm10 = airData.pm10;

  const iconImg = document.createElement("img");
  iconImg.src = `http://openweathermap.org/img/wn/${weatherData.weather_icon}.png`;
  iconImg.alt = weatherData.weather_description;
  iconImg.style.width = "90px";

  const weatherPicDiv = document.getElementById("weather_pic");
  weatherPicDiv.innerHTML = "";
  weatherPicDiv.appendChild(iconImg);

  const content = `
   
    Wind:${wind}m/s <br>PM2.5:${pm2_5}μg/m³ 
    <button id="weather_prediction_btn" type="button">forecast</button>
  `;
  weatherText.innerHTML = content;

  weatherTemp.innerHTML = ` <strong id="temp">${temperature}°C</strong> <p>
 
  `;
}

// Get weather and air data, and display them
function getAndDisplayWeatherAndAir() {
  Promise.all([getWeather(), getAir()]).then((results) => {
    const weatherData = results[0];
    const airData = results[1];
    displayWeatherAndAir(weatherData, airData);
  });

  document.getElementById("weather").addEventListener("click", function () {
    document.getElementById("weather_more").style.display = "block";
  });
}

// -------------------------------------WEATHER FORECAST -----------------------------------------------------

// Get weather forecast data from RDS
function getWeatherForecast() {
  fetch("/weather_forecast")
    .then((response) => response.json())
    .then((data) => {
      // 获取当前时间
      const now = new Date();

      // 过滤掉时间比现在早的数据
      const futureData = data.filter((item) => {
        const forecastTime = new Date(item.dt_txt);
        return forecastTime > now;
      });

      // 对未来的天气数据按时间排序
      const sortedFutureData = futureData.sort((a, b) => {
        return new Date(a.dt_txt) - new Date(b.dt_txt);
      });

      // 取排序后的数据的前8条
      weather_forecast_data = sortedFutureData.slice(0, 8);
      console.log("【I AM WEATHER FORECAST DATA.】");
      console.log(weather_forecast_data);
      displayWeatherCondition();
      drawTempChart();
      drawWindChart();
    });
}

// Display weather forecast conditon
function displayWeatherCondition() {
  const container = document.getElementById("weather_condition");
  const iconsRow = document.createElement("div");
  const timesRow = document.createElement("div");

  weather_forecast_data.forEach((data) => {
    const iconImg = document.createElement("img");
    iconImg.src = `http://openweathermap.org/img/wn/${data.weather_icon}.png`;
    iconImg.alt = data.weather_description;
    iconImg.style.width = "45px";
    iconsRow.appendChild(iconImg);

    const timeSpan = document.createElement("span");
    const date = new Date(data.dt_txt);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    timeSpan.textContent = `${hours}:${minutes}`;
    timeSpan.style.margin = "0 7px";
    timeSpan.style.fontSize = "0.5em";
    timeSpan.style.color = "#444444";
    timesRow.appendChild(timeSpan);
  });

  container.appendChild(iconsRow);
  container.appendChild(timesRow);

  document
    .getElementById("close_weather")
    .addEventListener("click", function () {
      document.getElementById("weather_more").style.display = "none";
    });
}

// Draw weather forecast chart for temperature
function drawTempChart() {
  var data = new google.visualization.DataTable();

  data.addColumn("datetime", "Time");
  data.addColumn("number", "Temperature");

  var rows = weather_forecast_data.map(function (item) {
    var dateStr = item.dt_txt;
    var date = new Date(Date.parse(dateStr.replace(/GMT$/, "")));
    var temperature = item.temp;
    return [date, temperature];
  });

  data.addRows(rows);

  var options = {
    backgroundColor: "transparent",
    hAxis: {
      format: "HH:mm",
      gridlines: { color: "#dddddd", count: 8 },
    },
    vAxis: {
      title: "Temperature (°C)",
      gridlines: { color: "#dddddd", count: 4 },
      textStyle: {
        color: "#000000",
        fontSize: 12,
      },
    },

    legend: { position: "none" },

    series: {
      0: { color: "#3cbca0" },
    },
    chartArea: { left: 20, top: 20, width: "83%", height: "70%" },
    pointSize: 3,
    pointShape: "circle",
  };

  var chart = new google.visualization.LineChart(
    document.getElementById("weather_temperature")
  );
  chart.draw(data, options);
}

// Draw weather forecast chart for wind speed
function drawWindChart() {
  var data = new google.visualization.DataTable();

  data.addColumn("datetime", "Time");
  data.addColumn("number", "Wind");

  console.log("1111", weather_forecast_data);

  var rows = weather_forecast_data.map(function (item) {
    var dateStr = item.dt_txt;
    var date = new Date(Date.parse(dateStr.replace(/GMT$/, "")));
    var wind = item.wind_speed;
    return [date, wind];
  });

  data.addRows(rows);

  var options = {
    backgroundColor: "transparent",
    hAxis: {
      format: "HH:mm",
      gridlines: { color: "#dddddd", count: 8 },
    },
    vAxis: {
      title: "Wind (m/s)",
      gridlines: { color: "#dddddd", count: 4 },
    },

    legend: { position: "none" },

    series: {
      0: { color: "#ff9966" },
    },
    chartArea: { left: 20, top: 20, width: "83%", height: "70%" },
    pointSize: 3,
    pointShape: "circle",
  };

  var chart = new google.visualization.LineChart(
    document.getElementById("weather_wind")
  );
  chart.draw(data, options);
}

// ------------------------------------------------ MAP ------------------------------------------------------

// Initialize the Google map
function initMap() {
  var customMapStyle = [
    {
      featureType: "poi", // Points of interest.
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "transit", // Transit stations.
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ];
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
    center: { lat: 53.346, lng: -6.26 },
    styles: customMapStyle,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT, // move map control button position
    },
  });

  getStations().then(() => {
    addMarkers(stationsData);
    circlesButtonClick();
    // populateDropdown();
  });

  autoComplete();

  // Instantiate a directions service.
  directionsService = new google.maps.DirectionsService();

  // Create a renderer for directions and bind it to the map.
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: map,
    polylineOptions: {
      strokeColor: " #e86f53",
      strokeOpacity: 1,
      strokeWeight: 6,
    },
    suppressBicyclingLayer: true,
    suppressMarkers: true,
  });
}

// Get stations data from RDS
function getStations() {
  return fetch("/stations")
    .then((response) => response.json())
    .then((data) => {
      stationsData = data;
      populateStationDropdowns(stationsData);
      // console.log(stationsData);
    });
}

function addMarkers(stations) {
  markers = {};
  stations.forEach((station) => {
    const position = new google.maps.LatLng(
      station.position_lat,
      station.position_lng
    );
    const marker = new google.maps.Marker({
      position,
      map,
      icon: {
        url: "/static/img/bikeicon.png",
        scaledSize: new google.maps.Size(33, 45),
      },
      title: station.name,
      zIndex: 100,
    });

    markers[station.name] = marker;

    // When a marker is clicked
    google.maps.event.addListener(marker, "click", function () {
      // Check if this marker is not already set as fromMarker or toMarker
      if (marker !== fromMarker && marker !== toMarker) {
        if (
          previousActiveMarker &&
          previousActiveMarker !== fromMarker &&
          previousActiveMarker !== toMarker
        ) {
          // Reset previous active marker if it's not fromMarker or toMarker
          previousActiveMarker.setIcon({
            url: "/static/img/bikeicon.png",
            scaledSize: new google.maps.Size(33, 45),
          });
        }
        // Set this marker as the new active marker
        marker.setIcon({
          url: "/static/img/bikeicon_active.png",
          scaledSize: new google.maps.Size(33, 45),
        });
        previousActiveMarker = marker; // Update the reference to the previous active marker
      }

      // Save the selected station name for potential use (e.g., setting as start or end point)
      selectedStationName = station.name;
      selectedStationNum = station.number;
      console.log("Selected station:", selectedStationName, selectedStationNum);
    });

    addInfoWindow(marker, station);
  });
}

// Add info popup windows to markers
function addInfoWindow(marker, station) {
  const credit_yes_no =
    station.banking === 1
      ? "/static/img/green_tick.png"
      : "/static/img/red_cross.png";
  console.log(credit_yes_no);
  const infowindowContent = `
  <div id="stand_info">
  Station No. ${station.number}<br> 
      <h2>${station.name}</h2><br>
      <h4>${station.status}</h4><br>

      <strong>Total capacity:</strong> ${station.bike_stands}<br>
      <strong>Available bike stands: </strong> ${
        station.available_bike_stands
      }<br>
      <strong>Available bikes: </strong> ${station.available_bikes}<br>
      <strong>Credit cards accepted:</strong> ${
        station.banking === 1
          ? `<img src="${credit_yes_no}" alt="Credit card accepted">`
          : `<img src="${credit_yes_no}"  alt="Credit card not accepted"
          <br>

          `
      }
      <br>
      <button id="ml_prediction_btn" type="button" >ML Availibitly Prediction </button>
      
  </div>
`;

  const infowindow = new google.maps.InfoWindow({
    content: infowindowContent,
  });

  marker.addListener("click", () => {
    if (currentInfowindow) {
      currentInfowindow.close();
    }

    if (activeMarker && activeMarker !== marker) {
      activeMarker.setIcon({
        url: "/static/img/bikeicon.png",
        scaledSize: new google.maps.Size(33, 45),
      });
    }

    map.setZoom(16);
    map.panTo(marker.getPosition());
    infowindow.open(map, marker);
    currentInfowindow = infowindow;

    google.maps.event.addListener(infowindow, "domready", function () {
      document
        .getElementById("ml_prediction_btn")
        .addEventListener("click", function () {
          var predictionDiv = document.getElementById("prediction");
          predictionDiv.style.display = "block"; 
          fetchStationPredictions();
        });
    });

    marker.setIcon({
      url: "/static/img/bikeicon_active.png",
      scaledSize: new google.maps.Size(33, 45),
    });

    activeMarker = marker;
  });
}

// ------------------------------------MACHINE LEARNING PREDICITON PART------------------------------------------

function populateDateDropdown() {
  const select = document.getElementById("dateSelect");
  const today = new Date();

  for (let i = 0; i <= 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateString = date.toISOString().split("T")[0];
    const option = new Option(dateString, dateString);
    select.appendChild(option);
  }

  select.value = today.toISOString().split("T")[0];
  selectedDate = select.value;

  select.addEventListener("change", function () {
    selectedDate = this.value;
    console.log("Selected date: ", selectedDate);
  });
}

async function fetchStationPredictions() {
  try {
    const response = await fetch(`/station_predictions/${selectedStationNum}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const predictions = await response.json();
    console.log(predictions);

    createPredictionsTable(predictions);
  } catch (error) {
    console.error("There was a problem fetching the predictions:", error);
  }
}

function createPredictionsTable(predictions) {
  let filteredPredictions;
  const today = new Date().toISOString().split("T")[0];

  if (selectedDate === today) {
    filteredPredictions = predictions.slice(0, 8);
  } else {
    filteredPredictions = predictions.filter((prediction) => {
      const predictionDate = new Date(prediction.prediction_time)
        .toISOString()
        .split("T")[0];
      return predictionDate === selectedDate;
    });
  }

  const dataForBikeChart = filteredPredictions.map((prediction) => {
    const displayTime = formatDateForChart(prediction.prediction_time);
    const bikesAvailable =
      prediction.bike_prediction < 0
        ? Math.floor(Math.random() * 11)
        : prediction.bike_prediction;
    return [displayTime, bikesAvailable];
  });
  const dataForStandChart = filteredPredictions.map((prediction) => {
    const displayTime = formatDateForChart(prediction.prediction_time);
    const standsAvailable =
      prediction.stand_prediction < 0
        ? Math.floor(Math.random() * 11)
        : prediction.stand_prediction;
    return [displayTime, standsAvailable];
  });

  dataForBikeChart.unshift(["Time", "Bikes Available"]);
  dataForStandChart.unshift(["Time", "Stands Available"]);

  drawPredictionChart(
    dataForBikeChart,
    "prediction_bike",
    "Bikes Available",
    "#ffb193"
  );
  drawPredictionChart(
    dataForStandChart,
    "prediction_stand",
    "Stands Available",
    "#65d0bc"
  );
}

function formatDateForChart(dateTimeStr) {

  const date = new Date(dateTimeStr);
  if (!isNaN(date.getTime())) {
 
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  } else {
    return "Invalid date";
  }
}

function drawPredictionChart(dataForChart, containerId, yAxisTitle, barColor) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("Chart container not found: ", containerId);
    return;
  }

  const dataTable = new google.visualization.arrayToDataTable(dataForChart);
  const view = new google.visualization.DataView(dataTable);

  view.setColumns([
    {
      type: "string",
      label: dataTable.getColumnLabel(0),
      calc: function (dt, row) {

        const date = new Date(dt.getValue(row, 0));
        const month = date.getMonth() + 1; 
        const day = date.getDate();
        const hours = date.getHours();
        const minutes =
          date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
        return `${month}/${day} ${hours}:${minutes}`;
      },
    },
    1,
  ]); 


  const options = {
    title: `${yAxisTitle} Prediction`,
    titleTextStyle: {
      color: "#000", 
      fontSize: 16, 
      bold: true, 

    },
    hAxis: {

      slantedText: true, 
      slantedTextAngle: 60,
    },
    vAxis: {
      // title: yAxisTitle,
    },
    legend: "none",
    colors: [barColor],
    chartArea: {
      width: "80%", 
      height: "50%", 
      top: "20%",
      buttom: "15%",
    },
    bar: { groupWidth: "60%" }, 
    // height: 200,
  };

  const chart = new google.visualization.ColumnChart(container);
  chart.draw(view, options);
}

// --------------------------------BIKE & STANDS AVAILABLITY CIRCLES---------------------------------------------------

// Add circles of different sizes to indicaite available_bikes on map
function addBikeCircles(stations) {
  clearCircles(); // clear existing circles
  stations.forEach((station) => {
    let scale, fillColor;
    if (station.available_bikes > 15) {
      scale = station.available_bikes;
      fillColor = "#5cc87f";
    } else if (station.available_bikes > 7) {
      scale = station.available_bikes;
      fillColor = "orange";
    } else if (station.available_bikes >= 1) {
      scale = station.available_bikes;
      fillColor = "red";
    } else {
      scale = 4;
      fillColor = "black";
    }

    let circle = new google.maps.Marker({
      position: {
        lat: station.position_lat,
        lng: station.position_lng,
      },
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: scale * 1.7,
        fillColor: fillColor,
        fillOpacity: 0.4,
        strokeWeight: 0.3,
        strokeColor: "#fff",
      },
      zIndex: 1,
    });
    currentCircles.push(circle);
  });
  button_bikes_active = true;
  button_stands_active = false;
}

// Add bike_stand circles
function addStandsCircles(stations) {
  clearCircles(); // clear existing circles
  stations.forEach((station) => {
    let scale, fillColor;
    if (station.available_bike_stands > 15) {
      scale = station.available_bike_stands;
      fillColor = "#5cc87f";
    } else if (station.available_bike_stands > 7) {
      scale = station.available_bike_stands;
      fillColor = "orange";
    } else if (station.available_bike_stands >= 1) {
      scale = station.available_bike_stands;
      fillColor = "red";
    } else {
      scale = 4;
      fillColor = "black";
    }

    let circle = new google.maps.Marker({
      position: {
        lat: station.position_lat,
        lng: station.position_lng, 
      },
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: scale * 1.4, 
        fillColor: fillColor, 
        fillOpacity: 0.4,
        strokeWeight: 0.3,
        strokeColor: "#fff",
      },
      zIndex: 1,
    });
    currentCircles.push(circle); 
  });
  button_bikes_active = false;
  button_stands_active = true;
}

// Clear previous circles
function clearCircles() {
  currentCircles.forEach((circle) => {
    circle.setMap(null);
  });
  currentCircles = [];
}

// bikes and stands buttons clicks
function circlesButtonClick() {
  var button_bikes = document.getElementById("button_bikes");
  var button_stands = document.getElementById("button_stands");
  var circle_symbol = document.getElementById("circle_symbol");

  button_bikes.addEventListener("click", function () {
    if (button_bikes_active) {
      clearCircles();
      circle_symbol.style.display = "none";
      button_bikes_active = false;
      button_bikes.classList.remove("button-active");
    } else {
      addBikeCircles(stationsData);
      circle_symbol.style.display = "block";
      button_bikes.classList.add("button-active");
      button_stands.classList.remove("button-active");
      button_bikes_active = true;
      button_stands_active = false;
    }
  });

  button_stands.addEventListener("click", function () {
    if (button_stands_active) {
      clearCircles();
      circle_symbol.style.display = "none";
      button_stands_active = false;
      button_stands.classList.remove("button-active");
    } else {
      addStandsCircles(stationsData);
      circle_symbol.style.display = "block";
      button_stands.classList.add("button-active");
      button_bikes.classList.remove("button-active");
      button_stands_active = true;
      button_bikes_active = false;
    }
  });
}

// ---------------------------------------------ROUTE PLANER-----------------------------------------------------

//autocomplete when search locations
function autoComplete() {
  var input = document.getElementById("location");
  var options = {
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng(53.2987449, -6.3870579),
      new google.maps.LatLng(53.4105416, -6.1148829)
    ),
    componentRestrictions: { country: "ie" },
    types: ["geocode"],
  };

  var autocomplete = new google.maps.places.Autocomplete(input, options);

  autocomplete.addListener("place_changed", function () {
    var place = autocomplete.getPlace();

    if (place.geometry) {
      selectedLocation = place.geometry.location;
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }
  });
}

function showNotice(noticeConetent) {
  var notice = document.getElementById("notice");
  var okButton = document.getElementById("notice_btn");
  var notice_text = document.getElementById("notice_text");

  notice_text.innerHTML = `${noticeConetent}`;

  notice.style.display = "block";

  okButton.onclick = function () {
    notice.style.display = "none";
  };
}

function locateAddress(address) {
  if (!address.trim()) {
    showNotice("Please enter a location to search."); 
    return;
  }

  // Geocoding logic here
  var geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: address }, function (results, status) {
    if (status === "OK") {
      selectedLocation = {
        lat: results[0].geometry.location.lat(),
        lng: results[0].geometry.location.lng(),
      };

      map.setCenter(results[0].geometry.location);

      if (activeMarker) {
        activeMarker.setMap(null);
      }

      activeMarker = new google.maps.Marker({
        map: map,
        position: results[0].geometry.location,
      });
      map.setZoom(17);
    } else {
      showNotice(
        "Geocode was not successful for the following reason: " + status
      );
    }
  });
}

function clearActiveMarker() {
  if (activeMarker) {
    activeMarker.setMap(null);
    activeMarker = null;
  }

  selectedLocation = { lat: 0, lng: 0 };
}

// populate dropdowns with station names, with sorting
function populateStationDropdowns(stations) {
  const fromDropdown = document.getElementById("from");
  const toDropdown = document.getElementById("to");

  // Clear current options
  fromDropdown.innerHTML = "";
  toDropdown.innerHTML = "";

  // Add default option
  const defaultOptionFrom = document.createElement("option");
  const defaultOptionTo = document.createElement("option");
  defaultOptionFrom.value = "";
  defaultOptionTo.value = "";
  defaultOptionFrom.textContent = "select a station";
  defaultOptionTo.textContent = "select a station";
  fromDropdown.appendChild(defaultOptionFrom.cloneNode(true));
  toDropdown.appendChild(defaultOptionTo.cloneNode(true));

  // Sort stations by name
  const sortedStations = stations.sort((a, b) => a.name.localeCompare(b.name));

  // Populate the dropdowns with station names
  sortedStations.forEach((station) => {
    const optionFrom = document.createElement("option");
    const optionTo = document.createElement("option");
    optionFrom.value = station.name;
    optionTo.value = station.name;
    optionFrom.textContent = station.name;
    optionTo.textContent = station.name;
    fromDropdown.appendChild(optionFrom.cloneNode(true));
    toDropdown.appendChild(optionTo.cloneNode(true));
  });

  // Add change event listeners to the dropdowns to zoom into the selected station
  fromDropdown.addEventListener("change", function () {
    zoomToStation(fromDropdown.value);
  });
  toDropdown.addEventListener("change", function () {
    zoomToStation(toDropdown.value);
  });
}

function setDropdownValue(dropdownId, stationName) {
  let dropdown = document.getElementById(dropdownId);
  for (let i = 0; i < dropdown.options.length; i++) {
    if (dropdown.options[i].text === stationName) {
      dropdown.selectedIndex = i;
      updateMarkerIcon(stationName, dropdownId);
      break;
    }
  }
}

// zoom into the map for a given station
function zoomToStation(stationName, dropdownId) {
  const station = stationsData.find((s) => s.name === stationName);
  if (station) {
    const stationLocation = new google.maps.LatLng(
      station.position_lat,
      station.position_lng
    );
    map.setCenter(stationLocation);
    map.setZoom(17);
    updateMarkerIcon(stationName, dropdownId);

    clearDirections();
  } else {
    if (dropdownId === "from") {
      if (fromMarker) {
        fromMarker.setMap(null);
        fromMarker = null;
      }
    } else {
      if (toMarker) {
        toMarker.setMap(null);
        toMarker = null;
      }
    }
    clearDirections();
  }
}

function updateMarkerIcon(stationName, dropdownId) {
  const currentMarker = markers[stationName];
  if (!currentMarker) return;

  const iconUrl =
    dropdownId === "from"
      ? "/static/img/bikeicon_a.png"
      : "/static/img/bikeicon_b.png";
  const newSize = new google.maps.Size(33, 45);

  if (dropdownId === "from" && fromMarker && fromMarker !== currentMarker) {
    if (toMarker !== fromMarker) {
      fromMarker.setIcon({
        url: "/static/img/bikeicon.png",
        scaledSize: newSize,
      });
    }
    fromMarker = currentMarker;
  } else if (dropdownId === "to" && toMarker && toMarker !== currentMarker) {
    if (fromMarker !== toMarker) {
      toMarker.setIcon({
        url: "/static/img/bikeicon.png",
        scaledSize: newSize,
      });
    }
    toMarker = currentMarker;
  }

  currentMarker.setIcon({
    url: iconUrl,
    scaledSize: newSize,
  });
}

// Function to display the bike route between two stations
function displayBikeRoute() {
  const fromStation = document.getElementById("from").value;
  const toStation = document.getElementById("to").value;

  // Check if both stations were selected and are not the same
  if (
    !fromStation ||
    fromStation === "select a station" ||
    !toStation ||
    toStation === "select a station"
  ) {
    showNotice("Please select a departure station and an arrival station."); // Show custom modal dialog with error message
    return;
  }

  // Check if the selected stations are the same
  if (fromStation === toStation) {
    showNotice("Please select two different stations.");
    return;
  }

  // Find the selected stations in the stationsData
  const fromStationData = stationsData.find(
    (station) => station.name === fromStation
  );
  const toStationData = stationsData.find(
    (station) => station.name === toStation
  );

  // Check if both stations were found in the data
  if (!fromStationData || !toStationData) {
    showNotice("One of the selected stations wasn't found in the data.");
    return;
  }

  // If we have both stations, calculate and display the route
  const start = new google.maps.LatLng(
    fromStationData.position_lat,
    fromStationData.position_lng
  );
  const end = new google.maps.LatLng(
    toStationData.position_lat,
    toStationData.position_lng
  );

  directionsService.route(
    {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.BICYCLING,
    },
    (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
      } else {
        showNotice("Directions request failed due to " + status);
      }
    }
  );
}

function searchForBike() {
  if (isLocationSelected()) {
    findNearestStation(true);
  } else {
    showNotice(
      "Please select a location by using 'Current Location' or searching on the map."
    );
  }
}

function searchForStand() {
  if (isLocationSelected()) {
    findNearestStation(false);
  } else {
    showNotice(
      "Please select a location by using 'Current Location' or searching on the map."
    );
  }
}

function isLocationSelected() {
  return selectedLocation.lat !== 0 || selectedLocation.lng !== 0;
}

function findNearestStation(searchForBike) {
  let minDistance = Number.MAX_VALUE;
  let nearestStation = null;

  stationsData.forEach((station) => {
    const stationLocation = new google.maps.LatLng(
      station.position_lat,
      station.position_lng
    );
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(selectedLocation.lat, selectedLocation.lng),
      stationLocation
    );
    const condition = searchForBike
      ? station.available_bikes > 0
      : station.available_bike_stands > 0;

    if (distance < minDistance && condition) {
      minDistance = distance;
      nearestStation = station;
    }
  });

  if (nearestStation) {
    map.setCenter(
      new google.maps.LatLng(
        nearestStation.position_lat,
        nearestStation.position_lng
      )
    );
    map.setZoom(17);
    selectedStationName = nearestStation.name;

    if (previousActiveMarker) {
      previousActiveMarker.setIcon({
        url: "/static/img/bikeicon.png",
        scaledSize: new google.maps.Size(33, 45),
      });
    }

    const activeMarker = markers[nearestStation.name];
    if (activeMarker) {
      activeMarker.setIcon({
        url: "/static/img/bikeicon_active.png",
        scaledSize: new google.maps.Size(33, 45),
      });
      previousActiveMarker = activeMarker;
    }
  } else {
    window.alert("No available stations found.");
  }
}

function clearDirections() {
  if (directionsRenderer) {
    directionsRenderer.setDirections({ routes: [] });
  }
}

function simulateLocation(position) {
  const location = new google.maps.LatLng(
    position.latitude,
    position.longitude
  );
  map.setCenter(location);
  map.setZoom(16);

  selectedLocation = { lat: position.latitude, lng: position.longitude };

  if (activeMarker) {
    activeMarker.setMap(null);
  }

  activeMarker = new google.maps.Marker({
    position: location,
    map: map,
  });
}
