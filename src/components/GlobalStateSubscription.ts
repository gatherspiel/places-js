import type {DataStore} from "../state/update/DataStore";

export type GlobalStateSubscription = {
  dataStore: DataStore;
  fieldName?: string
  params?: any;
  urlParams?:any;
  componentReducer?:(a:any)=>any;
}
