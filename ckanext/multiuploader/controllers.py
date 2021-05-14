# encoding: utf-8

from flask import request, redirect
import ckan.lib.helpers as h
from ckanext.multiuploader.lib import Helper

class UploadController():

    def upload_resources():
        package_name = request.form['pck_id']
        action = request.form.get('save')
        if action == "go-dataset":  # Previous button: go back to the dataset metadat 
            return h.redirect_to('/dataset/edit/' + str(package_name))

        elif action == "go-dataset-complete": # Add resource to an active dataset
            Helper.add_resource(package_name, request, False)
            return redirect('/dataset/' + package_name)
        
        else: # Add resource to a draft dataset
            Helper.add_resource(package_name, request, True)
            return redirect('/dataset/' + package_name)
