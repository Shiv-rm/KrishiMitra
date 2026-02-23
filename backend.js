const express = require('express')
const cors = require('cors');
var request = require('request-promise');
const app = express()
const port = 3000

app.use(express.json())
app.use(cors())
app.use(express.static('static'))

async function getph(latitude, longitude) {
  var data = {
    Latitude: latitude,
    Longitude: longitude
  }

  var options = {
    method: 'POST',
    uri: 'http://127.0.0.1:5000/findph',
    body: data,
    // Automatically stringifies
    // the body to JSON 
    json: true
  };

  var sendrequest = await request(options)

    // The parsedBody contains the data
    // sent back from the Flask server 
    .then(function (parsedBody) {
      console.log(parsedBody);

      // You can do something with
      // returned data
    })
    .catch(function (err) {
      console.log(err);
    });
    sendrequest
}
app.post('/post', (req, res) => {
  const data = req.body;
  console.log("Latitude : " + data.Latitude + " Longitude : " + data.Longitude);
  getph(data.Latitude,data.Longitude)
  res.json({
    Processed: "The data has successfully been received !"
  });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
