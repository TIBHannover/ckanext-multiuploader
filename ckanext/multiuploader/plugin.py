from ckan import plugins
from ckan.plugins import toolkit
from flask import Blueprint

from ckanext.multiuploader.controllers import UploadController


class MultiuploaderPlugin(plugins.SingletonPlugin):
    plugins.implements(plugins.IConfigurer)
    plugins.implements(plugins.IBlueprint)
    plugins.implements(plugins.ITemplateHelpers)

    # IConfigurer

    def update_config(self, config_):
        toolkit.add_template_directory(config_, "templates")
        toolkit.add_public_directory(config_, "public")
        toolkit.add_resource("fanstatic", "multiuploader")
        toolkit.add_resource("public/statics", "ckanext-multiuploader")

    # plugin Blueprint

    def get_blueprint(self):

        blueprint = Blueprint(self.name, self.__module__)
        blueprint.template_folder = "templates"
        blueprint.add_url_rule(
            "/multiuploader/upload_resources",
            "upload_resources",
            UploadController.upload_resources,
            methods=["POST"],
        )

        blueprint.add_url_rule(
            "/multiuploader/delete_uploaded_resources",
            "delete_uploaded_resources",
            UploadController.delete_uploaded_resources,
            methods=["POST"],
        )

        return blueprint

    # ITemplateHelpers

    def get_helpers(self):
        return {
            "cancel_dataset_is_enabled": UploadController.cancel_dataset_plugin_is_enabled,
            "get_max_upload_size": UploadController.get_upload_limit,
            "which_sfb_multiuploader": UploadController.which_sfb_multiuploader,
        }
