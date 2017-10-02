import { Injectable } from '@angular/core';

import { WebSocketBaseService } from '../base';
import { ControlSampleAssociation } from '../../models/sample/control-sample-association';
import { Store } from '@ngrx/store';
import * as fromRoot from 'app/reducers';

@Injectable()
export class ControlSampleAssociationService extends WebSocketBaseService<ControlSampleAssociation> {

  constructor(
    private store: Store<fromRoot.State>
  ) {
    super('control_sample_association', store);
  }

}
