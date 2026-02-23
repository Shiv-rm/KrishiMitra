const x = document.getElementById("demo");

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(success, error);
    } else {
        x.innerHTML = "Geolocation is not supported by this browser.";
    }
}
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
function success(position) {
    latitude = String(position.coords.latitude);
    longitude = String(position.coords.longitude);
    const dsendtobackend=debounce(sendtobackend,300);
    dsendtobackend(latitude,longitude);
}

async function sendtobackend(latitude, longitude) {
    const url = "/post";

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
                Latitude:latitude,
                Longitude:longitude,
             })
        });
        const result = await response.json();
        const body = result["Processed"]
        output.innerHTML = body;
        //console.log("This is the body : ",body)
    }
    catch (error) {
        console.error(error.message)
    }
 }
function error(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            x.innerHTML = "User denied the request for Geolocation."
            break;
        case error.POSITION_UNAVAILABLE:
            x.innerHTML = "Location information is unavailable."
            break;
        case error.TIMEOUT:
            x.innerHTML = "The request to get user location timed out."
            break;
        case error.UNKNOWN_ERROR:
            x.innerHTML = "An unknown error occurred."
            break;
    }
}