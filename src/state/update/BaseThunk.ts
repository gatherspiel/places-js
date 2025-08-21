import { BaseThunkAction } from "./BaseThunkAction";
import { BaseDispatcher } from "./BaseDispatcher";

import {updateGlobalStore} from "../data/GlobalStore";

import type {BaseDynamicComponent} from "../../components/BaseDynamicComponent";

export class BaseThunk {
  thunkAction: BaseThunkAction;
  dispatchers: BaseDispatcher[];

  globalStateReducer?: (a: any) => Record<string, string>;

  requestStoreId?: string;

  constructor(dataFetch: BaseThunkAction, dispatchers?: BaseDispatcher[]) {
    this.thunkAction = dataFetch;
    this.dispatchers = dispatchers ?? [];
  }

  createRequestStore(storeId:string){
    this.requestStoreId = storeId;
    if(!sessionStorage.getItem(this.requestStoreId)){
      sessionStorage.setItem(this.requestStoreId, JSON.stringify({}))
    }
  }


  retrieveData(params: any,updateFunction?: (a?: any) => any) {

    let cacheKey = this.requestStoreId ?? '';

    if(updateFunction) {
      params = updateFunction(params)
    }

    var self = this;
    this.thunkAction.retrieveData(params, cacheKey).then((response: any) => {
      self.updateStore(response);
    });

  }

  addGlobalStateReducer(
    reducer: (a: any) => Record<string, any>,
  ): BaseThunk {
    this.globalStateReducer = reducer;
    return this;
  }

  subscribeComponent(
    component: BaseDynamicComponent,
    reducerFunction: (a: any) => any,
    field?: string,
  ) {


    let oldDispatcherIndex = -1;
    let i = 0;

    this.dispatchers.forEach((dispatcher: BaseDispatcher) => {
      if(dispatcher.getComponent() === component) {
        oldDispatcherIndex = i;
      } else {
        i++;
      }
    });

    if (oldDispatcherIndex !== -1) {
      this.dispatchers = this.dispatchers.splice(oldDispatcherIndex, 1);
    }
    this.dispatchers.push(
      new BaseDispatcher(component, reducerFunction, field),
    );
  }

  updateStore(response: any) {

    if (this.globalStateReducer) {
      const updates: Record<string, string> = this.globalStateReducer(
        response,
      ) as Record<string, string>;
      updateGlobalStore(updates);
    }

    for (let dispatcher of this.dispatchers) {
      dispatcher.updateStore(response);
    }
  }
}
