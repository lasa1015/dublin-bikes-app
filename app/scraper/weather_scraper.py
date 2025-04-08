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

# OpenWeatherMap Current Weather API configuration
WEATHER_API_CONFIG = {
    'url': "http://api.openweathermap.org/data/2.5/weather",
    'params': {
        'lat': 53.349805,  
        'lon': -6.260310, 
        'appid': Config.OPENWEATHER_API_KEY,  
        'units': 'metric'
    }
}

# Make a GET request to the weather API and return JSON response
def fetch_data(api_url, params):
    response = requests.get(api_url, params=params)
    response.raise_for_status()
    return response.json()

# Establish connection to the MySQL database
def get_db_connection(config):
    try:
        conn = pymysql.connect(**config)
        return conn
    except Error as db_error:
        event_log(db_error)
        raise db_error

# Insert a single weather record into the weatherdata table
def insert_weather_data(conn, weather_data):
    with conn.cursor() as cursor:
        try:
            insert_query = """INSERT INTO weatherdata 
                        (location_id, longitude, latitude, weather_id, weather_main, weather_description, weather_icon, temp,
                        feels_like, temp_min, temp_max, pressure, humidity, visibility, wind_speed, wind_deg, clouds, 
                        data_timestamp)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            weather_main = weather_data['weather'][0]
            main_data = weather_data['main']
            wind_data = weather_data['wind']
            values = (
                weather_data['id'], weather_data['coord']['lon'], weather_data['coord']['lat'], weather_main['id'], 
                weather_main['main'], weather_main['description'], weather_main['icon'], main_data['temp'], 
                main_data['feels_like'], main_data['temp_min'], main_data['temp_max'], main_data['pressure'], 
                main_data['humidity'], weather_data['visibility'], wind_data['speed'], wind_data['deg'], 
                weather_data['clouds']['all'], weather_data['dt']
            )
            cursor.execute(insert_query, values)
            conn.commit()
        except Error as insert_error:
            event_log(insert_error)
            conn.rollback()
            raise insert_error

# Log errors to a text file with timestamp
def event_log(event):
    with open("event_log_weather.txt", "a") as file:
        current_time = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        event_message = f"Event: {event} | Time: {current_time}\n"
        file.write(event_message)

# Fetch and insert weather data every 5 minutes
def main():
    while True:    

        # Fetch current weather from API
        try:
            weather = fetch_data(WEATHER_API_CONFIG['url'], WEATHER_API_CONFIG['params'])

            # Insert weather data into database
            db_conn = get_db_connection(DB_CONFIG)
            with db_conn:
                insert_weather_data(db_conn, weather)

            # Wait 5 minutes before next run    
            time.sleep(300)
        except Error as e:
            print(f"An error occurred: {e}")
        

if __name__ == "__main__":
    main()
