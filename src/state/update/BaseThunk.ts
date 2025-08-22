import { BaseThunkAction } from "./BaseThunkAction";
import { BaseDispatcher } from "./BaseDispatcher";

import {updateGlobalStore} from "../data/GlobalStore";

import type {BaseDynamicComponent} from "../../components/BaseDynamicComponent";


export class BaseThunk {
  thunkAction: BaseThunkAction;
  dispatchers: BaseDispatcher[];

  subscribedComponents:BaseDynamicComponent[];

  globalStateReducer?: (a: any) => Record<string, string>;

  requestStoreId?: string;
  thunkData:any = null

  activeRequest:boolean = false;

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

    /*
     TODO: Add logic to make sure there are no concurrent requests for the same data.

      If there is a use case for multiple components trying to concurrently retrieve the same API data, then logic
      should be implemented so that the later requests wait.

      For now an error is thrown since this is not a supported use case. Concurrent API calls are likely to lead
      to bugs that are hard to detect and will cause extra load on a data source.
     */
    if(this.activeRequest){
      throw new Error("Concurrent attempt to retrieve data in a thunk");
    }


    this.activeRequest = true;
    this.thunkAction.retrieveData(params, cacheKey).then((response: any) => {

      this.activeRequest = false;
      self.thunkData = response;

      //TODO: Make sure this reducer doesn't overwrite the thunk data.
      self.subscribedComponents.forEach((component:BaseDynamicComponent)=>{
        component.updateFromThunkState();
      })
    });
  }

  //This method should eventually replace subscribeComponent.
  subscribeComponentToData(component:BaseDynamicComponent){
    let oldDispatcherIndex = -1;
    let i = 0;

    this.subscribedComponents.forEach((subscribedComponent: BaseDynamicComponent) => {
      if(subscribedComponent === component) {
        oldDispatcherIndex = i;
      } else {
        i++;
      }
    });

    if (oldDispatcherIndex !== -1) {
      this.subscribedComponents = this.subscribedComponents.splice(oldDispatcherIndex, 1);
    }
    this.subscribedComponents.push(component);
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
      self.updateStore(response)
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
