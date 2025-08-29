import type {BaseThunk} from "../../state/update/BaseThunk";

export type GlobalStateSubscription = {
  dataThunk: BaseThunk;
  fieldName?: string
  params?: any;
  urlParams?:any;
  componentReducer?:(a:any)=>any;
}
