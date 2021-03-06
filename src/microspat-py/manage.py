"""
    MicroSPAT is a collection of tools for the analysis of Capillary Electrophoresis Data
    Copyright (C) 2016  Maxwell Murphy

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
"""

import os
from app.microspat.models import *


if os.path.exists('.env'):
    for line in open('.env'):
        var = line.strip().split('=')
        if len(var) == 2:
            print(var[0] + " : " + var[1])
            os.environ[var[0]] = var[1]

from app import socketio, create_app, db, microspat
from flask_script import Manager, Shell
# from flask_migrate import Migrate, MigrateCommand

app = create_app(os.getenv('FLASK_CONFIG') or 'default')
manager = Manager(app)
# migrate = Migrate(app, db)


def make_shell_context():
    return dict(app=app, db=db, microspat=microspat)


def make_plasmomapper_shell_context():
    return dict(app=app, db=db, Project=Project, Sample=Sample,
                Plate=Plate, Well=Well, Channel=Channel,
                Ladder=Ladder, Locus=Locus,
                LocusSet=LocusSet, BinEstimatorProject=BinEstimatorProject)


manager.add_command('shell', Shell(make_context=make_shell_context))
manager.add_command('pm_shell', Shell(make_context=make_plasmomapper_shell_context))
# manager.add_command('db', MigrateCommand)


# @manager.command
# def deploy():
#     """
#     Run Deployment Tasks.  Load data including Dye Sets, Marker Sets, Default Parameter settings.
#     """
#     from flask.ext.migrate import upgrade
#     upgrade()


@manager.command
def runsockets(addr='0.0.0.0:17328'):
    # vacuum()
    auto_vacuum()
    host, port = addr.split(':')
    port = int(port) or 17328
    # webbrowser.open("http://localhost:{}/".format(port))
    print(f"Starting app at {addr}")
    socketio.run(app, host=host, port=port)


def auto_vacuum():
    if db.engine.url.drivername == 'sqlite':
        db.engine.execute("PRAGMA auto_vacuum = 2")
        db.engine.execute("PRAGMA incremental_vacuum(10000)")


@manager.command
def vacuum():
    if db.engine.url.drivername == 'sqlite':
        print("Beginning Vacuum of Database.")
        db.engine.execute("VACUUM")
        print("Vacuum Completed.")
    else:
        print("Database does not support VACUUM command.")


@manager.command
def initDB():
    db.create_all()
    ladder = Ladder(label='HDROX400',
                    base_sizes=[50, 60, 90, 100, 120, 150, 160, 180, 190, 200, 220, 240, 260, 280, 290, 300, 320, 340,
                                360, 380, 400], color='red')
    db.session.add(ladder)

    base_path = './fixtures'
    d = "LocusSets"
    if os.path.exists(os.path.join(base_path, d)):
        for locus_set in os.listdir(os.path.join(base_path, d)):
            if not locus_set[0] == '.' and locus_set:
                with open(os.path.join(base_path, d, locus_set)) as f:
                    loci = load_loci_from_csv(f)
                    map(db.session.add, loci)
                    ls = LocusSet(label=os.path.splitext(locus_set)[0])
                    db.session.add(ls)
                    ls.loci = loci

    d = "Samples"
    if os.path.exists(os.path.join(base_path, d)):
        for sample_set in os.listdir(os.path.join(base_path, d)):
            if not sample_set[0] == '.':
                with open(os.path.join(base_path, d, sample_set)) as f:
                    samples = load_samples_from_csv(f)
                    map(db.session.add, samples)

    db.session.commit()


if __name__ == '__main__':
    manager.run()
