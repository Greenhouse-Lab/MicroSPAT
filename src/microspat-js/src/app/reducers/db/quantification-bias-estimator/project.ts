import { QuantificationBiasEstimatorProject } from '../../../models/quantification-bias-estimator/project';
import { generateReducer } from '../dbReducer';


export const MODEL = 'quantification_bias_estimator_project';

export interface State {
  ids: string[];
  pendingRequests: {[id: number]: string};
  entities: { [id: string]: QuantificationBiasEstimatorProject };
}

export const initialState: State = {
  ids: [],
  pendingRequests: {},
  entities: {}
};


export const reducer = generateReducer(MODEL, initialState);
