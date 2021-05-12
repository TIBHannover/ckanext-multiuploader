import ckan.plugins as plugins
import ckan.plugins.toolkit as toolkit
from flask import Blueprint


class MultiuploaderPlugin(plugins.SingletonPlugin):
    plugins.implements(plugins.IConfigurer)
    plugins.implements(plugins.IBlueprint)

    # IConfigurer

    def update_config(self, config_):
        toolkit.add_template_directory(config_, 'templates')
        toolkit.add_public_directory(config_, 'public')
        toolkit.add_resource('fanstatic',
            'multiuploader')


    #plugin Blueprint

    def get_blueprint(self):

        blueprint = Blueprint(self.name, self.__module__)
        blueprint.template_folder = u'templates'

        return blueprint