# encoding: utf-8

import ckan.plugins as plugins
import ckan.plugins.toolkit as toolkit
from ckanext.multiuploader.controllers import UploadController
from flask import Blueprint


class MultiuploaderPlugin(plugins.SingletonPlugin):
    plugins.implements(plugins.IConfigurer)
    plugins.implements(plugins.IBlueprint)
    plugins.implements(plugins.ITemplateHelpers)

    # IConfigurer

    def update_config(self, config_):
        toolkit.add_template_directory(config_, 'templates')
        toolkit.add_public_directory(config_, 'public')
        toolkit.add_resource('fanstatic', 'multiuploader')
        toolkit.add_resource('public/statics', 'ckanext-multiuploader')
        

    #plugin Blueprint

    def get_blueprint(self):

        blueprint = Blueprint(self.name, self.__module__)
        blueprint.template_folder = u'templates'
        blueprint.add_url_rule(
            u'/multiuploader/upload_resources',
            u'upload_resources',
            UploadController.upload_resources,
            methods=['POST']
            )

        return blueprint
    
    #ITemplateHelpers

    def get_helpers(self):
        return {'cancel_dataset_is_enabled': UploadController.cancel_dataset_plugin_is_enabled, 
            'get_max_upload_size': UploadController.get_upload_limit
        }