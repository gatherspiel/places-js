import { BaseThunkAction } from "./BaseThunkAction";
import type {BaseDynamicComponent} from "../../components/BaseDynamicComponent";

export class BaseThunk {
  thunkAction: BaseThunkAction;

  subscribedComponents:BaseDynamicComponent[];

  requestStoreId?: string;
  thunkData:any = null

  activeRequest:boolean = false;

  preloadEnabled:boolean = false;
  constructor(dataFetch: BaseThunkAction) {
    this.thunkAction = dataFetch;
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

  updateThunkState(thunkData:any){
    this.thunkData = thunkData;
    this.subscribedComponents.forEach((component:BaseDynamicComponent)=>{
      component.updateFromThunkState();
    })
  }

  /**
   * Retrieves data from API thunk.
   * @param params
   * @param subscribedThunk: Data thunk that will be subscribed to data updates from this thunk. This is an
   * optional parameter that is only supported for requests that re not preloads.
   */
  getData(params:any, subscribedThunk?:BaseThunk){

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

        if(subscribedThunk){
          subscribedThunk.updateThunkState(response);
        }

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


}
