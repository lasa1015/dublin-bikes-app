import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import time
import requests
import pymysql
import datetime
from pymysql import Error
from config import Config  


# Database configuration constants
DB_CONFIG = {
    'host': Config.DB_HOST,
    'user': Config.DB_USER,
    'password': Config.DB_PASSWORD,
    'db': Config.DB_NAME,
    'port': Config.DB_PORT
}



# OpenWeatherMap Forecast API settings
WEATHER_FORECAST_API_CONFIG = {
    'url': "http://api.openweathermap.org/data/2.5/forecast",
    'params': {
        'lat': 53.349805,  
        'lon': -6.260310, 
        'appid': Config.OPENWEATHER_API_KEY,  
        'units': 'metric'
    }
}


# Fetch JSON data from the weather forecast API
def fetch_data(api_url, params):
    response = requests.get(api_url, params=params)
    response.raise_for_status()
    return response.json()


# Establish a connection to the MySQL database
def get_db_connection(config):
    try:
        conn = pymysql.connect(**config)
        return conn
    except Error as db_error:
        event_log(db_error)
        raise db_error

# Insert forecast data into the weather_forecast table
def insert_weather_forecast_data(conn, forecast_data):
    with conn.cursor() as cursor:
        try:

            # Remove old data from the table
            truncate_query = "TRUNCATE TABLE weather_forecast"
            cursor.execute(truncate_query)

            # Prepare the insert statement
            insert_query = """INSERT INTO weather_forecast 
                        (dt_txt, longitude, latitude, weather_id, weather_main, weather_description, weather_icon, temp,
                        feels_like, temp_min, temp_max, pressure, humidity, temp_kf, clouds, wind_speed, wind_deg, 
                        visibility)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            
            # Loop over each forecast entry and insert into the database
            for item in forecast_data['list']:
           
                weather_main = item['weather'][0] if item['weather'] else {}
                main_data = item['main']
                wind_data = item['wind']
                clouds_data = item['clouds']['all'] if 'clouds' in item else 0
                dt_txt_value = item['dt_txt']
                
   
                values = (
                    dt_txt_value,
                    forecast_data['city']['coord']['lon'], 
                    forecast_data['city']['coord']['lat'], 
                    weather_main.get('id', 0), 
                    weather_main.get('main', ''),
                    weather_main.get('description', ''), 
                    weather_main.get('icon', ''), 
                    main_data.get('temp', 0), 
                    main_data.get('feels_like', 0), 
                    main_data.get('temp_min', 0), 
                    main_data.get('temp_max', 0), 
                    main_data.get('pressure', 0), 
                    main_data.get('humidity', 0), 
                    main_data.get('temp_kf', 0), 
                    clouds_data, 
                    wind_data.get('speed', 0), 
                    wind_data.get('deg', 0), 
                    item.get('visibility', 0)
                )

      
                cursor.execute(insert_query, values)

  
            conn.commit()
        except Error as insert_error:

            event_log(insert_error)
            conn.rollback()
            raise insert_error


# Append error message to log file
def event_log(event):
    with open("event_log_weather.txt", "a") as file:
        current_time = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        event_message = f"Event: {event} | Time: {current_time}\n"
        file.write(event_message)

# Fetch and store weather forecast every 5 minutes  
def main():
    while True:
        # To run this every 5 minutes

        try:
            forecast = fetch_data(WEATHER_FORECAST_API_CONFIG['url'], WEATHER_FORECAST_API_CONFIG['params'])
            db_conn = get_db_connection(DB_CONFIG)
            with db_conn:
                insert_weather_forecast_data(db_conn, forecast)
            time.sleep(300)
            


        except Error as e:
            print(f"An error occurred: {e}")
            event_log(e)


if __name__ == "__main__":
    main()
