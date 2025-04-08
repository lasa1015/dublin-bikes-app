import sys
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

# Fetch JSON data from the JCDecaux API
def load_data(api_url, params):
    response = requests.get(api_url, params=params)
    response.raise_for_status()
    return response.json()

# Create a new database connection
def get_db_connection(config):
    return pymysql.connect(**config)


# Insert availability info for a single station into the dbavailability table
def insert_availability_data(cursor, station):
    insert_query = """
        INSERT INTO dbavailability
        (number, available_bikes, available_bike_stands, status, last_update)
        VALUES (%s, %s, %s, %s, %s)
    """
    values = (
        station.get("number"),
        station.get("available_bikes"),
        station.get("available_bike_stands"),
        station.get("status"),
        station.get("last_update")
    )
    cursor.execute(insert_query, values)

# Insert availability info for all stations into the dbavailability table
def insert_data_to_db(stations, db_config):
    try:
        connection = get_db_connection(db_config)
        with connection.cursor() as cursor:
            for station in stations:
                insert_availability_data(cursor, station)
        connection.commit()
    except pymysql.Error as db_error:
        print(f"Database error: {db_error}")
        connection.rollback()
    finally:
        if connection:
            connection.close()

# Continuously fetch and store bike availability data every 5 minutes
def main():
    while True:

        try:
            stations = load_data(API_CONFIG['url'], API_CONFIG['params'])
            insert_data_to_db(stations, DB_CONFIG)
            time.sleep(300)
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()
