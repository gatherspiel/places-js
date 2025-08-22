import type {BaseThunk} from "../../state/update/BaseThunk";

export const REQUEST_THUNK_REDUCERS_KEY  = "requestThunkReducers"
export const GLOBAL_STATE_LOAD_CONFIG_KEY = "globalStateLoadConfig"
export const GLOBAL_FIELD_SUBSCRIPTIONS_KEY = "globalFieldSubscriptions"
export const DEFAULT_GLOBAL_STATE_REDUCER_KEY = "defaultGlobalStateReducer"
export const DATA_FIELDS = "dataFields";

export type RequestThunkReducerConfig = {
  thunk: BaseThunk
  componentReducer?: (a: any) => any;
  globalStoreReducer?: (a: any) => any;
  reducerField?: string;
};


export type DataThunkItem = {
  dataThunk: BaseThunk;
  fieldName?: string
  params?: any;
  urlParams?:any;
  componentReducer?:(a:any)=>any;
}
/**
 * Global state that the component depends on. The component will not be rendered until the global state
 * is ready.
 */
export type GlobalStateLoadConfig = {
  [GLOBAL_FIELD_SUBSCRIPTIONS_KEY]?: string[];
  [DEFAULT_GLOBAL_STATE_REDUCER_KEY]?: (updates: any) => any; //Default reducer from global state if there is no dependent API request.
  dataThunks?:DataThunkItem[]
};

export type DataFieldConfig = {
  fieldName: string,
  dataSource: BaseThunk,
  urlParams?:string[],
  preloadSource?: BaseThunk
}

export type ComponentLoadConfig = {
  [REQUEST_THUNK_REDUCERS_KEY]?: RequestThunkReducerConfig[];
  [GLOBAL_STATE_LOAD_CONFIG_KEY]?: GlobalStateLoadConfig;
  [DATA_FIELDS]?: DataFieldConfig[]
};


export const validComponentLoadConfigFields = [
  REQUEST_THUNK_REDUCERS_KEY,
  GLOBAL_STATE_LOAD_CONFIG_KEY,
  DATA_FIELDS
];
