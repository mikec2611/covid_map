from flask import render_template
# from flask import request
from flask import jsonify
from app import app

import app.covid_map as cm
import pandas as pd
import json

@app.route('/')
def covid_map():
	# geodata_county, geodata_county_pop, geodata_state, geodata_state_pop, date_list, unique_county, data_total = cm.run_process(get_data_flag=False)
	
	return render_template('covid_map.html'#,
						   # date_list=date_list,
						   # geodata_county=geodata_county,
						   # geodata_county_pop=geodata_county_pop,
						   # geodata_state=geodata_state,
						   # geodata_state_pop=geodata_state_pop,
						   # unique_county=unique_county,
						   # data_total=data_total
						  )

@app.route("/get_data", methods=['POST'])
def get_data():
	geodata_county, geodata_county_pop, geodata_state, geodata_state_pop, date_list, unique_county, data_total = cm.run_process(get_data_flag=False)
	return jsonify([geodata_county, geodata_county_pop, geodata_state, geodata_state_pop, date_list, unique_county, data_total])