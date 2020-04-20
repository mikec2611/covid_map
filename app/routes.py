from flask import render_template
from app import app

import app.covid_map as cm
import pandas as pd
import json

@app.route('/')
def covid_map():
	data_county, geodata_county, date_list = cm.run_process(get_data_flag=False)
	
	return render_template('covid_map.html', date_list=date_list, data_county=data_county, geodata_county=geodata_county)