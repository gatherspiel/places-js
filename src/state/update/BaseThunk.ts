import { BaseThunkAction } from "./BaseThunkAction";
import { BaseDispatcher } from "./BaseDispatcher";

import {updateGlobalStore} from "../data/GlobalStore";

import type {BaseDynamicComponent} from "../../components/BaseDynamicComponent";

type ComponentSubscription = {
  component: BaseDynamicComponent,
  reducer?: (a:any)=>any
}

export class BaseThunk {
  thunkAction: BaseThunkAction;
  dispatchers: BaseDispatcher[];

  subscribedComponents:ComponentSubscription[];

  globalStateReducer?: (a: any) => Record<string, string>;

  requestStoreId?: string;

  thunkData:any = null

  constructor(dataFetch: BaseThunkAction, dispatchers?: BaseDispatcher[]) {
    this.thunkAction = dataFetch;
    this.dispatchers = dispatchers ?? [];
    this.subscribedComponents = [];
  }

  createRequestStore(storeId:string){
    this.requestStoreId = storeId;
    if(!sessionStorage.getItem(this.requestStoreId)){
      sessionStorage.setItem(this.requestStoreId, JSON.stringify({}))
    }
  }

  getThunkData():any {
    return this.thunkData;
  }

  hasThunkData():boolean {
    return this.thunkData !== null;
  }

  //This method should eventually replace retrieveData.
  getData(params:any){

    var self = this;
    let cacheKey = this.requestStoreId ?? '';
    this.thunkAction.retrieveData(params, cacheKey).then((response: any) => {
      self.updateStore(response);
    });
  }


  //This method should eventually replace subscribeComponent.
  subscribeComponentToData(component:BaseDynamicComponent, reducerFunction?:(a:any)=>any){
    let oldDispatcherIndex = -1;
    let i = 0;

    this.subscribedComponents.forEach((subscription: ComponentSubscription) => {
      if(subscription.component === component) {
        oldDispatcherIndex = i;
      } else {
        i++;
      }
    });

    if (oldDispatcherIndex !== -1) {
      this.subscribedComponents = this.subscribedComponents.splice(oldDispatcherIndex, 1);
    }
    this.subscribedComponents.push({
      component: component,
      reducer: reducerFunction
    });
  }

  //TODO: Handle preload attempts.
  //TODO: Handle cases where there are concurrent calls
  retrieveData(params: any,updateFunction?: (a?: any) => any) {

    let cacheKey = this.requestStoreId ?? '';

    if(updateFunction) {
      params = updateFunction(params)
    }

    var self = this;
    this.thunkAction.retrieveData(params, cacheKey).then((response: any) => {
      self.thunkData = response;

      self.subscribedComponents.forEach((subscription:ComponentSubscription)=>{

        let componentData = response;
        //TOOD: Make sure this reducer doesn't overwrite the thunk data.
        if(subscription.reducer){
          componentData = subscription.reducer(response);
        }
        subscription.component.updateFromThunkState(componentData);
      })
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
