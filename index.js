// This example requires the Places library. Include the libraries=places
// parameter when you first load the API. For example:
// <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">

let localStorage = window.localStorage;

function generateHtmlPracInfo(body) {
    return `
    <style>
    h2.customH2 {font-weight: 300}
    </style>
    <div class="customWindow">
    <h1 class="customH1">${body.main.practiceName}</h1>
    <h2 class="customH2">${body.main.address}</h2>
    ${body.languages.map(language => `<p>${language}</p>`).join("")}
    ${body.main.telehealth ? "<h2>Telehealth Available</h2>" : ""} 
    ${body.main.bulkbills ? "<h2>Bulk bills</h2>" : ""} 
    ${body.main.rating ? `<h2>${body.main.rating} approval rating</h2>` : ""} 

    </div>
    `;
}

function initMap() {

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
    
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(card);
    const autocomplete = new google.maps.places.Autocomplete(input, options);
    // Bind the map's bounds (viewport) property to the autocomplete object,
    // so that the autocomplete requests use the current map bounds for the
    // bounds option in the request.
    autocomplete.bindTo("bounds", map);
    const infowindowContent = document.getElementById("infowindow-content");
    const marker = new google.maps.Marker({
      map,
      anchorPoint: new google.maps.Point(0, -29),
    });
    autocomplete.addListener("place_changed", () => {
      infowindow.close();
      marker.setVisible(false);
      const place = autocomplete.getPlace();
      const info = place.formatted_address.split(", ");
      let suburbAndPostcode = info[0];
      suburbAndPostcode = suburbAndPostcode.split(" ");
      let postcode = suburbAndPostcode[suburbAndPostcode.length - 1];
      let state = suburbAndPostcode[suburbAndPostcode.length - 2];
      let suburb = suburbAndPostcode.slice(0, suburbAndPostcode.length - 2).join("-");

      if (!place.geometry || !place.geometry.location) {
        // User entered the name of a Place that was not suggested and
        // pressed the Enter key, or the Place Details request failed.
        window.alert("No details available for input: '" + place.name + "'");
        return;
      }

      function codeAddress(map, body) {
        const geocoder = new google.maps.Geocoder();
        console.log(body);
        geocoder.geocode( { 'address': body.main.address}, function(results, status) {
          if (status == 'OK') {
            map.setCenter(results[0].geometry.location);
            var marker = new google.maps.Marker({
                map: map,
                position: results[0].geometry.location,
                icon: "doc.svg"
            });
            infowindow.setContent(generateHtmlPracInfo(body));
            marker.addListener("click", () => {
                infowindow.open(map, marker);
              });
    
    
          } else {
            console.log('Geocode was not successful for the following reason: ' + status);
          }
    
          
        });
    }

    function codeAddresses(map, infoParsed) {
        for (let i = 0 ; i < infoParsed.length; i++) {
            let info = infoParsed[i];
            console.log(info);
            codeAddress(map, info);
        }
    }
    
  
      // If the place has a geometry, then present it on a map.
      if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
      } else {
        map.setCenter(place.geometry.location);
        map.setZoom(17);
      }

      let formData = new FormData()
      formData.append('suburb', suburb);
      formData.append('state', state);
      formData.append('postcode', postcode);

      // check local storage

      let infoFromStorage = localStorage.getItem(state + postcode + suburb);
      if (infoFromStorage) {
        codeAddresses(map, JSON.parse(infoFromStorage));
      }
      else {
        fetch("scraper.php", { method: 'POST', body: formData })
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
                }
                else if (i == infoParsed.length - 1) {
                  infoParsed[i] = "{" + infoParsed[i];
                }
                else {
                  infoParsed[i] = "{" + infoParsed[i] + "}";
                }
            }
            infoParsed = infoParsed.join(",");
            localStorage.setItem(state + postcode + suburb, infoParsed);
            codeAddresses(map, JSON.parse(infoParsed));
        });
      }
    });
  

  }