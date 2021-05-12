import ckan.plugins.toolkit as toolkit
from flask import request, redirect

class UploadController():

    def upload_resources():
        package_name = request.form['pck_id']
        package = toolkit.get_action('package_show')({}, {'name_or_id': package_name})
        resource_data = {
            'package_id' : package['id'],
            'url': request.form['url'],
            'description': request.form['description'],
            'name': request.form['name'],
            'url_type': 'upload',
            'upload': request.files['upload'],
        }
        context = {}
        resource = toolkit.get_action('resource_create')(context, resource_data)
        package['state'] = 'active'
        package['resources'].append(resource)
        toolkit.get_action('package_update')({},package)
        
        return redirect('/dataset/' + package_name)