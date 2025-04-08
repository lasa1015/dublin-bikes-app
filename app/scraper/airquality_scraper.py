
import sys
import os

# Add parent directory to Python path so config.py can be found
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

# Weather API configuration
AIR_API_CONFIG = {
    'url': "http://api.openweathermap.org/data/2.5/air_pollution",
    'params': {
        'lat': 53.349805,
        'lon': -6.260310,
        'appid': Config.OPENWEATHER_API_KEY,
        'units': 'metric'
    }
}

# Fetch JSON data from the API
def fetch_data(api_url, params):
    response = requests.get(api_url, params=params)
    response.raise_for_status()
    return response.json()

# Create a database connection using pymysql
def get_db_connection(config):
    try:
        conn = pymysql.connect(**config)
        return conn
    except Error as db_error:
        event_log(db_error)
        raise db_error

# Insert air quality data into the database
def insert_air_latest_data(conn, air_data):
    with conn.cursor() as cursor:
        try:
            
            # First clear the old data
            truncate_query = "TRUNCATE TABLE airquality"
            cursor.execute(truncate_query)
            
            # Prepare and execute insert query
            insert_query = """INSERT INTO airquality 
                        (recorded_time, longitude, latitude, aqi, pm2_5, pm10)
                        VALUES (%s, %s, %s, %s, %s, %s)"""
            
            recorded_time = datetime.datetime.now()
            lon = air_data['coord']['lon']
            lat = air_data['coord']['lat']
            aqi = air_data['list'][0]['main']['aqi']
            pm2_5 = air_data['list'][0]['components']['pm2_5']
            pm10 = air_data['list'][0]['components']['pm10']
            
            values = (recorded_time, lon, lat, aqi, pm2_5, pm10)
            
            cursor.execute(insert_query, values)
            conn.commit()
        except Error as insert_error:
            event_log(insert_error)
            conn.rollback()
            raise insert_error


# Write error event to a log file
def event_log(event):
    with open("event_log_weather.txt", "a") as file:
        current_time = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        event_message = f"Event: {event} | Time: {current_time}\n"
        file.write(event_message)

# Continuously fetch and store air quality data every 5 minutes
def main():
    while True:       
      
        try:

            # Fetch air quality data from the API
            air = fetch_data(AIR_API_CONFIG['url'], AIR_API_CONFIG['params'])

            # Connect to the database and insert the latest data
            db_conn = get_db_connection(DB_CONFIG)
            with db_conn:
                insert_air_latest_data(db_conn, air)

                 # Wait 5 minutes before the next request
                time.sleep(300)

        except Error as e:
            print(f"An error occurred: {e}")
            event_log(e)

if __name__ == "__main__":
    main()
