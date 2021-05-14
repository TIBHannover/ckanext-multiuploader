# encoding: utf-8

import ckan.plugins.toolkit as toolkit

class Helper():

    def add_resource(package_name, request, active):
        package = toolkit.get_action('package_show')({}, {'name_or_id': package_name})
        description = request.form['description']
        name = request.form['name']
        context = {}
        for resource in request.files.getlist('urls[]'):
            resource_data = {}
            resource_data = {
                'package_id' : package['id'],
                'url': resource.filename,
                'description': description,
                'name': resource.filename,
                'url_type': 'upload',
                'upload': resource,
            }
            resource = toolkit.get_action('resource_create')(context, resource_data)
            package['resources'].append(resource)
            if active:
                package['state'] = 'active'
            toolkit.get_action('package_update')({},package)
            
        return True