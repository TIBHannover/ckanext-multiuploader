# encoding: utf-8

import ckan.plugins.toolkit as toolkit
class Helper():

    def add_resource(package_name, request, active, isLink):
        context = {'user': toolkit.g.user}
        package = toolkit.get_action('package_show')(context, {'id': package_name})
        description = request.form['description']
        if isLink == 1: # resource is a link not file
            resource_data = {}
            resource_data = {
                'package_id' : package['id'],
                'url': request.form['url'],
                'description': description,
                'name': request.form['name'],
                'url_type': '',                
            }
            # resource_create already attaches the resource to the package.
            # Appending it again and calling package_update corrupts the
            # resource positions on CKAN >= 2.12 (IndexError later on).
            toolkit.get_action('resource_create')(context, resource_data)
            Helper._activate(context, package, active)
            return True


        for resource in request.files.getlist('files'):
            resource_data = {}
            resource_data = {
                'package_id' : package['id'],
                'url': resource.filename,
                'description': description,
                'name': resource.filename,
                'url_type': 'upload',
                'upload': resource,
            }
            toolkit.get_action('resource_create')(context, resource_data)

        Helper._activate(context, package, active)
        return True

    def _activate(context, package, active):
        """Set the dataset active (once) if requested and still a draft."""
        if active and package.get('state') != 'active':
            toolkit.get_action('package_patch')(
                dict(context), {'id': package['id'], 'state': 'active'}
            )
    
    def check_plugin_enabled(plugin_name):
        plugins = toolkit.config.get("ckan.plugins")
        if plugin_name in plugins:
            return True
        return False