from collections import defaultdict

from sqlalchemy.orm.exc import NoResultFound

from app import db, socketio

from app.microspat.models.quantification_bias_estimator.locus_params import QuantificationBiasEstimatorLocusParams
from app.microspat.models.sample.exceptions import ControlException
from app.microspat.quantification_bias.BiasCalculator import correct_peak_proportion, calculate_beta
from app.microspat.models.project.sample_annotations import ProjectSampleAnnotations
from app.microspat.models.sample.control_sample_association import ControlSampleAssociation
from app.microspat.models.sample.sample_locus_annotation import SampleLocusAnnotation
from app.microspat.models.sample.control import Control
from app.microspat.models.sample.sample import Sample
from app.microspat.models.artifact_estimator.artifact_estimating import ArtifactEstimating
from app.microspat.models.bin_estimator.bin_estimating import BinEstimating
from app.microspat.models.project.channel_annotations import ProjectChannelAnnotations
from app.microspat.models.project.sample_based_project import SampleBasedProject
from app.microspat.models.quantification_bias_estimator.exceptions import BadProportions
from app.microspat.models.sample.genotype import Genotype
from app.microspat.models.bin_estimator.locus_bin_set import LocusBinSet
from app.microspat.models.bin_estimator.bin import Bin
from app.microspat.models.bin_estimator.project import BinEstimatorProject
from app.microspat.models.ce.channel import Channel
from app.microspat.models.locus.locus import Locus
from app.microspat.models.locus.locus_set import locus_set_association_table, LocusSet
from app.microspat.models.project.project import Project

from app.utils import CaseInsensitiveDictReader, subset


