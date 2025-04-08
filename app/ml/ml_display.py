import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import datetime
from joblib import load
import pandas as pd
import os
from flask import Flask, render_template, jsonify
from sqlalchemy import create_engine, text
import traceback
import functools
from config import Config
from flask_cors import CORS
from flask import request, jsonify
import json
import time

import os


print("Current working directory before:", os.getcwd())

os.chdir('/home/ubuntu/dbbikes') 

print("Current working directory after:", os.getcwd())

# the newest total bike stands and station_id data from data prepare
station_total_stands = {1: 31, 2: 20, 3: 20, 4: 20, 5: 40, 6: 20, 7: 29, 
                        8: 30, 9: 23, 10: 16, 11: 30, 12: 20, 13: 30, 14: 30, 
                        15: 16, 16: 20, 17: 20, 18: 30, 19: 30, 20: 30, 21: 30, 
                        22: 20, 23: 30, 24: 20, 25: 30, 26: 20, 27: 20, 28: 30, 
                        29: 28, 30: 18, 31: 20, 32: 29, 33: 23, 34: 30, 35: 30, 
                        36: 39, 37: 30, 38: 40, 39: 20, 40: 21, 41: 20, 42: 30, 
                        43: 30, 44: 30, 45: 30, 47: 40, 48: 40, 49: 40, 50: 40, 
                        51: 40, 52: 32, 53: 40, 54: 33, 55: 36, 56: 40, 57: 23, 
                        58: 40, 59: 20, 60: 30, 61: 25, 62: 40, 63: 35, 64: 40, 
                        65: 40, 66: 39, 67: 40, 68: 40, 69: 40, 71: 40, 72: 31, 
                        73: 30, 74: 30, 75: 39, 76: 38, 77: 29, 78: 40, 79: 27, 
                        80: 40, 82: 22, 83: 40, 84: 30, 85: 35, 86: 38, 87: 38, 
                        88: 30, 89: 40, 90: 40, 91: 30, 92: 40, 93: 40, 94: 40, 
                        95: 40, 96: 30, 97: 40, 98: 40, 99: 30, 100: 25, 101: 30, 
                        102: 40, 103: 40, 104: 40, 105: 36, 106: 40, 107: 40, 
                        108: 35, 109: 29, 110: 40, 111: 40, 112: 30, 113: 40, 
                        114: 40, 115: 30, 116: 30, 117: 40}


station_id_list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117]


def use_ML_moldes(thisDirRow, station_id): # Type: thisDirRow: dictionary(single row of the data) ; station_id : int
    
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    model_dir = os.path.join(project_root, 'ML_models')
    model_path = os.path.join(model_dir, f'model{station_id}.joblib')

    
    # Check if the model path exists
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")

    # Load the model
    model = load(model_path)
    dt = thisDirRow['dt_txt']
    day_of_week_iso = dt.isoweekday()  # Monday to Sunday = 1 to 7
    data = {
        'index': 1,
        'weather_id': thisDirRow['weather_id'],
        'temp': thisDirRow['temp'],
        'feels_like': thisDirRow['feels_like'],
        'temp_min': thisDirRow['temp_min'],
        'temp_max': thisDirRow['temp_max'],
        'pressure': thisDirRow['pressure'],
        'humidity': thisDirRow['humidity'],
        'wind_speed': thisDirRow['wind_speed'],
        'clouds': thisDirRow['clouds'],
        'total_bike_stands': station_total_stands[station_id],
        'hour': dt.hour,
        'day_of_week': day_of_week_iso
    }
    dataFrame = pd.DataFrame(data, index=[0])
    predicted_bikes = model.predict(dataFrame)
    return predicted_bikes

# Return a dirc stored the predict results for every station (in one input)
def stations_ml(thisDirRow):# Type: thisDirRow: dictionary(single row of the data) ;
    pred_dir = {} 
    for id in station_id_list:
        predicted_bikes = int(use_ML_moldes(thisDirRow, id)[0])
        pred_dir[id] = predicted_bikes
    return pred_dir 

def predict_for_aDay(Dir_aDay):  # Type: Dir_aDay: dictionary(nine row of the input data, contain datas during 24 hours)
    pred_list_aDay = []
    for dirRow in Dir_aDay:
        pred_dir = {'predictions': stations_ml(dirRow), 'time': dirRow['dt_txt']}
        pred_list_aDay.append(pred_dir)
    return pred_list_aDay


