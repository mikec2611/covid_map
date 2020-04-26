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
	# counties
	geojson_file = app_rel_path + '/app/static/data/us_county.json'
	with open(geojson_file) as county_geojson:
			geodata_county = json.load(county_geojson)

	# states
	geojson_file = app_rel_path + '/app/static/data/us_state.json'
	with open(geojson_file) as state_geojson:
		geodata_state = json.load(state_geojson)

	return(geodata_county, geodata_state)

def get_data_pop():
	data_pop_path = app_rel_path +'/app/static/data/pop-by-zip-code.csv'
	data_pop = pd.read_csv(data_pop_path, dtype={'zip_code': 'str'})
	data_pop = data_pop.sort_values(by=['zip_code'])
	data_pop.columns = ["zip_code","population"]

	return data_pop

def get_data():
	data_county = get_data_covid()
	geodata_county, geodata_state = get_data_geo()
	# data_pop = get_data_pop()
	return data_county, geodata_county, geodata_state #, data_pop

# run full process
def run_process(get_data_flag):
	county_path = app_rel_path + '/app/static/data/data_county.csv'
	geodata_county_path = app_rel_path + '/app/static/data/geodata_county.json'
	geodata_state_path = app_rel_path + '/app/static/data/geodata_state.json'

	if get_data_flag == True:
		debug_msg("Loading New Data")
		# data_county, geodata_county, data_pop = get_data()
		data_county, geodata_county, geodata_state = get_data()

		# get list of dates in data
		date_list = data_county["date_id"].unique().tolist()

		# get state lookups and remove unmapped shapes in statefile
		unique_state = []
		state_names = []
		saved_features = []
		for feature in geodata_state["features"]:
			if feature["properties"]["STATEFP"] not in ["60","66","69","72","78"]:
				state_id = feature["properties"]["STATEFP"]
				state_name = feature["properties"]["NAME"]
				state_abbr = feature["properties"]["STUSPS"]
				if state_id not in unique_state:
					unique_state.append(state_id)
					state_names.append([state_id, state_name, state_abbr])

				saved_features.append(feature)
		df_state_names = pd.DataFrame(state_names, columns=["state_id", "state_name", "state_abbr"])

		geodata_state["features"] = saved_features

		# add properties to each county geojson with covid data
		saved_features = []
		county_ctr = 0
		for feature in geodata_county["features"]:	
			if feature["properties"]["STATEFP"] not in ["60","66","69","72","78"]:



				feature["id"] = county_ctr
				feature["properties"]["state_name"] = df_state_names.loc[df_state_names["state_id"] == feature["properties"]["STATEFP"]]["state_name"].values[0]
				feature["properties"]["state_abbr"] = df_state_names.loc[df_state_names["state_id"] == feature["properties"]["STATEFP"]]["state_abbr"].values[0]
				geo_county_fips = feature["properties"]["GEOID"]
				fips_data = data_county.loc[data_county["fips"] == geo_county_fips]

				if not fips_data.empty:
					prior_cases = 0
					prior_deaths = 0
					for date_val in date_list:
						date_data = fips_data.loc[fips_data["date_id"] == date_val]
						if not date_data.empty:
							date_cases = date_data["cases"].values[0].astype("float")
							date_deaths = date_data["deaths"].values[0].astype("float")
							date_casesPD = date_cases - prior_cases
							date_deathsPD = date_deaths - prior_deaths
							if date_casesPD < 0:
								date_casesPD = 0
							if date_deathsPD < 0:
								date_deathsPD = 0

							feature["properties"]["cases_" + date_val] = date_cases
							feature["properties"]["deaths_" + date_val] = date_deaths


							feature["properties"]["casesPD_" + date_val] = date_casesPD
							feature["properties"]["deathsPD_" + date_val] = date_deathsPD

							if date_cases > 0:
								prior_cases = date_cases
							if date_deaths > 0:
								prior_deaths = date_deaths

				saved_features.append(feature)
				county_ctr+=1
				# if feature["properties"]["NAMELSAD"] == "Cherry County":
				# 	print(feature)

		# removes shapes that arent displayed
		geodata_county["features"] = saved_features

		# save data
		data_county.to_csv(county_path)

		# save county shapes
		with open(geodata_county_path, 'w') as f:
			dump(geodata_county, f)			

		# save state shapes
		with open(geodata_state_path, 'w') as f:
			dump(geodata_state, f)		

		return data_county, geodata_county, geodata_state, date_list
	else:
		debug_msg("Loading Locally")

		# load data
		data_county = pd.read_csv(county_path)
		date_list = data_county["date_id"].astype(str).unique().tolist()
		# print(date_list)

		# load county shapes
		with open(geodata_county_path) as f:
			geodata_county = json.load(f)

		# load state shapes
		with open(geodata_state_path) as f:
			geodata_state = json.load(f)

		return data_county, geodata_county, geodata_state, date_list


def debug_msg(msg):
	print(time.strftime("[%m/%d/%Y %H:%M:%S] ") + msg)
