from flask import render_template
from app import app

import app.covid_map as cm
import pandas as pd
import json

@app.route('/')
@app.route('/index')
def index():
	return render_template()

@app.route('/covid_map')
def covid_map():
	data_county, geodata_county, date_list = cm.run_process(get_data_flag=True)
	
	return render_template('covid_map.html', date_list=date_list, data_county=data_county, geodata_county=geodata_county)