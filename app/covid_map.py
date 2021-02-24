import requests
import pandas as pd
import numpy as np
import datetime
import json
import os
from geojson import dump, FeatureCollection
from dateutil.relativedelta import relativedelta
import time

app_rel_path = "C:/programming/covid_map"
# app_rel_path = "/home/mc2615/covid_map"

def get_data_covid():
	debug_msg("run get_data_covid")
	date_today = datetime.datetime.today()
	date_start = date_today + relativedelta(months=-6, days=-1)
	date_start = int(date_start.strftime('%Y%m%d'))

	# county
	df_county = pd.read_csv('https://raw.github.com/nytimes/covid-19-data/master/us-counties.csv',
						    dtype={'fips': 'str'}
							)
	
	df_county.loc[df_county["county"] == "New York City", "fips"] = "36061"
	df_county.columns = ["date","county","state","fips","cases","deaths"]
	df_county["date_id"] = df_county["date"].str.replace('-','')

	df_county = df_county.loc[df_county["date_id"].astype(int) >= date_start]
	df_county = df_county.loc[df_county["fips"].notnull()]

	# NYC = 10001
	# KS MO = 64101

	# state
	df_state = pd.read_csv('https://raw.github.com/nytimes/covid-19-data//master/us-states.csv',
						    dtype={'fips': 'str'}
						  )
	df_state["date_id"] = df_state["date"].str.replace('-','')
	df_state = df_state.loc[df_state["date_id"].astype(int) >= date_start]

	# total
	df_total = pd.read_csv('https://raw.github.com/nytimes/covid-19-data/master/us.csv')
	df_total["date_id"] = df_total["date"].str.replace('-','')
	df_total = df_total.loc[df_total["date_id"].astype(int) >= date_start]
	
	return df_total, df_state, df_county

def get_data_geo():
	debug_msg("run get_data_geo")

	# counties
	geojson_file = app_rel_path + '/app/static/data/us_county.json'
	with open(geojson_file) as county_geojson:
			geodata_county = json.load(county_geojson)

	# states
	geojson_file = app_rel_path + '/app/static/data/us_state.json'
	with open(geojson_file) as state_geojson:
		geodata_state = json.load(state_geojson)

	return(geodata_state, geodata_county)

def get_data_pop():
	debug_msg("run get_data_pop")

	# counties
	data_pop_path_county = app_rel_path +'/app/static/data/population_county.csv'
	data_pop_county = pd.read_csv(data_pop_path_county)

	# states
	data_pop_path_state = app_rel_path +'/app/static/data/population_state.csv'
	data_pop_state = pd.read_csv(data_pop_path_state)

	return data_pop_county, data_pop_state

def get_data():
	debug_msg("run get_data")

	df_total, df_state, df_county  = get_data_covid()
	geodata_state, geodata_county = get_data_geo()
	geodata_state_pop, geodata_county_pop = get_data_geo()
	data_pop_county, data_pop_state = get_data_pop()

	return df_total, df_state, df_county, geodata_state, geodata_county, geodata_state_pop, geodata_county_pop, data_pop_county, data_pop_state


