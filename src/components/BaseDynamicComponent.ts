import type {BaseThunk} from "../state/update/BaseThunk";

import type {FormInputConfig} from "./types/FormInputConfig";
import  {FormSelector} from "../FormSelector";
import {getUrlParameter} from "../utils/UrlParamUtils";
import {freezeState} from "../utils/Immutable";
import {GlobalStateSubscription} from "./types/GlobalStateSubscription";

export abstract class BaseDynamicComponent extends HTMLElement {

  readonly componentId: string

  #dependenciesLoaded: boolean = true;
  #globalStateSubscriptions: GlobalStateSubscription[];
  #formSelector: FormSelector

  componentState: any = {};
  static instanceCount = 1;

  #subscribedThunks: BaseThunk[] = [];
  attachedEventsToShadowRoot:boolean = false;

  constructor(globalStateSubscriptions: GlobalStateSubscription[] = []) {
    super();

    this.#globalStateSubscriptions = globalStateSubscriptions;

    BaseDynamicComponent.instanceCount++;

    this.componentId = `${this.constructor.name}-${BaseDynamicComponent.instanceCount}`;
    this.#formSelector = new FormSelector();

    const self = this;

    globalStateSubscriptions.forEach((subscription: GlobalStateSubscription) => {
      subscription.dataThunk.subscribeComponentToData(self)
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


  updateData(data: any,
             updateFunction = (data:any)=>data) {

    if (!data) {
      data = this.componentState
    }

    const updatedData = updateFunction(data);
    if (!updatedData) {
      throw new Error(
        `Update function for  must return a JSON object`,
      );
    }

    this.componentState = {...this.componentState,...freezeState(updatedData)};
    this.generateAndSaveHTML(this.componentState, this.#dependenciesLoaded);

    if(this.shadowRoot){
      this.#formSelector.setShadowRoot(this.shadowRoot);
    }

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

  hasUserEditPermissions(){
    return this.componentState?.permissions?.userCanEdit;
  }

  // @ts-ignore
  generateAndSaveHTML(data: any, dependenciesLoaded:boolean) {
    this.#formSelector.clearFormSelectors();
    this.innerHTML = this.render(data);
  }

  addShortInput(formConfig:FormInputConfig){
    return this.#formSelector.generateInputFormSelector(formConfig, this);
  }

  addTextInput(formConfig:FormInputConfig){
    return this.#formSelector.generateTextInputFormItem(formConfig);
  }

  getFormValue(id:string){
    return this.#formSelector.getValue(id);
  }

  updateFromThunkState() {
    let dataLoaded = true;
    this.#globalStateSubscriptions.forEach((item:GlobalStateSubscription)=> {
      if(!item.dataThunk.hasThunkData()){
        dataLoaded = false;
      }
    });

    if(dataLoaded){
      this.#dependenciesLoaded = true;
    }

    const self = this;
    if(this.#dependenciesLoaded){

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
