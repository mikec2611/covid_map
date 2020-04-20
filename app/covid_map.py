import requests
import pandas as pd
import datetime
import json
import os
from geojson import dump, FeatureCollection
import time

# data sources
# covid - NYT (github)
# shapefiles - OpenDataDE/State-zip-code-GeoJSON (github)
# dips->zip conversion - https://data.world/niccolley/us-zipcode-to-county-state/workspace/file?filename=ZIP-COUNTY-FIPS_2018-03.csv
# county population - data.world in progress

app_rel_path = ".."
# app_rel_path = "/home/mc2615/covid_map"

def get_data_covid():
	df_county = pd.read_csv('https://raw.github.com/nytimes/covid-19-data//master/us-counties.csv',
						    dtype={'fips': 'str'}
							)
	df_county.loc[df_county["county"] == "New York City", "fips"] = "36061"
	# print(df_county.loc[df_county["county"] == "New York City"])
	df_county.columns = ["date","county","state","fips","cases","deaths"]
	df_county["date_id"] = df_county["date"].str.replace('-','')

	df_county = df_county.loc[df_county["date_id"].astype(int) >= 20200301]
	df_county = df_county.loc[df_county["fips"].notnull()]

	# NYC = 10001
	# KS MO = 64101

	# df_state = pd.read_csv('https://raw.github.com/nytimes/covid-19-data//master/us-states.csv')
	
	return df_county


def get_data_geo_bulk():
	# zip geojson
	geojson_path = app_rel_path + '/app/static/data/state_county_geojson/'
	geojson_files = os.listdir(geojson_path)
	all_county_features = []
	
	for state_county_file in geojson_files:
		debug_msg("loading: '" + state_county_file + "'")
		with open(geojson_path + state_county_file) as state_county_data:
			geodata_state = json.load(state_county_data)
			for feature in geodata_state["features"]:
				all_county_features.append(feature)

	geodata_county = FeatureCollection(all_county_features)

	#fips data for zip conversion
	zips_path = app_rel_path + '/app/static/data/ZIP-COUNTY-FIPS_2018-03.csv'
	zip_fips_lookup = pd.read_csv(zips_path, dtype={'STCOUNTYFP': 'str'})

	return(geodata_county, zip_fips_lookup)


def get_data_geo():
	#dc_district_of_columbia_zip_codes_geo.min
	#pa_pennsylvania_zip_codes_geo.min
	#nj_new_jersey_zip_codes_geo.min
	#ca_california_zip_codes_geo

	state_file_path = app_rel_path + '/app/static/data/state_county_geojson/ca_california_zip_codes_geo.json'

	with open(state_file_path) as f:
		geodata_county = json.load(f)

	zip_fips_path = app_rel_path + '/app/static/data/ZIP-COUNTY-FIPS_2018-03.csv'
	zip_fips_lookup = pd.read_csv(zip_fips_path, dtype={'STCOUNTYFP': 'str'})

	return geodata_county, zip_fips_lookup

# def get_data_pop():
# 	zip_fips_path = 'app/static/data/ZIP-COUNTY-FIPS_2018-03.csv'
# 	zip_fips_path = 'C:/programming/covid_map/' + zip_fips_path
# 	zip_fips_lookup = pd.read_csv(zip_fips_path, dtype={'STCOUNTYFP': 'str'})
# 	return data

def get_data():
	data_county = get_data_covid()
	# geodata_county, zip_fips_lookup = get_data_geo()
	geodata_county, zip_fips_lookup = get_data_geo_bulk()
	# data_pop = get_data_pop()

	return data_county, geodata_county, zip_fips_lookup


# run full process
def run_process(get_data_flag):
	county_path = app_rel_path + '/app/static/data/data_county.csv'
	geodata_county_path = app_rel_path + '/app/static/data/geodata_county.json'

	if get_data_flag == True:
		debug_msg("Loading New Data")
		data_county, geodata_county, zip_fips_lookup = get_data()

		# get list of dates in data
		date_list = data_county["date_id"].unique().tolist()

		# add properties to each county geojson with covid data
		geodata_county_features = [] # deletes features with no data
		debug_curr_state = ""
		debug_state_ctr = 0
		debug_num_states = len(geodata_county["features"])
		
		for feature in geodata_county["features"]:		
			zipcode = feature["properties"]["ZCTA5CE10"]
			fips_data = zip_fips_lookup.loc[zip_fips_lookup["ZIP"] == int(zipcode)]

			if debug_curr_state != feature["properties"]["STATEFP10"]:
				debug_curr_state = feature["properties"]["STATEFP10"]
				debug_state_ctr+=1
				debug_msg("Populating state: " + str(debug_curr_state) + " [" + str(debug_state_ctr) + "]")

			if not fips_data.empty:
				# debug_duplicate = True
				for fips in fips_data["STCOUNTYFP"]:
					feature_data = data_county.loc[data_county["fips"] == fips]

					if len(feature_data) > 0:
						for date_val in date_list:
							date_data = feature_data.loc[feature_data["date_id"] == date_val]
							if not date_data.empty:
								feature["properties"]["cases_" + date_val] = date_data["cases"].values[0].astype("float")
								feature["properties"]["deaths_" + date_val] = date_data["deaths"].values[0].astype("float")
								# feature["properties"]["deathsPercCases_" + date_val] = round(feature["properties"]["deaths_" + date_val] / feature["properties"]["cases_" + date_val],1) * 100

						geodata_county_features.append(feature)

					# if debug_duplicate == False: 
						break

					# fips = str(fips_data["STCOUNTYFP"].values[0])

		geodata_county["features"] = geodata_county_features

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