class QuantificationBiasEstimatorProject(SampleBasedProject, ArtifactEstimating, BinEstimating):
    id = db.Column(db.Integer, db.ForeignKey('sample_based_project.id', ondelete="CASCADE"), primary_key=True)
    locus_parameters = db.relationship('QuantificationBiasEstimatorLocusParams',
                                       backref=db.backref('quantification_bias_estimator_project'),
                                       lazy='dynamic', cascade='save-update, merge, delete, delete-orphan')

    __mapper_args__ = {'polymorphic_identity': 'quantification_bias_estimator_project'}

    @classmethod
    def get_serialized_list(cls):
        projects = QuantificationBiasEstimatorProject.query.values(cls.id, cls.title, cls.date, cls.creator,
                                                                   cls.description, cls.artifact_estimator_id,
                                                                   cls.locus_set_id, cls.bin_estimator_id,
                                                                   cls.last_updated)
        locus_parameters = QuantificationBiasEstimatorLocusParams.query.values(
            QuantificationBiasEstimatorLocusParams.id,
            QuantificationBiasEstimatorLocusParams.project_id
        )
        locus_parameters_dict = defaultdict(list)
        for lp in locus_parameters:
            locus_parameters_dict[lp[1]].append(lp[0])

        res = []
        for p in projects:
            r = {
                'id': p[0],
                'title': p[1],
                'date': p[2],
                'creator': p[3],
                'description': p[4],
                'artifact_estimator': p[5],
                'locus_set': p[6],
                'bin_estimator': p[7],
                'last_updated': p[8],
                'locus_parameters': locus_parameters_dict[p[0]]
            }
            res.append(r)
        return res

    def artifact_estimator_changed(self, locus_id):
        lp = self.get_locus_parameters(locus_id)
        lp.set_filter_parameters_stale()
        return self

    def bin_estimator_changed(self, locus_id):
        lp = self.get_locus_parameters(locus_id)
        lp.set_filter_parameters_stale()
        return self

    def filter_parameters_set_stale(self, locus_id):
        lp = self.get_locus_parameters(locus_id)
        lp.quantification_bias_parameters_stale = True
        self.parameters_changed(locus_id)

    def scanning_parameters_set_stale(self, locus_id):
        lp = self.get_locus_parameters(locus_id)
        lp.quantification_bias_parameters_stale = True
        self.parameters_changed(locus_id)

    def samples_changed(self, locus_id):
        lp = self.get_locus_parameters(locus_id)
        lp.quantification_bias_parameters_stale = True
        self.parameters_changed(locus_id)

    def parameters_changed(self, locus_id):
        from app.microspat.models.genotyping.project import GenotypingProject
        projects = GenotypingProject.query.filter(GenotypingProject.bin_estimator_id == self.id).all()
        for project in projects:
            assert isinstance(project, GenotypingProject)
            project.quantification_bias_estimator_changed(locus_id)

    def annotate_quantification_bias(self, locus_id, peak_set):
        peak_set = correct_peak_proportion(self.get_beta(locus_id), peak_set)
        return peak_set

    def assign_controls(self, sample_annotation_id, controls):
        """
        :type sample_annotation_id: int
        :type controls: list[(int, float)]
        :return:
        """
        sample_annotation = ProjectSampleAnnotations.query.get(sample_annotation_id)
        assert isinstance(sample_annotation, ProjectSampleAnnotations)
        if sample_annotation.project_id != self.id:
            raise BadProportions("Sample is not a member of this project.")

        if abs(sum([_[1] for _ in controls]) - 1) > .00001:
            raise BadProportions("Sum of control proportions does not add to 1.")

        temp = []
        for control in controls:
            c = Control.query.get(control[0])
            if c.bin_estimator_id != self.bin_estimator_id:
                raise BadProportions("Control Bin Estimator Does Not Match Project Bin Estimator")
            temp += [(c, control[1])]
        controls = temp

        ControlSampleAssociation.query.filter(
            ControlSampleAssociation.sample_annotation_id == sample_annotation_id).delete()

        for control in controls:
            c, prop = control
            # noinspection PyArgumentList
            new_control_association = ControlSampleAssociation(control_id=c.id,
                                                               sample_annotation_id=sample_annotation_id,
                                                               proportion=prop)
            db.session.add(new_control_association)

        return self

    def get_beta(self, locus_id):
        return self.get_locus_parameters(locus_id).beta

    def calculate_beta(self, locus_id):
        lp = self.get_locus_parameters(locus_id)
        assert isinstance(lp, QuantificationBiasEstimatorLocusParams)
        if lp:
            locus_annotations = self.get_locus_sample_annotations(locus_id)
            peak_sets = [list(filter(lambda _: _['true_proportion'] > lp.min_bias_quantifier_peak_proportion and
                                               _['peak_height'] > lp.min_bias_quantifier_peak_height,
                                     locus_annotation.annotated_peaks)) for locus_annotation in locus_annotations]
            peak_sets = [_ for _ in peak_sets if
                         abs(sum([peak['true_proportion'] for peak in _]) - 1) < .0001 and len(list(_)) > 1]
            if peak_sets:
                lp.beta, lp.sd, lp.r_squared = calculate_beta(peak_sets,
                                                              min_peak_proportion=lp.min_bias_quantifier_peak_proportion)
            else:
                lp.beta = None
        return self

    def update_true_proportion(self, locus_annotation_id, peaks):
        locus_annotation = SampleLocusAnnotation.query.filter(SampleLocusAnnotation.id == locus_annotation_id,
                                                              SampleLocusAnnotation.project_id == self.id).first()
        if locus_annotation:
            while peaks:
                updated_peak = peaks.pop()
                for peak in locus_annotation.annotated_peaks:
                    if peak['index'] == updated_peak['index']:
                        peak.update(updated_peak)
        locus_annotation.annotated_peaks.changed()
        return self

    def analyze_locus(self, locus_id):
        locus_params = self.get_locus_parameters(locus_id)
        assert isinstance(locus_params, QuantificationBiasEstimatorLocusParams)
        if locus_params.scanning_parameters_stale or locus_params.filter_parameters_stale:
            locus_params.quantification_bias_parameters_stale = True

        super(QuantificationBiasEstimatorProject, self).analyze_locus(locus_id)

        if locus_params.quantification_bias_parameters_stale:
            self.analyze_samples(locus_id)
            locus_params.quantification_bias_parameters_stale = False

        self.calculate_beta(locus_id)
        self.analyze_samples(locus_id)
        return self

    def annotate_channel(self, channel_annotation):
        assert isinstance(channel_annotation, ProjectChannelAnnotations)
        # super(QuantificationBiasEstimatorProject, self).annotate_channel(channel_annotation)

        if channel_annotation.annotated_peaks:
            if self.bin_estimator:
                self.annotate_bins([channel_annotation])

            if self.artifact_estimator:
                self.annotate_artifact([channel_annotation])

    def add_sample(self, sample_id):
        sample_annotation = ProjectSampleAnnotations(sample_id=sample_id)
        self.sample_annotations.append(sample_annotation)

        channel_ids = self.valid_channel_ids(sample_id)
        self.add_channels(channel_ids)

        for locus in self.locus_set.loci:
            locus_annotation = Genotype(locus_id=locus.id, project_id=self.id)
            bin_ids = Bin.query.join(LocusBinSet).join(BinEstimatorProject).filter(
                BinEstimatorProject.id == self.bin_estimator_id).filter(LocusBinSet.locus_id == locus.id).values(Bin.id)
            locus_annotation.alleles = dict([(str(bin_id[0]), False) for bin_id in bin_ids])
            sample_annotation.locus_annotations.append(locus_annotation)
            self.samples_changed(locus.id)

        return sample_annotation

    def add_samples(self, sample_ids):
        present_sample_ids = set([_[0] for _ in ProjectSampleAnnotations.query
                                 .filter(ProjectSampleAnnotations.project_id == self.id)
                                 .values(ProjectSampleAnnotations.sample_id)])
        full_sample_ids = list(set(sample_ids) - present_sample_ids)

        # Cache all channel IDs available
        sample_ids_map = defaultdict(list)
        channel_and_sample_ids = Channel.query.join(Sample).join(Locus).join(locus_set_association_table).join(
            LocusSet).join(
            Project).filter(Project.id == self.id).values(Channel.id, Channel.sample_id)
        for channel_id, sample_id in channel_and_sample_ids:
            sample_ids_map[sample_id].append(channel_id)

        # Cache all bin IDs
        bins_map = defaultdict(list)
        bin_and_locus_ids = Bin.query.join(LocusBinSet).join(BinEstimatorProject).filter(
            BinEstimatorProject.id == self.bin_estimator_id).values(Bin.id, LocusBinSet.locus_id)
        for bin_id, locus_id in bin_and_locus_ids:
            bins_map[locus_id].append(bin_id)

        n = 0

        for sample_ids in subset(full_sample_ids, 100):
            channel_ids = []
            for sample_id in sample_ids:
                socketio.sleep()
                channel_ids += sample_ids_map[sample_id]
                sample_annotation = ProjectSampleAnnotations(sample_id=sample_id, project_id=self.id)
                db.session.add(sample_annotation)
                self.sample_annotations.append(sample_annotation)
                for locus in self.locus_set.loci:
                    locus_annotation = Genotype(locus_id=locus.id, project_id=self.id)
                    bin_ids = bins_map[locus.id]
                    locus_annotation.alleles = dict([(str(bin_id), False) for bin_id in bin_ids])
                    sample_annotation.locus_annotations.append(locus_annotation)
            self.bulk_create_channel_annotations(channel_ids)
            db.session.flush()
            n += 1

        for locus in self.locus_set.loci:
            self.samples_changed(locus.id)

        return self

    def analyze_samples(self, locus_id):
        self.clear_sample_annotations(locus_id)
        locus_params = self.get_locus_parameters(locus_id)
        assert isinstance(locus_params, QuantificationBiasEstimatorLocusParams)

        locus_annotations = self.get_locus_sample_annotations(locus_id)
        all_runs = self.get_runs(locus_id)

        for locus_annotation in locus_annotations:
            socketio.sleep()
            try:
                locus_annotation.alleles.pop('None')
            except KeyError:
                pass

            assert isinstance(locus_annotation, SampleLocusAnnotation)

            runs = all_runs.get(locus_annotation.sample_annotation.sample_id, [])

            if runs:
                channel_annotation = self.select_best_run(all_runs[locus_annotation.sample_annotation.sample_id],
                                                          locus_params.offscale_threshold)
            else:
                channel_annotation = None

            if channel_annotation:
                locus_annotation.reference_run = channel_annotation
                peaks = channel_annotation.annotated_peaks[:]

                for peak in peaks:
                    peak.update({'true_proportion': 0})

                controls_and_props = ControlSampleAssociation.query.filter(
                    ControlSampleAssociation.sample_annotation_id == locus_annotation.sample_annotations_id).values(
                    ControlSampleAssociation.control_id, ControlSampleAssociation.proportion)

                true_peak_indices = set()
                true_peaks = []

                for control_id, proportion in controls_and_props:

                    control = Control.query.get(control_id)
                    assert isinstance(control, Control)
                    if control.alleles[str(locus_annotation.locus_id)]:
                        bin_id = str(control.alleles[str(locus_annotation.locus_id)])
                        control_peaks = [_ for _ in peaks if str(_['bin_id']) == bin_id]
                        if control_peaks:
                            true_peak = max(control_peaks, key=lambda _: _.get('peak_height'))
                            true_peak['true_proportion'] += proportion
                            if true_peak['peak_index'] not in true_peak_indices:
                                true_peaks.append(true_peak)
                                true_peak_indices.add(true_peak['peak_index'])

                        locus_annotation.alleles[bin_id] = True

                true_peaks = self.annotate_quantification_bias(locus_annotation.locus_id, true_peaks)

                locus_annotation.annotated_peaks = true_peaks
            else:
                locus_annotation.reference_run = None
                locus_annotation.annotated_peaks = []
                locus_annotation.alleles = dict.fromkeys(self.bin_estimator.get_alleles_dict(locus_id), False)
                locus_annotation.set_flag('manual_curation', False)
        return self

    def serialize(self):
        res = super(QuantificationBiasEstimatorProject, self).serialize()
        return res

    def serialize_details(self):
        res = super(QuantificationBiasEstimatorProject, self).serialize_details()
        res.update({
            'locus_parameters': {_.locus_id: _.serialize() for _ in self.locus_parameters.all()},
            'sample_annotations': {x.id: x.serialize() for x in self.sample_annotations.all()}
        })
        return res


