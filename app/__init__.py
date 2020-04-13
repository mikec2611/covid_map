from flask import Flask

app = Flask(__name__)
# app.run(host="0.0.0.0", port=8080, threaded=True)

from app import routes