# Display function to list the 24h prediction datas for one station
def predict_datas_per_station(pred_list_aDay, station_id):  # Type: pred_list_aDay: output list from func predict_for_aDay  ; station_id : int
    result_pred_list = []
    for entry in pred_list_aDay:
        pred_time = entry['time']
        pred_result = entry['predictions'][station_id]
        result_pred_list.append({'time': pred_time, 'prediction': pred_result})
    return result_pred_list


def get_engine():
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI, echo=False)
    return engine


# Grab the data from the weather_forecast in the database and input it into the prediction function, then write the prediction result into the station_prediction table in rds
def predict_bike_availability():
    engine = get_engine()
    sql = "SELECT * FROM dbbikes.weather_forecast;"

    try:
    
        with engine.connect() as conn:
           
            transaction = conn.begin()
            try:
         
                rows = conn.execute(text(sql)).fetchall()
                weather_forecast_data_for_predict = [row._asdict() for row in rows]

      
                prediction_results = predict_for_aDay(weather_forecast_data_for_predict)

              
                for station_id in station_id_list:
                    
                    station_predictions = predict_datas_per_station(prediction_results, station_id)


                    index = 1  
                    for prediction in station_predictions:
                        bike_prediction = prediction['prediction']  
                        stand_prediction = station_total_stands[station_id] - bike_prediction
                        conn.execute(text(
                            "INSERT INTO station_predictions (station_id, `index`, bike_prediction, prediction_time, stand_prediction, inserted_at) "
                            "VALUES (:station_id, :index, :bike_prediction, :prediction_time, :stand_prediction, NOW()) "
                            "ON DUPLICATE KEY UPDATE "
                            "bike_prediction = VALUES(bike_prediction), "
                            "prediction_time = VALUES(prediction_time), "
                            "stand_prediction = VALUES(stand_prediction), "
                            "inserted_at = NOW()"
                        ), {
                            'station_id': station_id,
                            'index': index,
                            'bike_prediction': bike_prediction,
                            'prediction_time': prediction['time'],
                            'stand_prediction': stand_prediction
                        })
                        index += 1

                
                transaction.commit()
              
                print('Predictions stored successfully')

            except Exception as e:
              
                print("Error during transaction, rolling back:", e)
               
                transaction.rollback()
              

    except Exception as e:
    
        print("Error connecting to the database:", e)

    engine = get_engine()

    sql = "SELECT * FROM dbbikes.weather_forecast;"

    try:
   
        with engine.connect() as conn:
         
            transaction = conn.begin()
            try:
              
                rows = conn.execute(text(sql)).fetchall()
                weather_forecast_data_for_predict = [row._asdict() for row in rows]

              
                prediction_results = predict_for_aDay(weather_forecast_data_for_predict)

                
                for station_id in station_id_list:
                   
                    station_predictions = predict_datas_per_station(prediction_results, station_id)

                   
                    index = 1  
                    for prediction in station_predictions:
                        # bike_prediction = max(prediction['prediction'], 0)  

                        stand_prediction = station_total_stands[station_id] - prediction['prediction']

                        conn.execute(text(
                            "INSERT INTO station_predictions (station_id, `index`, bike_prediction, prediction_time, stand_prediction, inserted_at) "
                            "VALUES (:station_id, :index, :bike_prediction, :prediction_time, :stand_prediction, NOW()) "
                            "ON DUPLICATE KEY UPDATE "
                            "bike_prediction = VALUES(bike_prediction), "
                            "prediction_time = VALUES(prediction_time), "
                            "stand_prediction = VALUES(stand_prediction), "
                            "inserted_at = NOW()"
                        ), {
                            'station_id': station_id,
                            'index': index,
                            'bike_prediction': prediction['prediction'],
                            'prediction_time': prediction['time'],
                            'stand_prediction': stand_prediction
                        })
                        index += 1

                
                transaction.commit()
             
                print('Predictions stored successfully')

            except Exception as e:
            
                print("Error during transaction, rolling back:", e)
              
                transaction.rollback()
          

    except Exception as e:
   
        print("Error connecting to the database:", e)
  

def main():
    while True:
        predict_bike_availability()
        print("Waiting for the next run...")
        time.sleep(300)  

if __name__ == "__main__":
    main()