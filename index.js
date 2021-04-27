let localStorage = window.localStorage;

/* goals for today 
* let's add marker position to local storage to avoid calling API over and over again. 
*/


function generateHtmlPracInfo(body) {
  return `
    <style>
    h2.customH2 {font-weight: 300}
    </style>
    <div class="customWindow">
    <h1 class="customH1">${body.main.practiceName}</h1>
    <h2 class="customH2">${body.main.address}</h2>
    ${body.languages.map((language) => `<p>${language}</p>`).join("")}
    ${body.main.telehealth ? "<h2>Telehealth Available</h2>" : ""} 
    ${body.main.bulkbills ? "<h2>Bulk bills</h2>" : ""} 
    ${body.main.rating ? `<h2>${body.main.rating} approval rating</h2>` : ""} 
    </div>
    `;
}

function initMap() {
  let currInfo;
  let filteredInfo;
  let markers = [];
  let originalMarkers = [];

  const infowindow = new google.maps.InfoWindow();
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: -37.8, lng: 144.96 },
    zoom: 13,
  });
  const card = document.getElementById("pac-card");
  const input = document.getElementById("pac-input");
  const options = {
    componentRestrictions: { country: "au" },
    fields: ["formatted_address", "geometry", "name"],
    origin: map.getCenter(),
    strictBounds: false,
    types: ["(regions)"],
  };

  function clearMarkers() {
    for (let i = 0; i < markers.length; i++) {
      markers[i].setVisible(false);
    }
  }

  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(card);
  const autocomplete = new google.maps.places.Autocomplete(input, options);
  // Bind the map's bounds (viewport) property to the autocomplete object,
  // so that the autocomplete requests use the current map bounds for the
  // bounds option in the request.
  autocomplete.bindTo("bounds", map);
  autocomplete.addListener("place_changed", () => {
    infowindow.close();
    clearMarkers();
    const place = autocomplete.getPlace();
    const info = place.formatted_address.split(", ");
    let suburbAndPostcode = info[0];
    suburbAndPostcode = suburbAndPostcode.split(" ");
    let postcode = suburbAndPostcode[suburbAndPostcode.length - 1];
    let state = suburbAndPostcode[suburbAndPostcode.length - 2];
    let suburb = suburbAndPostcode.slice(0, suburbAndPostcode.length - 2).join("-");

    const teleToggle = document.getElementById("teleToggle");
    const bulkToggle = document.getElementById("bulkToggle");

    // adds marker to the list 
    function addMarker(body) {
      var marker = new google.maps.Marker({
        map: map,
        position: {lat:body.lat, lng:body.lng}
      });
      // adds event listener
      marker.addListener("click", () => {
        infowindow.setContent(generateHtmlPracInfo(body));
        infowindow.open(map, marker);
      });
      markers.push(marker);
    }

    async function codeAddress(map, body) {
      return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode(
        { address: body.main.address },
        function (results, status) {
          if (status == "OK") {
            map.setCenter(results[0].geometry.location);
            resolve(results[0].geometry.location);
          } else {
            console.log(
              "Geocode was not successful for the following reason: " + status
            );
            reject(status);
          }
        }
      );});
    }

    function codeAddresses(state, suburb, postcode, map, infoParsed) {
      let promises = [];
      for (let i = 0; i < infoParsed.length; i++) {
        let info = infoParsed[i];
        promises.push(codeAddress(map, info));
      }
      Promise.all(promises).then(pos=> {
        for (let i = 0; i < pos.length; i++) {
          infoParsed[i].lat = pos[i].lat();
          infoParsed[i].lng = pos[i].lng();
          addMarker(infoParsed[i]);
        }
        localStorage.setItem(state+suburb+postcode, JSON.stringify(infoParsed));

      })
    }
    
    teleToggle.addEventListener("change", function () {
      if (this.checked) {
        clearMarkers();

        // the filter is applied
        filteredInfo = currInfo.filter((info) => info.main.telehealth);
        let currPositions = [];
        // what about existing markers 
        filteredInfo.forEach(info=>currPositions.push({"lat": info.lat, "lng": info.lng}));
        originalMarkers = markers;
        markers = markers.filter((marker) => {
          return currPositions.some(coordinate => coordinate["lat"] ==  marker.position.lat() 
          && coordinate["lng"] ==  marker.position.lng())
        })
      }
      else {
        filteredInfo = currInfo;
        markers = originalMarkers;
      }
      markers.forEach(marker=>marker.setVisible(true));

    })

    bulkToggle.addEventListener("change", () => console.log("BULKTOGGLED"));

    if (!place.geometry || !place.geometry.location) {
      // User entered the name of a Place that was not suggested and
      // pressed the Enter key, or the Place Details request failed.
      window.alert("No details available for input: '" + place.name + "'");
      return;
    }

    // If the place has a geometry, then present it on a map.
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }

    let formData = new FormData();
    formData.append("suburb", suburb);
    formData.append("state", state);
    formData.append("postcode", postcode);

    // check local storage
    let infoFromStorage = localStorage.getItem(state+suburb+postcode);
    if (infoFromStorage) {
      currInfo = JSON.parse(infoFromStorage);
      filteredInfo = currInfo;
      for (let i = 0; i < currInfo.length; i++) {
        addMarker(currInfo[i]);
      }
    } else {
      fetch("scraper.php", { method: "POST", body: formData })
        .then(function (response) {
          return response.text();
        })
        .then(function (body) {
          // fix the dodgy JSOn ss
          let infoParsed = "[" + body + "]";
          infoParsed = infoParsed.split("}{");
          for (let i = 0; i < infoParsed.length; i++) {
            if (i == 0) {
              infoParsed[i] = infoParsed[i] + "}";
            } else if (i == infoParsed.length - 1) {
              infoParsed[i] = "{" + infoParsed[i];
            } else {
              infoParsed[i] = "{" + infoParsed[i] + "}";
            }
          }
          infoParsed = infoParsed.join(",");
          currInfo = JSON.parse(infoParsed);
          filteredInfo = currInfo;
          // adds info to local storage 
          codeAddresses(state, suburb, postcode, map, filteredInfo);
        });
    }
  });
}