def load_samples_and_controls_from_csv(f, qbe_proj_id):
    r = CaseInsensitiveDictReader(f)
    qbe = QuantificationBiasEstimatorProject.query.get(qbe_proj_id)
    control_map = {}
    assert isinstance(qbe, QuantificationBiasEstimatorProject)
    for d in r:
        barcode = d.pop('barcode')
        sample_id = Sample.query.filter(Sample.barcode == barcode).value(Sample.id)
        if not barcode:
            raise ControlException("Barcode header missing.")
        controls_and_props = d.values()
        controls_and_props = list(map(lambda _: _.strip().split(';'), controls_and_props))
        controls = []
        for control_and_prop in controls_and_props:
            if len(control_and_prop) > 1:
                control, prop = control_and_prop
                try:
                    prop = float(prop)
                except ValueError:
                    raise ControlException("Control entry malformed.")
                try:
                    c = Control.query.filter(Control.barcode == control).filter(
                        Control.bin_estimator_id == qbe.bin_estimator_id).one()
                except NoResultFound:
                    raise ControlException(f"Control '{control}' malformed or Bin Estimator does not match.")
                assert isinstance(c, Control)
                controls.append((c.id, prop))
        if controls:
            control_map[sample_id] = controls
    sample_ids = control_map.keys()
    qbe.add_samples(sample_ids)
    sample_annotation_ids = qbe.sample_annotations.values(ProjectSampleAnnotations.id,
                                                          ProjectSampleAnnotations.sample_id)
    for sa_id, sample_id in sample_annotation_ids:
        qbe.assign_controls(sa_id, control_map[sample_id])
