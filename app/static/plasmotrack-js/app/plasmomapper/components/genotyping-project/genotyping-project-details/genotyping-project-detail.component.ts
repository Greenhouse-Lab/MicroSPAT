import { Component, OnInit } from '@angular/core';
import { RouteParams, Router } from '@angular/router-deprecated';

import { SectionHeaderComponent } from '../../layout/section-header.component'

import { GenotypingProject } from '../../../services/genotyping-project/genotyping-project.model';
import { GenotypingProjectService } from '../../../services/genotyping-project/genotyping-project.service';

@Component({
    selector: 'pm-genotyping-project-detail',
    template: `
    <div *ngIf="selectedProject">
        <pm-section-header [header]="navHeader" [navItems]="navItems"></pm-section-header>
        <div class="row col-sm-6">
            <form (ngSubmit)="saveProject()">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" (keyup)="onChanged()" class="form-control" required
                        [(ngModel)] = "selectedProject.title">
                </div>
                <div class="form-group">
                    <label>Creator</label>
                    <input type="text" (keyup)="onChanged()" class="form-control"
                        [(ngModel)] = "selectedProject.creator">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" (keyup)="onChanged()" class="form-control"
                        [(ngModel)] = "selectedProject.description">
                </div>
                <button type="submit" class="btn btn-default" [ngClass]="{disabled: !selectedProject.isDirty}">Save</button>
                <button class="btn btn-warning" (click)="deleteProject()">Delete</button>
                <span class="label label-danger">{{saveProjectError}}</span>
                <span class="label label-danger">{{deleteProjectError}}</span>
            </form>
        </div>
    </div>
    `,
    styleUrls:['app/plasmomapper/styles/forms.css'],
    directives: [SectionHeaderComponent]
})

export class GenotypingProjectDetailComponent implements OnInit {
    private navItems;
    private navHeader: string;
    private saveProjectError: string;
    private deleteProjectError: string
    
    public selectedProject: GenotypingProject;
    
    constructor(
        private _genotypingProjectService: GenotypingProjectService,
        private _routeParams: RouteParams,
        private _router: Router
        ){
            console.log("Loading Project Details");
        }
    
    getProject() {
        this._genotypingProjectService.getProject(+this._routeParams.get('project_id'))
                .subscribe((project) => {
                    console.log(project);
                    
                    this.selectedProject = project;
                    this.navHeader = this.selectedProject.title + " Details";
                    this.navItems = [
                        {
                            label: 'Details',
                            click: () => this.goToLink('GenotypingProjectDetail', {project_id: this.selectedProject.id}),
                            active: true
                        },
                        {
                            label: 'Samples',
                            click: () => this.goToLink('GenotypingProjectSampleList', {project_id: this.selectedProject.id}),
                            active: false
                        },
                        {
                            label: 'Loci',
                            click: () => this.goToLink('GenotypingProjectLocusList', {project_id: this.selectedProject.id}),
                            active: false
                        }
                    ]
                })
    }
    
    private goToLink(dest: String, params?: Object) {
      let link = [dest, params];
      this._router.navigate(link);
    }
    
    saveProject() {
        this.saveProjectError = null;
        if(this.selectedProject.isDirty) {
            this._genotypingProjectService.updateProject(this.selectedProject).subscribe(
                (project) => {
                    this.selectedProject.copyFromObj(project);
                    console.log(project);
                },
                (error) => this.saveProjectError = error
            )
        }
    }
    
    deleteProject() {
        this.deleteProjectError = null;
        this._genotypingProjectService.deleteProject(this.selectedProject.id).subscribe(
            () => this.goToLink('GenotypingProjectList'),
            (err) => this.deleteProjectError = err
        )
    }
    
    onChanged(e) {
        console.log(this.selectedProject);
        
        this.selectedProject.isDirty = true;
    }
    
    ngOnInit() {
        this.getProject();
    }
}