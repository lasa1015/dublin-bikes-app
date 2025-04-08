from flask import Flask, render_template, jsonify
from sqlalchemy import create_engine, text
import traceback
import functools
from config import Config
from flask import request, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix
import json


app = Flask(__name__, static_url_path='/static')
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)  
app.config.from_object(Config)


def get_engine():
    engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'], echo=True)
    return engine



@app.route("/stations")
@functools.lru_cache(maxsize=128)
def get_stations():
    engine = get_engine()
    sql = "SELECT * FROM dbbikes.dbstation;"
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(sql)).fetchall()
            print('#found {} stations', len(rows), rows)
            return jsonify([row._asdict() for row in rows])
    except Exception as e:
        print("Error:", e)
        print(traceback.format_exc())
        return "error in get_stations", 404


@app.route("/weather")
@functools.lru_cache(maxsize=128)
def get_weather():
    engine = get_engine()
    sql = "SELECT * FROM dbbikes.weatherdata ORDER BY id DESC LIMIT 1;"
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(sql)).fetchall()  
            print('【Found the last row of weather data in RDS】', rows)
            if rows:
                weather_data = [row._asdict() for row in rows][0]  
                return jsonify(weather_data)
            else:
                return jsonify({"error": "No weather data found"}), 404
    except Exception as e:
        print("Error:", e)
        print(traceback.format_exc())
        with app.app_context():
            return jsonify({"error": "error in get_weather"}), 404



@app.route("/weather_forecast")
@functools.lru_cache(maxsize=128)
def get_weather_forecast():
    
    engine = get_engine()
    sql = "SELECT * FROM dbbikes.weather_forecast;"
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(sql)).fetchall()
            print('【!!!!Found weather forecast data!!!!!】')
          
            weather_forecast_data = [row._asdict() for row in rows]
         
            # print(weather_forecast_data)

            return jsonify(weather_forecast_data)
            
    except Exception as e:
        print("Error:", e)
        print(traceback.format_exc())
        return  jsonify({"error": "error in get_weather"}), 404


@app.route("/airquality")
@functools.lru_cache(maxsize=128)
def get_airquality():
    engine = get_engine()
    sql = "SELECT * FROM dbbikes.airquality;"
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(sql)).fetchall()  
            print('Found the last row of air quality data in RDS', rows)
            if rows:
                
                air_quality_data = [row._asdict() for row in rows][0]
                return jsonify(air_quality_data)
            else:
                return jsonify({"error": "No air quality data found"}), 404
    except Exception as e:
        print("Error:", e)
        print(traceback.format_exc())
        return jsonify({"error": "error in get_airquality"}), 404


# Use dynamic routing to get predictions for a specific station_id
@app.route("/station_predictions/<int:station_id>")
@functools.lru_cache(maxsize=128)
def get_station_predictions(station_id):
    engine = get_engine()
    sql = "SELECT * FROM dbbikes.station_predictions WHERE station_id = :station_id;"
    
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(sql), {'station_id': station_id}).fetchall()
            print(f'【!!!!Found predictions for station {station_id}!!!!!】')
                      
            station_predictions_data = [row._asdict() for row in rows]
            
            # print(station_predictions_data)

            return jsonify(station_predictions_data)
            
    except Exception as e:
        print("Error:", e)
        print(traceback.format_exc())
        return "Error in get_station_predictions", 404




@app.route('/')
def contact():
    return render_template('index.html')


if __name__ == '__main__':
     app.run(debug=True, host="0.0.0.0", port=8080)
    # get_stations()
    # get_weather_forecast()
    # get_weather()
    # predict_bike_availability()
  
