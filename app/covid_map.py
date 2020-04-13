import requests
import pandas as pd
import datetime
import json

def get_data_covid():
	df_county = pd.read_csv('https://raw.github.com/nytimes/covid-19-data//master/us-counties.csv',
						    dtype={'fips': 'str'}
							)
	df_county.columns = ["date","county","state","zipcode","cases","deaths"]
	df_county["date_id"] = df_county["date"].str.replace('-','')

	# df_state = pd.read_csv('https://raw.github.com/nytimes/covid-19-data//master/us-states.csv')
	
	return df_county

def get_data_geo():
	data_url = 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/nj_new_jersey_zip_codes_geo.min.json'
	response = requests.get(data_url)
	geodata_county = response.json()

	# with open('app/static/data/us_county.json') as geodata_county_json:
	# 		geodata_county = json.load(geodata_county_json)

	# geodata_county_test = pd.DataFrame.from_dict(geodata_county)
	# geodata_county_test.to_csv("temp4.csv")

	return geodata_county

def get_data():
	df_county = get_data_covid()
	geodata_county = get_data_geo()
	
	return df_county, geodata_county

# run full process
def run_process():
	data_county, geodata_county = get_data()

	# get list of dates in data
	date_list = data_county["date_id"].unique().tolist()

	# add properties to each county geojson with covid data
	for feature in geodata_county["features"]:		
		zipcode = feature["properties"]["ZCTA5CE10"]
		feature_data = data_county.loc[data_county["zipcode"] == zipcode]

		if len(feature_data) > 0:
			for date_val in date_list:
				date_data = feature_data.loc[feature_data["date_id"] == date_val]
				if date_data.empty:
					feature["properties"]["cases_" + date_val] = 0
					feature["properties"]["deaths_" +date_val] = 0
				else:
					feature["properties"]["cases_" + date_val] = date_data["cases"].values[0].astype("float")
					feature["properties"]["deaths_" + date_val] = date_data["deaths"].values[0].astype("float")
		else:
			for date_val in date_list:
				feature["properties"]["cases_" + date_val] = 0
				feature["properties"]["deaths_" +date_val] = 0

	return data_county, geodata_county, date_list

run_process()