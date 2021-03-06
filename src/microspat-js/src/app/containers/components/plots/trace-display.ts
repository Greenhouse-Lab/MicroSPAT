import { Component, ChangeDetectionStrategy, OnChanges, SimpleChanges, Input, ElementRef, OnInit } from '@angular/core';
import { Trace, MspatSVGCanvas, MspatCanvasConfig, Legend } from './canvas';
import * as d3 from 'd3';

@Component({
  selector: 'mspat-trace-display',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div id="trace-container"></div>
  `,

  styles: [`
    #trace-container {
      height: 100%;
      width: 100%
    }
  `]
})
export class TraceDisplayComponent implements OnChanges, OnInit {
  @Input() traces: Trace[] = [];
  @Input() domain: [number, number] = [0, 400];
  @Input() range: [number, number];
  @Input() legend: Legend;
  @Input() active = false;

  private canvasConfig: MspatCanvasConfig;
  private canvas: MspatSVGCanvas;

  constructor(private _elementRef: ElementRef) {
  }

  render() {
    this.canvas.clear()

    if (!this.active || this.traces.length === 0) {
      return;
    }

    this.canvas.resize(this.domain, this.range);

    this.traces.forEach(trace => {
      this.canvas.addTrace(trace);
    });

    if (this.legend) {
      this.canvas.addLegend(this.legend);
    }
  }

  ngOnInit() {
    this.canvasConfig = {
      container: d3.select(this._elementRef.nativeElement).select('#trace-container'),
      backgroundColor: '#252830',
      colorMap: {
        'blue': '#00D5FF',
        'red': 'red',
        'green': 'green',
        'yellow': 'yellow'
      }
    };
    this.canvas = new MspatSVGCanvas(this.canvasConfig);
    this.render();
  }

  ngOnChanges(c: SimpleChanges) {
    setTimeout(() => {
      this.render();
    });
  }
}
