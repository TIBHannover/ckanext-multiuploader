# encoding: utf-8

from flask import request, url_for
import ckan.lib.helpers as h
from ckanext.multiuploader.lib import Helper

class UploadController():

    def upload_resources():
        base_url = h.get_site_protocol_and_host()[0] + '://' + h.get_site_protocol_and_host()[1]
        if request.method == "POST":                
            package_name = request.form['pck_id']
            action = request.form['save']
            if action == "go-dataset":  # Previous button: go back to the dataset metadat                 
                return h.url_for('dataset.edit', id=str(package_name) ,  _external=True)

            elif action == "go-dataset-complete": # Add resource to an active dataset
                Helper.add_resource(package_name, request, False, int(request.form['isLink']))                
                return h.url_for('dataset.read', id=str(package_name) ,  _external=True)
            
            else: # Add resource to a draft dataset
                Helper.add_resource(package_name, request, True, int(request.form['isLink']))                            
                return h.url_for('dataset.read', id=str(package_name) ,  _external=True)