# run full process
def run_process(get_data_flag):
	debug_msg("run run_process")

	pop_denom = 100000
	total_path = app_rel_path + '/app/static/data/data_total.csv'
	county_path = app_rel_path + '/app/static/data/data_county.csv'
	state_path = app_rel_path + '/app/static/data/data_state.csv'
	unique_county_path = app_rel_path + '/app/static/data/unique_county.csv'
	geodata_county_path = app_rel_path + '/app/static/data/geodata_county.json'
	geodata_state_path = app_rel_path + '/app/static/data/geodata_state.json'
	geodata_county_pop_path = app_rel_path + '/app/static/data/geodata_pop_county.json'
	geodata_state_pop_path = app_rel_path + '/app/static/data/geodata_pop_state.json'

	if get_data_flag == True:
		debug_msg("loading new data")
		# data_county, geodata_county, data_pop = get_data()
		data_total, data_state, data_county, geodata_state, geodata_county, geodata_state_pop, geodata_county_pop, data_pop_county, data_pop_state = get_data()

		# get list of dates in data
		date_list = data_county["date_id"].unique().tolist()

		#--------total data processing

		#calc total metrics
		geodata_total= {}
		offset_index = data_total.index[0]
		for total_index, total_record in data_total.iterrows():
			total_index = total_index - offset_index

			total_date = total_record[0]
			total_cases = total_record[1]
			total_deaths = total_record[2]

			if (total_index > 0):
				total_cases_PD = total_cases - geodata_total["cases_" + date_list[total_index - 1]]
				total_deaths_PD = total_deaths - geodata_total["deaths_" + date_list[total_index - 1]]
				if (total_cases_PD < 0):
					total_cases_PD = 0
				if (total_deaths_PD < 0):
					total_deaths_PD = 0	
			else:
				total_cases_PD = 0
				total_deaths_PD = 0

			geodata_total["cases_" + date_list[total_index]] = total_cases
			geodata_total["deaths_" + date_list[total_index]] = total_deaths
			geodata_total["casesPD_" + date_list[total_index]] = total_cases_PD
			geodata_total["deathsPD_" + date_list[total_index]] = total_deaths_PD

		#--------state data processing

		# populate state data - base
		debug_msg("populate state data - base")
		unique_state = []
		state_names = []
		saved_features = []
		state_ctr = 0
		for feature in geodata_state["features"]:
			if feature["properties"]["STATEFP"] not in ["60","66","69","72","78"]:
				feature["id"] = state_ctr
				state_id = feature["properties"]["STATEFP"]
				state_name = feature["properties"]["NAME"]
				state_abbr = feature["properties"]["STUSPS"]
				if state_id not in unique_state:
					unique_state.append(state_id)
					state_names.append([state_id, state_name, state_abbr])

				st_covid_data = data_state[data_state["state"] == state_name]
				if not st_covid_data.empty:
					prior_cases = 0
					prior_deaths = 0
					date_ctr = 0
					for date_val in date_list:
						date_data = st_covid_data.loc[st_covid_data["date_id"] == date_val]
						if not date_data.empty:
							date_cases = date_data["cases"].values[0].astype("float") 
							date_deaths = date_data["deaths"].values[0].astype("float")
							date_casesPD = date_cases - prior_cases
							date_deathsPD = date_deaths - prior_deaths
							if date_casesPD < 0:
								date_casesPD = 0
							if date_deathsPD < 0:
								date_deathsPD = 0

							if date_ctr > 0:
								feature["properties"]["cases_" + date_val] = date_cases
								feature["properties"]["deaths_" + date_val] = date_deaths

								feature["properties"]["casesPD_" + date_val] = date_casesPD
								feature["properties"]["deathsPD_" + date_val] = date_deathsPD

							if date_cases > 0:
								prior_cases = date_cases
							if date_deaths > 0:
								prior_deaths = date_deaths

							# # deciles
							# date_cases_decile = date_data["cases_decile"].values[0].astype("float")
							# date_deaths_decile = date_data["deaths_decile"].values[0].astype("float")
							# feature["properties"]["cases_decile_" + date_val] = date_cases_decile
							# feature["properties"]["deaths_decile_" + date_val] = date_deaths_decile
						date_ctr = date_ctr + 1

				del feature["properties"]["ALAND"]
				del feature["properties"]["AWATER"]
				del feature["properties"]["DIVISION"]
				del feature["properties"]["FUNCSTAT"]
				del feature["properties"]["INTPTLAT"]
				del feature["properties"]["INTPTLON"]
				del feature["properties"]["LSAD"]
				del feature["properties"]["MTFCC"]
				del feature["properties"]["REGION"]
				del feature["properties"]["STATENS"]
				saved_features.append(feature)
				state_ctr+=1
		df_state_names = pd.DataFrame(state_names, columns=["state_id", "state_name", "state_abbr"])
		geodata_state["features"] = saved_features

		# populate state data - pop
		debug_msg("populate state data - pop")
		saved_features = []
		state_ctr = 0
		for feature in geodata_state_pop["features"]:
			if feature["properties"]["STATEFP"] not in ["60","66","69","72","78"]:
				feature["id"] = state_ctr
				state_id = feature["properties"]["STATEFP"]
				state_name = feature["properties"]["NAME"]
				state_abbr = feature["properties"]["STUSPS"]
				st_covid_data = data_state[data_state["state"] == state_name]
				if not st_covid_data.empty:
					prior_cases = 0
					prior_deaths = 0
					date_ctr = 0
					for date_val in date_list:
						date_data = st_covid_data.loc[st_covid_data["date_id"] == date_val]
						if not date_data.empty:
							pop_data = data_pop_state.loc[data_pop_state["STNAME"] == state_name]
							if not pop_data.empty:
								date_cases = round((date_data["cases"].values[0].astype("float") * pop_denom) / pop_data["POPESTIMATE2019"].values[0].astype("float"),2)
								date_deaths = round((date_data["deaths"].values[0].astype("float") * pop_denom) / pop_data["POPESTIMATE2019"].values[0].astype("float"),2)
								date_casesPD = date_cases - prior_cases
								date_deathsPD = date_deaths - prior_deaths
								if date_casesPD < 0:
									date_casesPD = 0
								if date_deathsPD < 0:
									date_deathsPD = 0

								if date_ctr > 0:
									feature["properties"]["cases_" + date_val] = date_cases
									feature["properties"]["deaths_" + date_val] = date_deaths

									feature["properties"]["casesPD_" + date_val] = date_casesPD
									feature["properties"]["deathsPD_" + date_val] = date_deathsPD

								if date_cases > 0:
									prior_cases = date_cases
								if date_deaths > 0:
									prior_deaths = date_deaths

								# # deciles
								# date_cases_decile = date_data["cases_decile"].values[0].astype("float")
								# date_deaths_decile = date_data["deaths_decile"].values[0].astype("float")
								# feature["properties"]["cases_decile_" + date_val] = date_cases_decile
								# feature["properties"]["deaths_decile_" + date_val] = date_deaths_decile
						date_ctr = date_ctr + 1

				del feature["properties"]["ALAND"]
				del feature["properties"]["AWATER"]
				del feature["properties"]["DIVISION"]
				del feature["properties"]["FUNCSTAT"]
				del feature["properties"]["INTPTLAT"]
				del feature["properties"]["INTPTLON"]
				del feature["properties"]["LSAD"]
				del feature["properties"]["MTFCC"]
				del feature["properties"]["REGION"]
				del feature["properties"]["STATENS"]
				saved_features.append(feature)
				state_ctr+=1
		
		geodata_state_pop["features"] = saved_features


		#--------county data processing

		# calculate deciles for map coloring
		# data_county_total = pd.DataFrame()
		# for date_val in date_list:
		# 	data_county_slice = data_county.loc[data_county["date_id"] == date_val]
		# 	data_county_slice['cases_decile'] = pd.qcut(data_county_slice['cases'], 10, labels=False, duplicates='drop')
		# 	data_county_slice['cases_decile'] = data_county_slice['cases_decile'] + 1
		# 	data_county_slice['deaths_decile'] = pd.qcut(data_county_slice['deaths'], 10, labels=False, duplicates='drop')
		# 	data_county_slice['deaths_decile'] = data_county_slice['deaths_decile'] + 1
		# 	data_county_total = data_county_total.append(data_county_slice)
		# data_county = data_county_total

		# add properties to each county geojson with covid data
		debug_msg("populate county data - base")
		curr_county = ""
		unique_counties = []
		saved_features = []
		county_ctr = 0
		for feature in geodata_county["features"]:	
			if feature["properties"]["STATEFP"] not in ["60","66","69","72","78"]: # exclude untracked statefps

				# set values in feature
				feature["id"] = county_ctr
				feature["properties"]["state_name"] = df_state_names.loc[df_state_names["state_id"] == feature["properties"]["STATEFP"]]["state_name"].values[0]
				feature["properties"]["state_abbr"] = df_state_names.loc[df_state_names["state_id"] == feature["properties"]["STATEFP"]]["state_abbr"].values[0]

				# get unique list of counties for frontend
				full_county_name = feature["properties"]["NAMELSAD"] + ", " + feature["properties"]["state_abbr"]
				if full_county_name != curr_county: # get unique list of counties
					unique_counties.append([full_county_name, feature["properties"]["NAMELSAD"], feature["properties"]["state_abbr"]])
					curr_county = full_county_name

				# populate data in feature
				geo_county_fips = feature["properties"]["GEOID"]
				fips_data = data_county.loc[data_county["fips"] == geo_county_fips]
				if not fips_data.empty:
					prior_cases = 0
					prior_deaths = 0
					date_ctr = 0
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

							if date_ctr > 0:
								feature["properties"]["cases_" + date_val] = date_cases
								feature["properties"]["deaths_" + date_val] = date_deaths

								feature["properties"]["casesPD_" + date_val] = date_casesPD
								feature["properties"]["deathsPD_" + date_val] = date_deathsPD

							if date_cases > 0:
								prior_cases = date_cases
							if date_deaths > 0:
								prior_deaths = date_deaths

							# # deciles
							# date_cases_decile = date_data["cases_decile"].values[0].astype("float")
							# date_deaths_decile = date_data["deaths_decile"].values[0].astype("float")
							# feature["properties"]["cases_decile_" + date_val] = date_cases_decile
							# feature["properties"]["deaths_decile_" + date_val] = date_deaths_decile
						date_ctr = date_ctr + 1

				del feature["properties"]["ALAND"]
				del feature["properties"]["AWATER"]
				del feature["properties"]["CBSAFP"]
				del feature["properties"]["CLASSFP"]
				del feature["properties"]["COUNTYFP"]
				del feature["properties"]["COUNTYNS"]
				del feature["properties"]["CSAFP"]
				del feature["properties"]["FUNCSTAT"]
				del feature["properties"]["INTPTLAT"]
				del feature["properties"]["INTPTLON"]
				del feature["properties"]["LSAD"]
				del feature["properties"]["METDIVFP"]
				del feature["properties"]["MTFCC"]
				saved_features.append(feature)
				county_ctr+=1
		geodata_county["features"] = saved_features # removes shapes that arent displayed
		# sort unique counties
		unique_counties = pd.DataFrame(unique_counties, columns=["full_county_name","county_name","county_state"])
		unique_counties = unique_counties.sort_values(["county_state", "county_name"], ascending = (True, True))
		unique_counties = unique_counties["full_county_name"]


		# add properties to each county geojson with covid data
		debug_msg("populate county data - pop")
		curr_county = ""
		saved_features = []
		county_ctr = 0
		for feature in geodata_county_pop["features"]:	
			if feature["properties"]["STATEFP"] not in ["60","66","69","72","78"]: # exclude untracked statefps

				# set values in feature
				feature["id"] = county_ctr
				feature["properties"]["state_name"] = df_state_names.loc[df_state_names["state_id"] == feature["properties"]["STATEFP"]]["state_name"].values[0]
				feature["properties"]["state_abbr"] = df_state_names.loc[df_state_names["state_id"] == feature["properties"]["STATEFP"]]["state_abbr"].values[0]

				# # get unique list of counties for frontend
				# full_county_name = feature["properties"]["NAMELSAD"] + ", " + feature["properties"]["state_abbr"]
				# if full_county_name != curr_county: # get unique list of counties
				# 	unique_counties.append([full_county_name, feature["properties"]["NAMELSAD"], feature["properties"]["state_abbr"]])
				# 	curr_county = full_county_name

				# populate data in feature
				county_name = feature["properties"]["NAMELSAD"]
				state_name = feature["properties"]["state_name"]
				geo_county_fips = feature["properties"]["GEOID"]
				fips_data = data_county.loc[data_county["fips"] == geo_county_fips]
				if not fips_data.empty:
					prior_cases = 0
					prior_deaths = 0
					date_ctr = 0
					for date_val in date_list:
						date_data = fips_data.loc[fips_data["date_id"] == date_val]
						if not date_data.empty:
							pop_data_st = data_pop_county.loc[data_pop_county["STNAME"] == state_name]
							pop_data = pop_data_st.loc[pop_data_st["CTYNAME"] == county_name]
							if not pop_data.empty:
								date_cases = round((date_data["cases"].values[0].astype("float") * pop_denom) / pop_data["POPESTIMATE2019"].values[0].astype("float"),2)
								date_deaths = round((date_data["deaths"].values[0].astype("float") * pop_denom) / pop_data["POPESTIMATE2019"].values[0].astype("float"),2)
								date_casesPD = date_cases - prior_cases
								date_deathsPD = date_deaths - prior_deaths
								if date_casesPD < 0:
									date_casesPD = 0
								if date_deathsPD < 0:
									date_deathsPD = 0

								if date_ctr > 0:
									feature["properties"]["cases_" + date_val] = date_cases
									feature["properties"]["deaths_" + date_val] = date_deaths

									feature["properties"]["casesPD_" + date_val] = date_casesPD
									feature["properties"]["deathsPD_" + date_val] = date_deathsPD

								if date_cases > 0:
									prior_cases = date_cases
								if date_deaths > 0:
									prior_deaths = date_deaths

								# # deciles
								# date_cases_decile = date_data["cases_decile"].values[0].astype("float")
								# date_deaths_decile = date_data["deaths_decile"].values[0].astype("float")
								# feature["properties"]["cases_decile_" + date_val] = date_cases_decile
								# feature["properties"]["deaths_decile_" + date_val] = date_deaths_decile
						date_ctr = date_ctr + 1

				del feature["properties"]["ALAND"]
				del feature["properties"]["AWATER"]
				del feature["properties"]["CBSAFP"]
				del feature["properties"]["CLASSFP"]
				del feature["properties"]["COUNTYFP"]
				del feature["properties"]["COUNTYNS"]
				del feature["properties"]["CSAFP"]
				del feature["properties"]["FUNCSTAT"]
				del feature["properties"]["INTPTLAT"]
				del feature["properties"]["INTPTLON"]
				del feature["properties"]["LSAD"]
				del feature["properties"]["METDIVFP"]
				del feature["properties"]["MTFCC"]
				saved_features.append(feature)
				county_ctr+=1
		geodata_county_pop["features"] = saved_features # removes shapes that arent displayed

		debug_msg("saving data")
		# save data
		data_county.to_csv(county_path)
		data_state.to_csv(state_path)
		unique_counties.to_csv(unique_county_path, header=True)

		#save total data
		with open(total_path, 'w') as f:
			dump(geodata_total, f)

		# save county data
		with open(geodata_county_path, 'w') as f:
			dump(geodata_county, f)			
		with open(geodata_county_pop_path, 'w') as f:
			dump(geodata_county_pop, f)

		# save state data
		with open(geodata_state_path, 'w') as f:
			dump(geodata_state, f)
		with open(geodata_state_pop_path, 'w') as f:
			dump(geodata_state_pop, f)

		# prep total data
		data_total = data_total.to_dict('records')

		return geodata_county, geodata_county_pop, geodata_state, geodata_state_pop, date_list, unique_counties, geodata_total
	else:
		debug_msg("loading locally")

		# load data
		data_county = pd.read_csv(county_path)
		data_state = pd.read_csv(state_path)
		date_list = data_county["date_id"].astype(str).unique().tolist()
		unique_counties = pd.read_csv(unique_county_path)
		unique_counties = unique_counties.values.tolist()

		# load total data
		with open(total_path) as f:
			geodata_total = json.load(f)

		# load county data
		with open(geodata_county_path) as f:
			geodata_county = json.load(f)
		with open(geodata_county_pop_path) as f:
			geodata_county_pop = json.load(f)

		# load state data
		with open(geodata_state_path) as f:
			geodata_state = json.load(f)
		with open(geodata_state_pop_path) as f:
			geodata_state_pop = json.load(f)

		return geodata_county, geodata_county_pop, geodata_state, geodata_state_pop, date_list, unique_counties, geodata_total


def debug_msg(msg):
	print(time.strftime("[%m/%d/%Y %H:%M:%S] ") + msg)
