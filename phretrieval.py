from flask import Flask, request
import json 
from soilgrids import SoilGrids 
# Setup flask server
app = Flask(__name__) 

@app.route('/findph', methods = ['POST']) 
def findph():
    data = request.get_json() 
    print(data)
    lat=float(data['Latitude'])
    lon=float(data['Longitude'])
    # Data variable contains the 
    # data from the node server
    delta = 0.0005;
    soil = SoilGrids()
    data = soil.get_coverage_data(
        service_id="phh2o",
        coverage_id="phh2o_0-5cm_mean",
        west=lon - delta,
        east=lon + delta,
        south=lat - delta,
        north=lat + delta,
        crs="urn:ogc:def:crs:EPSG::4326",
        width=1,
        height=1,
        output="temp.tif",
    )
    ph=data.values
    print("PH : ",ph)
    # Return data in json format 
    return json.dumps({"PH":ph})
 
if __name__ == "__main__": 
    app.run(port=5000)