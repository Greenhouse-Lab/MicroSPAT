import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';


@Component({
  selector: 'mspat-file-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-group">
      <input *ngIf="!multiple" type="file" (change)="fileChangeEvent.emit($event)" placeholder="placeholder" />
      <input *ngIf="multiple" type="file" (change)="fileChangeEvent.emit($event)" placeholder="placeholder" multiple />
    </div>
  `
})
export class FileInputComponent {
  @Input() placeholder: string;
  @Input() multiple = false;
  @Output() fileChangeEvent = new EventEmitter();

  constructor() { }

}
