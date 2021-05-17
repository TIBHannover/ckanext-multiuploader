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
                return base_url + '/dataset/edit/' + str(package_name)

            elif action == "go-dataset-complete": # Add resource to an active dataset
                Helper.add_resource(package_name, request, False)
                return base_url + '/dataset/' + package_name
            
            else: # Add resource to a draft dataset
                Helper.add_resource(package_name, request, True)            
                return base_url + '/dataset/' + package_name
