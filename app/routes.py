from flask import render_template
from app import app

import app.covid_map as cm
import pandas as pd
import json

@app.route('/')
def covid_map():
	geodata_county, geodata_state, date_list, unique_county = cm.run_process(get_data_flag=False)
	
	return render_template('covid_map.html', date_list=date_list, geodata_county=geodata_county, geodata_state=geodata_state, unique_county=unique_county)