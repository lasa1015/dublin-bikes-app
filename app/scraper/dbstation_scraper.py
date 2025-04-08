import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import requests
import json
import pymysql
import datetime
import pytz
import time
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


# JCDecaux API configuration
API_CONFIG = {
    'url': "https://api.jcdecaux.com/vls/v1/stations/",
    'params': {
        'apiKey': Config.JCDECAUX_API_KEY,  
        'contract': 'Dublin'
    }
}


# Timezone configuration
TIMEZONE = 'Europe/Dublin'


# Fetch station data from the JCDecaux API
def load_data(api_url, params):
    response = requests.get(api_url, params=params)
    response.raise_for_status()
    return response.json()


# Create a new database connection using pymysql
def get_db_connection(config):
    return pymysql.connect(**config)


# Delete the old station record and insert the latest version
def delete_and_insert_station_data(cursor, station):

    # Delete existing record
    delete_query = "DELETE FROM dbstation WHERE number = %s"
    cursor.execute(delete_query, (station['number'],))
    
    # Insert the latest station data
    insert_query = """
        INSERT INTO dbstation
        (recorded_at, number, address, name, position_lat, position_lng, status, banking, bonus, bike_stands, contract_name, available_bikes, available_bike_stands, last_update)
        VALUES (CURRENT_TIMESTAMP, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    values = (
        station.get("number"),
        station.get("address"),
        station.get("name"),
        station.get("position", {}).get("lat"),
        station.get("position", {}).get("lng"),
        station.get("status"),
        int(station.get("banking", False)),
        int(station.get("bonus", False)),
        station.get("bike_stands"),
        station.get("contract_name"),
        station.get("available_bikes"),
        station.get("available_bike_stands"),
        station.get("last_update")
    )
    cursor.execute(insert_query, values)


# Loop over all stations and update the dbstation table with the latest info
def update_stations_db(stations, db_config):
    try:
        connection = get_db_connection(db_config)
        with connection.cursor() as cursor:
            for station in stations:
                delete_and_insert_station_data(cursor, station)
        connection.commit()
    except pymysql.Error as db_error:
        print(f"Database error: {db_error}")
        connection.rollback()
    finally:
        if connection:
            connection.close()


# Continuously fetch and update station metadata every 5 minutes
def main():
    while True:
        try:
            stations = load_data(API_CONFIG['url'], API_CONFIG['params'])
            update_stations_db(stations, DB_CONFIG)
            time.sleep(300)
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()
