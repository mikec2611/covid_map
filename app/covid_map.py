import requests
import pandas as pd
import datetime
import json
from geojson import dump

def get_data_covid():
	df_county = pd.read_csv('https://raw.github.com/nytimes/covid-19-data//master/us-counties.csv',
						    dtype={'fips': 'str'}
							)
	df_county.columns = ["date","county","state","fips","cases","deaths"]
	df_county["date_id"] = df_county["date"].str.replace('-','')

	
	df_county = df_county.loc[df_county["fips"].notnull()]
	# NYC = 10001
	# KS MO = 64101

	# df_state = pd.read_csv('https://raw.github.com/nytimes/covid-19-data//master/us-states.csv')
	
	return df_county

def get_data_geo():
	# data_url = 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/pa_pennsylvania_zip_codes_geo.min.json'
	data_url = 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/nj_new_jersey_zip_codes_geo.min.json'
	response = requests.get(data_url)
	geodata_county = response.json()

	zip_fips_lookup = pd.read_csv('app/static/data/ZIP-COUNTY-FIPS_2018-03.csv')

	# with open('app/static/data/us_county.json') as geodata_county_json:
	# 		geodata_county = json.load(geodata_county_json)

	# geodata_county_test = pd.DataFrame.from_dict(geodata_county)
	# geodata_county_test.to_csv("temp4.csv")

	return geodata_county,zip_fips_lookup

def get_data():
	df_county = get_data_covid()
	geodata_county, zip_fips_lookup = get_data_geo()
	
	return df_county, geodata_county, zip_fips_lookup

# run full process
def run_process(get_data_flag):
	print(get_data_flag)
	if get_data_flag == True:
		data_county, geodata_county, zip_fips_lookup = get_data()

		# get list of dates in data
		date_list = data_county["date_id"].unique().tolist()

		# add properties to each county geojson with covid data
		# print(len(geodata_county["features"]))
		geodata_county_features = []
		for feature in geodata_county["features"]:		
			zipcode = feature["properties"]["ZCTA5CE10"]
			fips_data = zip_fips_lookup.loc[zip_fips_lookup["ZIP"] == int(zipcode)]

			if not fips_data.empty:
				fips = str(fips_data["STCOUNTYFP"].values[0])
				feature_data = data_county.loc[data_county["fips"] == fips]

				if len(feature_data) > 0:
					for date_val in date_list:
						date_data = feature_data.loc[feature_data["date_id"] == date_val]
						if date_data.empty:
							feature["properties"]["cases_" + date_val] = 0
							feature["properties"]["deaths_" + date_val] = 0
						else:
							feature["properties"]["cases_" + date_val] = date_data["cases"].values[0].astype("float")
							feature["properties"]["deaths_" + date_val] = date_data["deaths"].values[0].astype("float")

					geodata_county_features.append(feature)
				# else:
				# 	for date_val in date_list:
				# 		feature["properties"]["cases_" + date_val] = 0
				# 		feature["properties"]["deaths_" + date_val] = 0

		geodata_county["features"] = geodata_county_features
		# print(len(geodata_county["features"]))

		# save data
		data_county.to_csv('app/static/data/data_county.csv')

		with open('app/static/data/geodata_county.geojson', 'w') as f:
			dump(geodata_county, f)			

		return data_county, geodata_county, date_list
	else:
		print("Loaded locally")
		data_county = pd.read_csv('app/static/data/data_county.csv')
		date_list = data_county["date_id"].astype(str).unique().tolist()
		# print(date_list)

		with open('app/static/data/geodata_county.geojson') as f:
			geodata_county = json.load(f)

		return data_county, geodata_county, date_list
