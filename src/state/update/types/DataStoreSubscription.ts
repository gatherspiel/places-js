import type {DataStore} from "../DataStore";

export type DataStoreSubscription = {
  componentReducer?:(a:any)=>any;
  dataStore: DataStore;
  fieldName?: string
}
