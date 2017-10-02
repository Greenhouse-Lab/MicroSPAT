import { Injectable } from '@angular/core';

import { WebSocketBaseService } from '../base';
import { BinEstimatorProject } from '../../models/bin-estimator/project';
import { Store } from '@ngrx/store';
import * as fromRoot from 'app/reducers';

@Injectable()
export class BinEstimatorProjectService extends WebSocketBaseService<BinEstimatorProject> {

  constructor(
    private store: Store<fromRoot.State>
  ) {
    super('bin_estimator_project', store);
  }

}
