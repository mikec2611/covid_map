import requests
import pandas as pd
import datetime
import json
import os
from geojson import dump, FeatureCollection
import time

# data sources
# covid - NYT (github)
# shapefiles - https://catalog.data.gov/dataset/tiger-line-shapefile-2017-nation-u-s-current-county-and-equivalent-national-shapefile
# county population - data.world in progress

app_rel_path = "C:/programming/covid_map"
# app_rel_path = "/home/mc2615/covid_map"

def get_data_covid():
	df_county = pd.read_csv('https://raw.github.com/nytimes/covid-19-data/master/us-counties.csv',
						    dtype={'fips': 'str'}
							)
	df_county.loc[df_county["county"] == "New York City", "fips"] = "36061"
	df_county.columns = ["date","county","state","fips","cases","deaths"]
	df_county["date_id"] = df_county["date"].str.replace('-','')

	df_county = df_county.loc[df_county["date_id"].astype(int) >= 20200301]
	df_county = df_county.loc[df_county["fips"].notnull()]

	# NYC = 10001
	# KS MO = 64101

	# df_state = pd.read_csv('https://raw.github.com/nytimes/covid-19-data//master/us-states.csv')
	
	return df_county

def get_data_geo():
	geojson_file = app_rel_path + '/app/static/data/us_county.json'

	with open(geojson_file) as county_geojson:
			geodata_county = json.load(county_geojson)

	return(geodata_county)

def get_data_pop():
	data_pop_path = app_rel_path +'/app/static/data/pop-by-zip-code.csv'
	data_pop = pd.read_csv(data_pop_path, dtype={'zip_code': 'str'})
	data_pop = data_pop.sort_values(by=['zip_code'])
	data_pop.columns = ["zip_code","population"]

	return data_pop

def get_data():
	data_county = get_data_covid()
	geodata_county = get_data_geo()
	# data_pop = get_data_pop()
	return data_county, geodata_county#, data_pop

# run full process
def run_process(get_data_flag):
	county_path = app_rel_path + '/app/static/data/data_county.csv'
	geodata_county_path = app_rel_path + '/app/static/data/geodata_county.json'

	if get_data_flag == True:
		debug_msg("Loading New Data")
		# data_county, geodata_county, data_pop = get_data()
		data_county, geodata_county = get_data()

		# get list of dates in data
		date_list = data_county["date_id"].unique().tolist()

		# add properties to each county geojson with covid data
		county_ctr = 0
		for feature in geodata_county["features"]:	
			
			feature["id"] = county_ctr
			geo_county_fips = feature["properties"]["GEOID"]
			fips_data = data_county.loc[data_county["fips"] == geo_county_fips]

			if not fips_data.empty:
				for date_val in date_list:
					date_data = fips_data.loc[fips_data["date_id"] == date_val]
					if not date_data.empty:
						feature["properties"]["cases_" + date_val] = date_data["cases"].values[0].astype("float")
						feature["properties"]["deaths_" + date_val] = date_data["deaths"].values[0].astype("float")

			county_ctr+=1

		# save data
		data_county.to_csv(county_path)

		with open(geodata_county_path, 'w') as f:
			dump(geodata_county, f)			

		return data_county, geodata_county, date_list
	else:
		debug_msg("Loading Locally")
		data_county = pd.read_csv(county_path)
		date_list = data_county["date_id"].astype(str).unique().tolist()
		# print(date_list)

		with open(geodata_county_path) as f:
			geodata_county = json.load(f)

		return data_county, geodata_county, date_list


def debug_msg(msg):
	print(time.strftime("[%m/%d/%Y %H:%M:%S] ") + msg)
