/* Data Functions */
function getNeighborhoodData() {
    // Check if Data has Been Updated in the Past Month
    var currentDate = new Date();
    if (localStorage) { // Check if local data is supported
        var lastUpdated = new Date(localStorage.getItem("lastUpdated"));
        var localData = JSON.parse(localStorage.getItem("localNeighboroodData"));
        // See if Data Has been Stored Previously & If it is over a month old
        if (0){//(localStorage.getItem("lastUpdated") != null && lastUpdated.getMonth() >= currentDate.getMonth()) {
            console.log("Data was last updated on " + localStorage.getItem("lastUpdated") + ". Not updating Data.");
            nycNeighborhoodData = localData;
            console.log('Stored Data:', nycNeighborhoodData);
            stopLoader();
        } else {
            console.log("Data was updated on " + localStorage.getItem("lastUpdated") + ". Data will be updated.");
            download_and_store_neighborhood_data();
        }
    }
    else {
        console.log("Local storage not supported. Gathering live data.");
        download_and_store_neighborhood_data();
    }
}

function download_and_store_neighborhood_data() {
    $.ajax({
        type : "GET",
        url : "https://raw.githubusercontent.com/Jordan-Loeser/Purdue-IronHacks-Project/master/data/quandl-neighborhoods-ny.json",
        success : function(result) {

            nycNeighborhoodData = JSON.parse(result);

            // Update Price Data
            for(var k in nycNeighborhoodData) {
               code = nycNeighborhoodData[k].code.toString();
               //getRecentNeighborhoodPriceData(code, k, addToNeighborhoodData); // Add price data to master data
               calculateSafety(k, 1.5, addToNeighborhoodData);
            }

            // Store the Data Locally
            if (localStorage) {
                var dateUpdated = new Date();
                localStorage.setItem("lastUpdated", dateUpdated);
                localStorage.setItem("localNeighboroodData", JSON.stringify(nycNeighborhoodData));
            } else {
                console.log("Local storage is not available.");
            }
            console.log('Updated Data:', nycNeighborhoodData);
            stopLoader();
        },
        error : function(result) {
            console.log("Could not access neighborhood code data.");
            console.log(result);
        }
     });
}

function getNeighborhoodLocation(neighborhood, index, processFunc) {

    name = neighborhood.toLowerCase();
    for (var i = 0; i < neighborhoodMarkers.length ; i++)
    {
        marker = neighborhoodMarkers[i];
        if (marker.title.toLowerCase() === name) {
            processFunc(marker.getPosition().toJSON(), index, "coordinate");
            return;
        }
    }
    console.log("Error`getNeighborhoodLocation()`: No Location Found: " + neighborhood);
}

function getRecentNeighborhoodPriceData(neighborhoodNum, index, processFunc) {
    var quandlApiKey = 'DuYURBziJDiFLYygufyL';
    // Collect Price Data
    var xhr = new XMLHttpRequest();
    var url = "https://www.quandl.com/api/v3/datasets/ZILLOW/N"+neighborhoodNum+"_ZRIAH.json?api_key="+quandlApiKey;
    xhr.onload = function() {
        var json = JSON.parse(this.responseText);
        if(this.status == 200) {
            processFunc([json.dataset.data[0], json.dataset.data[1]], index, "price");
        }
        if(this.status == 404) {
            failedNeighborhoodCodes.push(neighborhoodNum);
        }
    }
    xhr.open("GET", url, false);
    xhr.send();
}

function addToNeighborhoodData(data, index, key) {
    nycNeighborhoodData[index][key] = data;
}

function calculateSafety(index, radiusMiles, processFunc) {
    // http://it.toolbox.com/blogs/enterprise-solutions/constructing-a-weighted-matrix-13125
    /*
    Category                        Weight
    -                               -
    fireScore                       5
    */
    var fireScore = getFireScore(index, radiusMiles, processFunc);
    var schoolSafetyScore = getSchoolSafetyScore(index, radiusMiles, processFunc);
}

function getFireScore(index, radiusMiles, processFunc) {
    /*
    Criteria                       Weight
    # of stations w/in Radius      5
    */
    var radius = radiusMiles * 1609.34; // meters
    var coor = nycNeighborhoodData[index].coordinate;
    var _nCord = new google.maps.LatLng(coor.lat, coor.lng);
    var fireScore = 0;

    //drawCircle(radius, _nCord);

    for(var i = 0; i < fireStationMarkers.length; i++) {
        var _sCord = fireStationMarkers[i].position;
        dist = google.maps.geometry.spherical.computeDistanceBetween(_nCord, _sCord);
        if(dist <= radius) {
            fireScore++;
        }
    }
    fireScore *= 5;
    processFunc(fireScore, index, 'fireScore');
    return fireScore;
}

function getSchoolSafetyScore(index, radiusMiles, processFunc) {
    /*
    Criteria                           Weight
    # of major crimes / avg            5
    # of violent crimes / avg          5
    # of property crimes / avg         3
    */

    // Calculate score for schools in neighborhoods, then average for neighborhood
    var radius = radiusMiles * 1609.34; // meters
    var coor = nycNeighborhoodData[index].coordinate;
    var _nCord = new google.maps.LatLng(coor.lat, coor.lng);
    var safetyScore = 0;
    var numSchools = 0;

    //drawCircle(radius, _nCord);

    for(var i = 0; i < schoolMarkers.length; i++) {
        var _sCord = schoolMarkers[i].position;
        var major, violent, property, schoolScore;
        dist = google.maps.geometry.spherical.computeDistanceBetween(_nCord, _sCord);
        if(dist <= radius) {
            numSchools++;
            major = schoolData[i].major_n;
            violent = schoolData[i].vio_n;
            property = schoolData[i].prop_n;
            schoolScore = (major * 1) + (violent * 1) + (property * 1);
            safetyScore += schoolScore;
        }
    }
    //safetyScore = safetyScore / numSchools;
    processFunc(safetyScore, index, 'safetyScore');
    return safetyScore;
}

function stopLoader() {
    document.body.className = document.body.className.replace("loading","loaded");
    console.log("Loader Stopped!");
}
