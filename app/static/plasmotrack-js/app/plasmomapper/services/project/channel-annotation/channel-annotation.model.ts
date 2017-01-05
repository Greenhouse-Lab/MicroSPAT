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
import { TimeStamped } from '../../TimeStamped';
import { Channel } from '../../channel/channel.model';

export class ChannelAnnotation extends DatabaseItem implements TimeStamped {
    last_updated: Date;
    channel: Channel;
    project_id: number;
    annotated_peaks: Object[];
    peak_indices: number[];
    locus_id: number;
    channel_id: number;
    sample_id: number;
    
    fillFromJSON(obj) {
        this.isDirty = false;
        for(let p in obj) {
            this[p] = obj[p];
        }
    }
}