import type {DataStore} from "../DataStore";

export type DataStoreSubscription = {
  dataStore: DataStore;
  fieldName?: string
  params?: any;
  urlParams?:any;
  componentReducer?:(a:any)=>any;
}
