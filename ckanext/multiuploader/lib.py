# encoding: utf-8

import ckan.plugins.toolkit as toolkit

class Helper():

    @staticmethod
    def add_resource(package_name, request, active, isLink):
        package = toolkit.get_action('package_show')({}, {'name_or_id': package_name})
        description = request.form['description']
        context = {}
        if isLink == 1: # resource is a link not file
            resource_data = {
                'package_id' : package['id'],
                'url': request.form['url'],
                'description': description,
                'name': request.form['name'],
                'url_type': '',
            }
            toolkit.get_action('resource_create')(context, resource_data)
            if active:
                pkg = toolkit.get_action('package_show')(context, {'name_or_id': package_name})
                pkg['state'] = 'active'
                toolkit.get_action('package_update')(context, pkg)
            return True

        for upload in request.files.getlist('files'):
            resource_data = {
                'package_id' : package['id'],
                'url': upload.filename,
                'description': description,
                'name': upload.filename,
                'url_type': 'upload',
                'upload': upload,
            }
            toolkit.get_action('resource_create')(context, resource_data)

        if active:
            pkg = toolkit.get_action('package_show')(context, {'name_or_id': package_name})
            pkg['state'] = 'active'
            toolkit.get_action('package_update')(context, pkg)

        return True
    
    @staticmethod
    def check_plugin_enabled(plugin_name):
        plugins = toolkit.config.get("ckan.plugins", [])
        return plugin_name in plugins