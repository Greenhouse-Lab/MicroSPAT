import { Injectable } from '@angular/core';

import { WebSocketBaseService } from '../base';
import { Bin } from '../../models/bin-estimator/bin';
import { Store } from '@ngrx/store';
import * as fromRoot from 'app/reducers';

@Injectable()
export class BinService extends WebSocketBaseService<Bin> {

  constructor(
    private store: Store<fromRoot.State>
  ) {
    super('bin', store);
  }

}
