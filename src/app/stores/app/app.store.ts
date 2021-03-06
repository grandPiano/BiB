import { provideStore } from '@ngrx/store';
import * as _ from 'lodash';
// libs
import { Observable } from 'rxjs/Observable';
// import { combineLatest } from 'rxjs/observable/combineLatest';
import { ActionReducer } from '@ngrx/store';
import '@ngrx/core/add/operator/select';

/**
 * Every reducer module's default export is the reducer function itself. In
 * addition, each module should export a type or interface that describes
 * the state of the reducer plus any selector functions. The `* as`
 * notation packages up all of the exports into a single object.
 */
import { appReducer, i18nReducer,
         sessionReducer, statsReducer,
         aclReducer, routeReducer,
         mediaReducer } from 'app/reducers';

/**
 * The compose function is one of our most handy tools. In basic terms, you give
 * it any number of functions and it returns a function. This new function
 * takes a value and chains it through every composed function, returning
 * the output.
 *
 * More: https://drboolean.gitbooks.io/mostly-adequate-guide/content/ch5.html
 */
import { compose } from '@ngrx/core/compose';

/**
 * storeFreeze prevents state from being mutated. When mutation occurs, an
 * exception will be thrown. This is useful during development mode to
 * ensure that none of the reducers accidentally mutates the state.
 */
import { storeFreeze } from 'ngrx-store-freeze';

/**
 * combineReducers is another useful metareducer that takes a map of reducer
 * functions and creates a new reducer that stores the gathers the values
 * of each reducer and stores them using the reducer's key. Think of it
 * almost like a database, where every reducer is a table in the db.
 *
 * More: https://egghead.io/lessons/javascript-redux-implementing-combinereducers-from-scratch
 */
import { combineReducers } from '@ngrx/store';

import * as fromBiB from 'app';

import { IRouteState, IMediaState } from 'app/states';

/**
 * As mentioned, we treat each reducer like a table in a database. This means
 * our top level state interface is just a map of keys to inner state types.
 */
import { IAppState } from 'app/interfaces';
/**
 * Because metareducers take a reducer function and return a new reducer,
 * we can use our compose helper to chain them together. Here we are
 * using combineReducers to make our top level reducer, and then
 * wrapping that in storeLogger. Remember that compose applies
 * the result from right to left.
 */
const reducers = {
  app: appReducer,
  i18n: i18nReducer,
  session: sessionReducer,
  stats: statsReducer,
  acl: aclReducer,
  route: routeReducer,
  media: mediaReducer
};

const developmentReducer: ActionReducer<IAppState> = compose(storeFreeze, combineReducers)(reducers);
const productionReducer: ActionReducer<IAppState> = combineReducers(reducers);

export function AppReducer(state: any, action: any) {
  if (String('<%= BUILD_TYPE %>') === 'dev') {
    return developmentReducer(state, action);
  } else {
    return productionReducer(state, action);
  }
}

/**
 * These are helper methods for state extraction
 */

export function getRouteState(state$: Observable<IAppState>): Observable<IRouteState> {
  return state$.select((s) => s.route);
}

export function getMediaState(state$: Observable<IAppState>): Observable<IMediaState> {
  return state$.select((s) => s.media);
}

export const extractRoute: (obs: Observable<IAppState>) => Observable<fromBiB.IRoute> = compose(fromBiB.getRoute, getRouteState);
export const extractMedia: (obs: Observable<IAppState>) => Observable<fromBiB.IMedium[]> = compose(fromBiB.getMedia, getMediaState);
