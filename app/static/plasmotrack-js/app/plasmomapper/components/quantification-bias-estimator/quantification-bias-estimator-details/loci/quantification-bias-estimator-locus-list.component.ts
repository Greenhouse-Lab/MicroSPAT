import { Component, OnInit } from '@angular/core';
import { RouteParams, Router } from '@angular/router-deprecated';

import { LocusPipe } from '../../../../pipes/locus.pipe';
import { SectionHeaderComponent } from '../../../layout/section-header.component'
import { ProgressBarComponent } from '../../../layout/progress-bar.component';

import { LocusParametersListComponent } from '../../../project/locus-parameters-list.component';
import { CommonLocusParametersDetailComponent } from '../../../project/common-locus-parameters-detail.component';

import { LocusParametersDetailComponent } from '../../../project/locus-parameters-detail.component';

import { QuantificationBiasEstimatorLocusParameters } from '../../../../services/quantification-bias-estimator-project/locus-parameters/quantification-bias-estimator-locus-parameters.model';
import { SampleLocusAnnotation } from '../../../../services/sample-based-project/sample-annotation/locus-annotation/sample-locus-annotation.model';
import { ChannelAnnotation } from '../../../../services/project/channel-annotation/channel-annotation.model';

import { QuantificationBiasEstimatorProject } from '../../../../services/quantification-bias-estimator-project/quantification-bias-estimator-project.model';
import { QuantificationBiasEstimatorProjectService } from '../../../../services/quantification-bias-estimator-project/quantification-bias-estimator-project.service';

import { Locus } from '../../../../services/locus/locus.model';
import { LocusService } from '../../../../services/locus/locus.service';

import { Bin } from '../../../../services/bin-estimator-project/locus-bin-set/bin/bin.model';
import { BinEstimatorProject } from '../../../../services/bin-estimator-project/bin-estimator-project.model';
import { BinEstimatorProjectService } from '../../../../services/bin-estimator-project/bin-estimator-project.service';
import { D3SampleAnnotationEditor } from '../../sample-annotation-editor.component';


interface AnnotationFilter {
    failures: boolean;
    offscale: boolean;
    out_of_bin: boolean;
    min_allele_count: number;
    max_allele_count: number;
    crosstalk: number;
    bleedthrough: number;
    main_min_peak_height: number;
    main_max_peak_height: number;
}


