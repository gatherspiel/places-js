import { BaseThunkAction } from "./BaseThunkAction";
import { BaseDispatcher } from "./BaseDispatcher";

import {updateGlobalStore} from "../data/GlobalStore";

import type {BaseDynamicComponent} from "../../components/BaseDynamicComponent";
import {PageState} from "../../spa/PageState";


export class BaseThunk {
  thunkAction: BaseThunkAction;
  dispatchers: BaseDispatcher[];

  subscribedComponents:BaseDynamicComponent[];

  globalStateReducer?: (a: any) => Record<string, string>;

  requestStoreId?: string;
  thunkData:any = null

  activeRequest:boolean = false;

  preloadEnabled:boolean = false;
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

  enablePreload(){
    this.preloadEnabled = true;
  }

  getThunkData():any {
    return this.thunkData;
  }

  hasThunkData():boolean {
    return this.thunkData !== null;
  }

  //This method should eventually replace retrieveData.
  getData(params:any){

    const self = this;
    let cacheKey = this.requestStoreId ?? '';

    //@ts-ignore
    if(this.preloadEnabled && (BaseThunk.finishedPreload !== "finished")) {
      let promise = new Promise(resolve=>{
        const id = setInterval(()=>{

          // @ts-ignore
          if(window.preloadData) {
            clearInterval(id);
            // @ts-ignore
            resolve(window.preloadData)
          }
        },10)
      });
      promise.then((response:any)=>{

        //@ts-ignore
        BaseThunk.finishedPreload = "finished";
        self.activeRequest = false;
        self.thunkData = response;

        //TODO: Make sure this reducer doesn't overwrite the thunk data.
        self.subscribedComponents.forEach((component:BaseDynamicComponent)=>{
          component.updateFromThunkState();
        })
      })
    }
    // Do not make a data request if there is an active one in progress. It will push data to subscribed components.
    else if(!this.activeRequest) {
      this.activeRequest = true;
      this.thunkAction.retrieveData(params, cacheKey).then((response: any) => {

        self.activeRequest = false;
        self.thunkData = response;

        //TODO: Make sure this reducer doesn't overwrite the thunk data.
        self.subscribedComponents.forEach((component:BaseDynamicComponent)=>{
          component.updateFromThunkState();
        })
      });

    }

  }

  unsubscribeComponent(component:BaseDynamicComponent){
    const idx = this.subscribedComponents.indexOf(component);
    if(idx === -1){
      console.warn(`Attempt to unsubscribe ${component.componentId} from thunk it is not subscribed to`)
      return;
    }
    this.subscribedComponents.splice(idx, 1);
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
