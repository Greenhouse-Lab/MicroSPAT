// MicroSPAT is a collection of tools for the analysis of Capillary Electrophoresis Data
// Copyright (C) 2016  Maxwell Murphy

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { DatabaseItem } from '../../DatabaseItem';
import { PeakScanner } from '../../PeakScanner';

export class LocusParameters extends DatabaseItem implements PeakScanner {
    scanning_method: string;
    maxima_window: number;
    
    //relmax params
    argrelmax_window: number;
    trace_smoothing_window: number;
    trace_smoothing_order: number;
    tophat_factor: number;
    //cwt params
    cwt_min_width: number;
    cwt_max_width: number;
    min_snr: number;
    noise_perc: number;
    gap_threshold: number;
    
    locus_id: number;
    project_id: number;
    
    //peak filtering params
    min_peak_height: number;
    max_peak_height: number;
    min_peak_height_ratio: number;
    max_bleedthrough: number;
    max_crosstalk: number;
    min_peak_distance: number;
    
    scanning_parameters_stale: boolean;
    filter_parameters_stale: boolean;

    initialize() {
        this.scanning_method = 'relmax';
        this.maxima_window = 10;
        this.argrelmax_window = 6;
        this.trace_smoothing_window = 11;
        this.trace_smoothing_order = 7;
        this.tophat_factor = .005

        this.cwt_min_width = 4;
        this.cwt_max_width = 15;
        this.min_snr = 3;
        this.noise_perc = 13;
        this.gap_threshold = 2;

        this.min_peak_height = 0;
        this.max_peak_height = 40000;
        this.min_peak_height_ratio = 0;
        this.max_bleedthrough = 10;
        this.max_crosstalk = 10;
        this.min_peak_distance = 2;

    }
    
    fillFromJSON(obj) {
        this.isDirty = false;
        for(let p in obj) {
            this[p] = obj[p];
        }
    }
}