@Component({
    selector: 'quantification-bias-estimator-project-locus-list',
    pipes: [LocusPipe],
    host: {
        '(document:keydown)': 'eventHandler($event)'
    },
    template: `
        <pm-section-header [header]="header" [navItems]="navItems"></pm-section-header>
        <div class="row">
            <div class="col-sm-4">
                <div class="row">
                    <div class="panel panel-default">
                        <div (click)="locusParamsCollapsed = !locusParamsCollapsed" class="panel-heading">
                            <div *ngIf="selectedLocusParameter" class="h3 panel-title">
                                <span>{{selectedLocusParameter.locus_id | locus | async}}</span> 
                                <span *ngIf="selectedLocusAnnotations"> | {{selectedLocusAnnotations.length}} Samples </span> 
                                <span *ngIf="failureRate"> | Failure Rate: {{failureRate | number}}</span>
                                <span *ngIf="locusParamsCollapsed" class="glyphicon glyphicon-menu-right pull-right"></span>
                                <span *ngIf="!locusParamsCollapsed" class="glyphicon glyphicon-menu-down pull-right"></span>
                            </div>
                             <div *ngIf="!selectedLocusParameter" class="h3 panel-title">
                                <span>Select a Locus</span>
                            </div>
                        </div>
                        <div *ngIf="!locusParamsCollapsed" class="panel-body">
                            <pm-locus-parameter-list class="list-panel" [(locusParameters)]="locusParameters" (locusClicked)="selectLocus($event)">
                            </pm-locus-parameter-list>
                            <form *ngIf="selectedLocusParameter">
                                <pm-common-locus-parameter-detail [(locusParameter)]="selectedLocusParameter"></pm-common-locus-parameter-detail>
                                <div class="row">
                                    <h4>Quantification Bias Estimator Settings</h4>
                                    <div class="col-sm-6">    
                                        <div class="form-group">
                                            <label>Min Peak Height</label>
                                            <input class="form-control input-sm" (change)="onChanged()" type="number" required step="1" min="0" [(ngModel)]="selectedLocusParameter.min_bias_quantifier_peak_height">
                                        </div>
                                        <div class="form-group">
                                            <label>Min True Peak Proportion</label>
                                            <input class="form-control input-sm" (change)="onChanged()" type="number" required step="any" min="0" max="1" [(ngModel)]="selectedLocusParameter.min_bias_quantifier_peak_proportion">
                                        </div>
                                        <div class="form-group">
                                            <label>Offscale Threshold</label>
                                            <input class="form-control input-sm" (change)="onChanged()" type="number" required step="1" min="0" [(ngModel)]="selectedLocusParameter.offscale_threshold">
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="form-group">
                                            <label>Beta</label>
                                            <input class="form-control input-sm" disabled type="number" [(ngModel)]="selectedLocusParameter.beta">
                                        </div>
                                        <div class="form-group">
                                            <label>SD</label>
                                            <input class="form-control input-sm" disabled type="number" [(ngModel)]="selectedLocusParameter.sd">
                                        </div>
                                        <div class="form-group">
                                            <label>R²</label>
                                            <input class="form-control input-sm" disabled type="number" [(ngModel)]="selectedLocusParameter.r_squared">
                                        </div>
                                    </div>
                                </div>
                                <button class="btn btn-default" (click)="saveLocusParams(selectedLocusParameter)" [ngClass]="{disabled: isSubmitting}">Save and Analyze</button>
                            </form>
                            <br>
                            <div>
                                <pm-progress-bar *ngIf="isSubmitting" [fullLabel]="'Saving and Analyzing Locus... This May Take A While'"></pm-progress-bar>
                            </div>
                        </div>
                    </div>
                </div>
                <div *ngIf="selectedLocusAnnotations" class="row">
                    <div class="panel panel-default">
                        <div class="panel-heading">
                            <div class="h3 panel-title">
                                Annotations Filters
                            </div>
                        </div>
                        <div class="panel-body">
                            <form>
                                <div class="col-sm-6">
                                    <div class="form-group">
                                        <input type="checkbox" (change)="filters.offscale=false" [(ngModel)]="filters.failures"> Failures Only
                                    </div>
                                    <div class="form-group">
                                        <input type="checkbox" (change)="filters.failures=false" [(ngModel)]="filters.offscale"> Offscale Only
                                    </div>
                                    <div class="form-group">
                                        <input type="checkbox" (change)="filters.out_of_bin=false" [(ngModel)]="filters.out_of_bin"> Out Of Bin Peaks
                                    </div>
                                    <div class="form-group">
                                        <label>Crosstalk Limit</label>
                                        <input class="form-control" type="number" step="any" min=0 [(ngModel)]="filters.crosstalk" [disabled]="filters.failures || filters.offscale || filters.out_of_bin">
                                    </div>
                                    <div class="form-group">
                                        <label>Bleedthrough Limit</label>
                                        <input class="form-control" type="number" step="any" min=0 [(ngModel)]="filters.bleedthrough" [disabled]="filters.failures || filters.offscale || filters.out_of_bin">
                                    </div>
                                </div>
                                <div class="col-sm-6">
                                    <div class="form-group">
                                        <label>Min Allele Count</label>
                                        <input class="form-control" type="number" [(ngModel)]="filters.min_allele_count" [disabled]="filters.failures || filters.offscale">
                                    </div>
                                    <div class="form-group">
                                        <label>Max Allele Count</label>
                                        <input class="form-control" type="number" [(ngModel)]="filters.max_allele_count" [disabled]="filters.failures || filters.offscale">
                                    </div>
                                    <div class="form-group">
                                        <label>Min Main Peak Height</label>
                                        <input class="form-control" type="number" [(ngModel)]="filters.main_min_peak_height" [disabled]="filters.failures || filters.offscale">    
                                    </div>
                                    <div class="form-group">
                                        <label>Max Main Peak Height</label>
                                        <input class="form-control" type="number" [(ngModel)]="filters.main_max_peak_height" [disabled]="filters.failures || filters.offscale">
                                    </div>
                                </div>
                                <button class="btn btn-default" (click)="filterLocusAnnotations()">Filter Annotations</button>
                                <button class="btn btn-default" (click)="clearFilter()">Clear Filter</button>
                                <button class="btn btn-default" (click)="saveAnnotations()">Save Annotations</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-sm-8">
                <div *ngIf="loadingLocusAnnotations">
                    <pm-progress-bar [fullLabel]="'Loading Samples'"></pm-progress-bar>
                </div>
                <div *ngIf="selectedLocusParameter && selectedLocusAnnotation && selectedSampleChannelAnnotations">
                    <div class="row">
                        <div class="col-sm-12">
                            <div class="panel panel-default">
                                <div class="panel-heading">
                                    <h3 *ngIf="selectedLocusAnnotation" class="panel-title">{{selectedProject.sample_annotations.get(selectedLocusAnnotation.sample_annotations_id).sample.barcode}}</h3>
                                </div>
                                <div *ngIf="selectedSampleChannelAnnotations" class="panel-body">
                                    <div id="channel_plot" style="height: 30vh">
                                        <div *ngFor="let channelAnnotation of selectedSampleChannelAnnotations">
                                            <pm-d3-sample-annotation-editor [channelAnnotation]="channelAnnotation" [locusAnnotation]="selectedLocusAnnotation" [bins]="selectedBins"></pm-d3-sample-annotation-editor>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div *ngIf="filteredLocusAnnotations" class="row">
                        <div class="col-sm-12">
                            <div class="panel panel-default">
                                <div class="panel-heading">
                                    <div class="h3 panel-title">
                                        <span>Filtered Annotations</span> <span *ngIf="filteredLocusAnnotations.length > 0"> | {{filteredLocusAnnotations.length}} Results </span> <span *ngIf="filteredLocusAnnotations.length > 0" class='pull-right'> {{filteredLocusAnnotationIndex + 1}} / {{filteredLocusAnnotations.length}} </span>
                                    </div>
                                </div>
                                <div class="panel-body">
                                    <div *ngIf="loadingAnnotations">
                                        <pm-progress-bar [label]="'Annotations'"></pm-progress-bar>
                                    </div>
                                    <div *ngIf="!loadingAnnotations" class="table-responsive" style="overflow: auto; height: 45vh">
                                        <table class="table table-striped table-hover table-condensed">
                                            <thead>
                                                <tr>
                                                    <th>Barcode</th>
                                                    <th># Alleles</th>
                                                    <th># Peaks</th>
                                                    <th>Offscale</th>
                                                    <th>Failure</th>
                                                    <th>Manual</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr [ngClass]="{success: annotation.id==selectedLocusAnnotation?.id, warning: annotation.isDirty}" *ngFor="let annotation of filteredLocusAnnotations; let i = index" (click)="filteredLocusAnnotationIndex = i; selectLocusAnnotation()">
                                                    <td>{{selectedProject.sample_annotations.get(annotation.sample_annotations_id).sample.barcode}}</td>
                                                    <td>{{countOf(annotation.alleles, true)}}</td>
                                                    <td>{{annotation.annotated_peaks?.length}}</td>
                                                    <td><span class="glyphicon glyphicon-ok" *ngIf="annotation.flags?.offscale"></span></td>
                                                    <td><span class="glyphicon glyphicon-ok" *ngIf="annotation.flags?.failure"></span></td>
                                                    <td><span class="glyphicon glyphicon-ok" *ngIf="annotation.flags?.manual_curation"></span></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    directives: [SectionHeaderComponent, LocusParametersListComponent, CommonLocusParametersDetailComponent, LocusParametersDetailComponent, D3SampleAnnotationEditor, ProgressBarComponent]
})
export class QuantificationBiasEstimatorProjectLocusListComponent {
    private selectedProject: QuantificationBiasEstimatorProject;
    private locusParameters: QuantificationBiasEstimatorLocusParameters[] = [];
    private selectedLocus: Locus;
    private selectedLocusParameter: QuantificationBiasEstimatorLocusParameters;
    private selectedLocusAnnotations: SampleLocusAnnotation[];
    private selectedBinEstimator: BinEstimatorProject;
    private selectedBins: Map<number, Bin>;
    private isSubmitting: boolean = false;
    private selectingLocus: boolean = false;

    private failureRate: number;

    private locusParamsCollapsed: boolean = false;
    private selectedLocusAnnotation: SampleLocusAnnotation;
    private filteredLocusAnnotations: SampleLocusAnnotation[] = [];
    private filteredLocusAnnotationIndex = 0;

    private channelAnnotations: Map<number, ChannelAnnotation[]>;
    private selectedSampleChannelAnnotations: ChannelAnnotation[];

    private filters: AnnotationFilter;


    private loadingAnnotations = false;
    private loadingLocusAnnotations = false;

    private navItems;
    private header;

    constructor(
        private _qbeProjectService: QuantificationBiasEstimatorProjectService,
        private _binEstimatorProjectService: BinEstimatorProjectService,
        private _locusService: LocusService,
        private _routeParams: RouteParams,
        private _router: Router
    ){}

     private getBinEstimator = (proj: QuantificationBiasEstimatorProject) => {
        return this._binEstimatorProjectService.getBinEstimatorProject(proj.bin_estimator_id);
    }
    
    private countOf(object: Object, status) {
        let count = 0;
        for(let k in object) {
            if(object[k] == status) {
                count++;
            }
        }
        return count
    }

    getProject() {
        let id = +this._routeParams.get('project_id');
        this._qbeProjectService.getProject(id)
            .map(project => {
                this.selectedProject = project;
                this.loadLocusParameters();
                this.header = this.selectedProject.title + " Loci"
                this.navItems = [
                    {
                        label: 'Details',
                        click: () => this.goToLink('QuantificationBiasEstimatorProjectDetail', {project_id: this.selectedProject.id}),
                        active: false
                    },
                    {
                        label: 'Samples',
                        click: () => this.goToLink('QuantificationBiasEstimatorProjectSampleList', {project_id: this.selectedProject.id}),
                        active: false
                    },
                    {
                        label: 'Loci',
                        click: () => this.goToLink('QuantificationBiasEstimatorProjectLocusList', {project_id: this.selectedProject.id}),
                        active: true
                    }
                ]
                return project;
            })
            .concatMap(this.getBinEstimator)
            .subscribe(
                binEstimator => {
                    this.selectedBinEstimator = <BinEstimatorProject> binEstimator;
                },
                err => toastr.error(err)
            )
    }

    private loadLocusParameters() {
        this.locusParameters = [];
        this.selectedProject.locus_parameters.forEach((locus_param, id) => {
            this.locusParameters.push(locus_param);
        });
    }

    private goToLink(dest: String, params: Object) {
      let link = [dest, params];
      this._router.navigate(link);
    }
    
    private getFailureRate(locusAnnotations: SampleLocusAnnotation[]) {
        this.failureRate = 1
        locusAnnotations.forEach(locusAnnotation => {
            if(locusAnnotation.flags && !locusAnnotation.flags['failure']) {
                this.failureRate -= 1 / locusAnnotations.length;
            }
        })            
    }

    private getLocusAnnotations(){
        return this._qbeProjectService.getLocusAnnotations(this.selectedProject.id, this.selectedLocus.id)
            .map(
                locusAnnotations => {  
                    this.selectedLocusAnnotations = locusAnnotations;
                    this.getFailureRate(locusAnnotations);
                    this.selectedLocusAnnotation = locusAnnotations[0];    
                })
    }

    private filterLocusAnnotations() {
        this.filteredLocusAnnotations = [];
        this.filteredLocusAnnotationIndex = 0
        this.selectedLocusAnnotation = null;
        this.selectedLocusAnnotations.forEach(locusAnnotation => {
            if(this.filters.failures) {
                if(locusAnnotation.flags['failure']) {
                    this.filteredLocusAnnotations.push(locusAnnotation);
                }
            } else if(this.filters.offscale) {
                if(locusAnnotation.flags['offscale']) {
                    this.filteredLocusAnnotations.push(locusAnnotation);
                }
            } else if(this.filters.out_of_bin) {
              for (var peak_idx = 0; peak_idx < locusAnnotation.annotated_peaks.length; peak_idx++) {
                  var peak = locusAnnotation.annotated_peaks[peak_idx];
                //   if(!peak['in_bin'] && peak['bin'] && locusAnnotation.alleles[+peak['bin_id']]) {
                    if(!peak['in_bin']) {
                      this.filteredLocusAnnotations.push(locusAnnotation);
                      break;
                  }
              }  
            } else {
                let main_peak = null;
                locusAnnotation.annotated_peaks.forEach(peak => {
                    if(main_peak) {
                        if(peak['peak_height'] > main_peak['peak_height']) {
                            main_peak = peak;
                        }
                    } else {
                        main_peak = peak;
                    }
                })
                
                for (var index = 0; index < locusAnnotation.annotated_peaks.length; index++) {
                    var peak = locusAnnotation.annotated_peaks[index];
                    if(peak['bleedthrough_ratio'] > this.filters.bleedthrough &&
                       peak['crosstalk_ratio'] > this.filters.crosstalk &&
                       this.filters.main_min_peak_height < main_peak['peak_height'] &&
                       main_peak['peak_height'] < this.filters.main_max_peak_height &&
                       this.countOf(locusAnnotation.alleles, true) >= this.filters.min_allele_count &&
                       this.countOf(locusAnnotation.alleles, true) <= this.filters.max_allele_count) {
                           this.filteredLocusAnnotations.push(locusAnnotation);
                           break;
                       } 
                }
            }
        })
        this.selectLocusAnnotation()
    }
    
    private clearFilter() {
        this.filters = {
            failures: false,
            offscale: false,
            out_of_bin: false,
            min_allele_count: 0,
            max_allele_count: this.selectedBinEstimator.locus_bin_sets.get(this.selectedLocus.id).bins.size,
            bleedthrough: 0,
            crosstalk: 0,
            main_min_peak_height: 0,
            main_max_peak_height: 40000
        }
        this.filteredLocusAnnotations = [];
        this.selectedLocusAnnotations.forEach(annotation => {
            if(annotation.reference_channel_id){
                this.filteredLocusAnnotations.push(annotation);
            }
        })
    }

    private selectLocusAnnotation() {
        if (this.filteredLocusAnnotations.length > this.filteredLocusAnnotationIndex){
            this.selectedLocusAnnotation = this.filteredLocusAnnotations[this.filteredLocusAnnotationIndex];
            let sample_id = this.selectedProject.sample_annotations.get(this.selectedLocusAnnotation.sample_annotations_id).sample.id;
            this.selectedSampleChannelAnnotations = this.channelAnnotations.get(sample_id)    
        } else if(this.filteredLocusAnnotations.length > 0) {
            this.filteredLocusAnnotationIndex = 0;
            this.selectedLocusAnnotation = this.filteredLocusAnnotations[this.filteredLocusAnnotationIndex];
            let sample_id = this.selectedProject.sample_annotations.get(this.selectedLocusAnnotation.sample_annotations_id).sample.id;
            this.selectedSampleChannelAnnotations = this.channelAnnotations.get(sample_id)
        } else {
            this.filteredLocusAnnotationIndex = 0;
            this.selectedLocusAnnotation = null;
        }
    }
    
    private eventHandler(event: KeyboardEvent) {
        if(this.filteredLocusAnnotations) {         
            if(event.keyCode == 38) {
                if(this.filteredLocusAnnotationIndex > 0) {
                    this.filteredLocusAnnotationIndex--;
                    this.selectLocusAnnotation();
                    event.preventDefault()
                }
            } else if(event.keyCode == 40) {
                if(this.filteredLocusAnnotationIndex < this.filteredLocusAnnotations.length - 1) {
                    this.filteredLocusAnnotationIndex++;
                    this.selectLocusAnnotation();
                    event.preventDefault()
                }
            }
        } 
    }

    private selectLocus(locus_id: number) {
        if(!this.isSubmitting && !this.selectingLocus){
            console.log(locus_id);
            this.selectedLocus = null;
            this.failureRate = null;
            this.selectedLocusParameter = null;
            this.filteredLocusAnnotations = [];
            this.selectedLocusAnnotations = null;
            this.selectedLocusAnnotation = null;
            this.selectedSampleChannelAnnotations = [];
            this.filteredLocusAnnotationIndex = 0;
            this.channelAnnotations = null;
            if(locus_id != -1) {
                this.selectingLocus = true
                this.channelAnnotations = new Map<number, ChannelAnnotation[]>();
                this.loadingAnnotations = true;
                this._locusService.getLocus(locus_id)
                .subscribe(locus => {
                    this.selectedLocus = locus;
                    this.selectedLocusParameter = this.selectedProject.locus_parameters.get(locus_id);
                    if(this.selectedBinEstimator.locus_bin_sets.has(this.selectedLocus.id)) {
                        this.selectedBins = this.selectedBinEstimator.locus_bin_sets.get(this.selectedLocus.id).bins;
                    };
                    this.loadingLocusAnnotations = true;
                    this.getLocusAnnotations().subscribe(
                        () => {
                            this.loadingLocusAnnotations = false
                            this.clearFilter();
                        }
                    );
                    this._qbeProjectService.getLocusChannelAnnotations(this.selectedProject.id, locus_id).subscribe(
                        channelAnnotations => {
                            channelAnnotations.forEach(channelAnnotation => {
                                if(this.channelAnnotations.has(channelAnnotation.sample_id)) {
                                    this.channelAnnotations.get(channelAnnotation.sample_id).push(channelAnnotation)
                                } else {
                                    this.channelAnnotations.set(channelAnnotation.sample_id, [channelAnnotation]);
                                }
                                this.selectLocusAnnotation();
                            });
                            this.loadingAnnotations = false;
                        },
                        err => {
                            toastr.error(err);
                        },
                        () => {
                            this.selectingLocus = false;
                        }
                    )
                }),
                err => {
                    toastr.error(err);
                }
            } else {
                let lp = new QuantificationBiasEstimatorLocusParameters();
                // lp.locus_id = -1;
                lp.initialize();
                this.selectedLocusParameter = lp;
            }
            
        }
        
    }

    private locusParamsSaved() {
        this.locusParameters = [];
        this.selectedProject.locus_parameters.forEach((locusParam, id) => {
            this.locusParameters.push(locusParam);
        })
    }
    
    private saveLocusParams(locusParameter) {
        if(!this.isSubmitting) {
            this.isSubmitting = true;
            // let locusParameter = this.selectedProject.locus_parameters.get(id);
            if(locusParameter.id) {
                this._qbeProjectService.saveLocusParameters(locusParameter).subscribe(
                    (locusParam: QuantificationBiasEstimatorLocusParameters) => {
                        this._qbeProjectService.clearCache(locusParam.project_id);
                        this._qbeProjectService.getProject(locusParam.project_id)
                            .subscribe(
                                proj => {
                                    this.selectedProject = proj;
                                    this.loadLocusParameters();
                                    this.selectedLocusParameter = locusParam;
                                    this.selectLocus(locusParam.locus_id);
                                }
                            )
                    },
                    (err) => {
                        toastr.error(err)
                    },
                    () => {
                        this.isSubmitting = false;
                    }
                )
            } else {
                this._qbeProjectService.batchApplyLocusParameters(locusParameter, this.selectedProject.id).subscribe(
                    () => {
                        this._qbeProjectService.clearCache(this.selectedProject.id);
                        this._qbeProjectService.getProject(this.selectedProject.id)
                            .subscribe(
                                proj => {
                                    this.selectedProject = proj;
                                    this.loadLocusParameters();
                                }
                            )
                    },
                    err => {
                        toastr.error(err);
                    },
                    () => {
                        this.isSubmitting = false;
                    }
                )
            }
        }
        
    }

    onChanged(e) {
        this.selectedLocusParameter.isDirty = true
    }
  
    ngOnInit() {
        this.getProject();
    }

}