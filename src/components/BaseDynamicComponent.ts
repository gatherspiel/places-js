import type {BaseThunk} from "../state/update/BaseThunk";

import {getUrlParameter} from "../utils/UrlParamUtils";
import {freezeState} from "../utils/Immutable";
import {GlobalStateSubscription} from "./types/GlobalStateSubscription";

export abstract class BaseDynamicComponent extends HTMLElement {

  readonly componentId: string

  #globalStateLoaded: boolean = true;
  #globalStateSubscriptions: GlobalStateSubscription[];

  componentState: any = {};
  static instanceCount = 1;

  #subscribedThunks: BaseThunk[] = [];
  attachedEventsToShadowRoot:boolean = false;

  constructor(globalStateSubscriptions: GlobalStateSubscription[] = []) {
    super();

    this.#globalStateSubscriptions = globalStateSubscriptions;

    BaseDynamicComponent.instanceCount++;

    this.componentId = `${this.constructor.name}-${BaseDynamicComponent.instanceCount}`;

    const self = this;

    globalStateSubscriptions.forEach((subscription: GlobalStateSubscription) => {
      subscription.dataThunk.subscribeComponent(self)
      self.#subscribedThunks.push(subscription.dataThunk);

      let params: Record<string, string> = subscription.params ?? {}
      if (subscription.urlParams) {
        subscription.urlParams.forEach((name: any) => {
          params[name] = getUrlParameter(name);
        })
      }
      subscription.dataThunk.getData(params)
    });
  }

  disconnectedCallback(){
    const self = this;
    self.#subscribedThunks.forEach((thunk:BaseThunk)=>{
      thunk.unsubscribeComponent(self)
    });
  }


  updateData(data: any) {

    if (!data) {
      data = this.componentState
    }


    this.componentState = {...this.componentState,...freezeState(data)};
    this.generateAndSaveHTML(this.componentState);

    if(this.shadowRoot){
      if(this.attachEventHandlersToDom){
        this.attachEventHandlersToDom(this.shadowRoot);
      }
      if(this.attachEventsToShadowRoot && !this.attachedEventsToShadowRoot){
        this.attachEventsToShadowRoot(this.shadowRoot);
        this.attachedEventsToShadowRoot = true;
      }
    }
 }

  attachEventHandlersToDom?(shadowRoot?:any):any

  /*
    Override this method to attach events to the component shadow root.
   */
  attachEventsToShadowRoot?(shadowRoot:any):any

  getComponentStore(){
    return this.componentState;
  }

  // @ts-ignore
  generateAndSaveHTML(data: any) {
    this.innerHTML = this.render(data);
  }

  updateFromGlobalState() {
    let dataLoaded = true;
    this.#globalStateSubscriptions.forEach((item:GlobalStateSubscription)=> {
      if(!item.dataThunk.hasThunkData()){
        dataLoaded = false;
      }
    });

    if(dataLoaded){
      this.#globalStateLoaded = true;
    }

    const self = this;
    if(this.#globalStateLoaded){

      let dataToUpdate: any = {}
      this.#globalStateSubscriptions?.forEach((item:GlobalStateSubscription)=> {

        let thunkData = item.dataThunk.getThunkData();
        if(item.componentReducer){
          thunkData = item.componentReducer(thunkData);
        }

        if(item.fieldName) {
          dataToUpdate[item.fieldName] = thunkData;
        } else {
          dataToUpdate = thunkData;
          if(self.#globalStateSubscriptions?.length > 1){
            throw new Error(`Component ${this.constructor.name} has multiple data thunks. 
              Each one must have a specified field name`)
          }
        }
      })

      this.updateData(
        dataToUpdate,
      );
    }
  }

  abstract render(data: any): string;
}
