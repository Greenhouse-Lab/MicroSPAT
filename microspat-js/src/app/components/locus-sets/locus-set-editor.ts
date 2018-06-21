import { Component, ChangeDetectionStrategy,
         OnChanges, Input, EventEmitter,
         Output, ViewChild, SimpleChanges, OnInit } from '@angular/core';
import {MatSort, MatTableDataSource} from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';

import { Task } from 'app/models/task';
import { Locus } from 'app/models/locus/locus';


@Component({
  selector: 'mspat-locus-set-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card>
      <mat-card-header>
        <h3>Create New Locus Set</h3>
      </mat-card-header>
      <mat-card-content>
        <mat-divider [inset]='true'></mat-divider>
        <div class="form-fields">
          <mat-form-field [floatLabel]="'always'">
            <mat-label>Locus Set Label</mat-label>
            <input type="text" matInput [(ngModel)]="locusSetLabel">
          </mat-form-field>
        </div>
        <div class="locus-table mat-elevation-z8">
          <table mat-table [dataSource]="dataSource" matSort>
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef>
                <mat-checkbox (change) = "$event ? masterToggle() : null"
                              [checked] = "selection.hasValue() && isAllSelected()"
                              [disabled] = "activeTasks.length > 0"
                              [indeterminate] = "selection.hasValue() && !isAllSelected()">
                </mat-checkbox>
              </th>
              <td mat-cell *matCellDef = "let row">
                <mat-checkbox (click) = "$event.stopPropagation()"
                              (change) = "$event ? selection.toggle(row) : null"
                              [disabled] = "activeTasks.length > 0"
                              [checked] = "selection.isSelected(row)">
                </mat-checkbox>
              </td>
            </ng-container>

            <ng-container matColumnDef="label">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Label </th>
              <td mat-cell *matCellDef="let element"> {{element.label}} </td>
            </ng-container>

            <ng-container matColumnDef="min_base_length">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Min. Base Size </th>
              <td mat-cell *matCellDef="let element"> {{element.min_base_length}} </td>
            </ng-container>

            <ng-container matColumnDef="max_base_length">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Max. Base Size </th>
              <td mat-cell *matCellDef="let element"> {{element.max_base_length}} </td>
            </ng-container>

            <ng-container matColumnDef="nucleotide_repeat_length">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Nucleotide Repeat Length </th>
              <td mat-cell *matCellDef="let element"> {{element.nucleotide_repeat_length}} </td>
            </ng-container>
            <ng-container matColumnDef="color">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Color </th>
              <td mat-cell *matCellDef="let element" [style.color]="element.color"> {{ element.color | titlecase }} </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
            <tr mat-row *matRowDef = "let row; columns: displayedColumns;">
            </tr>
          </table>
        </div>
        <mat-card-actions>
          <button mat-raised-button color="primary" [disabled]="activeTasks.length > 0" (click)="submitPressed()">SUBMIT</button>
        </mat-card-actions>
        <mat-card-footer>
          <mspat-task-progress-display *ngIf="activeLocusSetTask" [task]="activeLocusSetTask"></mspat-task-progress-display>
          <mspat-task-progress-display *ngIf="failedLocusSetTask" [task]="failedLocusSetTask"></mspat-task-progress-display>
        </mat-card-footer>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card {
      height: 95vh;
    }

    mat-card-header {
      height: 5%;
      margin: 0 0 .5em 0;
    }

    mat-card-content {
      height: 85%;
    }

    .form-fields {
      height: 7vh;
    }

    .locus-table {
      height: 85%;
      width: 100%;
      overflow: auto;
    }

    table.mat-table {
      height: 90%;
      width: 100%;
      overflow: auto
    }

  `]
})
export class LocusSetEditorComponent implements OnChanges, OnInit {

  private locusSetLabel: string;
  private selection: SelectionModel<Locus>;

  @ViewChild(MatSort) sort: MatSort;
  @Input() loci: Locus[];
  @Input() activeTasks: Task[] = [];
  @Input() activeLocusSetTasks: Task[] = [];
  @Input() failedLocusSetTasks: Task[] = [];
  @Output() submit: EventEmitter<{label: string; loci: number[]}> = new EventEmitter();

  private dataSource: MatTableDataSource<Locus>;
  public displayedColumns = ['select', 'label', 'min_base_length', 'max_base_length', 'nucleotide_repeat_length', 'color'];

  constructor() {
    const initialSelection = [];
    const allowMultiSelect = true;
    this.selection = new SelectionModel<Locus>(allowMultiSelect, initialSelection);
    this.dataSource = new MatTableDataSource(this.loci);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.loci) {
      this.dataSource.data = this.loci;
      console.log(this.dataSource);
    }
  }

  ngOnInit() {
    this.dataSource.sort = this.sort;
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected() ?
    this.selection.clear() :
    this.dataSource.data.forEach(row => this.selection.select(row));
  }

  submitPressed() {
    this.submit.emit({
      label: this.locusSetLabel,
      loci: this.selection.selected.map(l => +l.id)
    })
  }

  get activeLocusSetTask() {
    return this.activeLocusSetTasks.length > 0 ? this.activeLocusSetTasks[0] : false;
  }

  get failedLocusSetTask() {
    return this.failedLocusSetTasks.length > 0 ? this.failedLocusSetTasks[0] : false;
  }

}
