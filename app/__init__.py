from celery import Celery
from flask import Flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy


from config import config, Config



# async_mode = None
#
# if async_mode is None:
#     try:
#         import eventlet
#         async_mode = 'eventlet'
#     except ImportError:
#         pass
#
#     if async_mode is None:
#         try:
#             from gevent import monkey
#             async_mode = 'gevent'
#         except ImportError:
#             pass
#
#     if async_mode is None:
#         async_mode = 'threading'
#
#     print('async_mode is ' + async_mode)
#
# # monkey patching is necessary because this application uses a background
# # thread
# if async_mode == 'eventlet':
#     import eventlet
#     eventlet.monkey_patch()
# elif async_mode == 'gevent':
#     from gevent import monkey
#     monkey.patch_all()


db = SQLAlchemy()
socketio = SocketIO()
celery = Celery(__name__, broker=Config.CELERY_BROKER_URL)


# plate_zips = UploadSet('plates', ARCHIVES)
# fsa_files = UploadSet('fsafiles', ('fsa',))


def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    socketio.init_app(app)
    db.app = app
    db.init_app(app)
    celery.conf.update(app.config)


    # from app.plasmomapper.fsa_extractor import fsa_extractor
    # app.register_blueprint(fsa_extractor)

    from app.plasmomapper.events import plasmomapper
    app.register_blueprint(plasmomapper)

    # configure_uploads(app, (plate_zips,))

    return app
