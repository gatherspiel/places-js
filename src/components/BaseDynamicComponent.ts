import type {DataStore} from "../state/update/DataStore";

import {freezeState} from "../utils/Immutable";
import {GlobalStateSubscription} from "./types/GlobalStateSubscription";

export abstract class BaseDynamicComponent extends HTMLElement {

  readonly componentId: string

  #globalStateLoaded: boolean = true;
  #globalStateSubscriptions: GlobalStateSubscription[];

  componentState: any = {};
  static instanceCount = 1;

  #subscribedStores: DataStore[] = [];
  attachedEventsToShadowRoot:boolean = false;

  constructor(globalStateSubscriptions: GlobalStateSubscription[] = []) {
    super();

    this.#globalStateSubscriptions = globalStateSubscriptions;

    BaseDynamicComponent.instanceCount++;

    this.componentId = `${this.constructor.name}-${BaseDynamicComponent.instanceCount}`;

    const self = this;

    globalStateSubscriptions.forEach((subscription: GlobalStateSubscription) => {
      subscription.dataStore.subscribeComponent(self)
      self.#subscribedStores.push(subscription.dataStore);

      let params: Record<string, string> = subscription.params ?? {}
      if (subscription.urlParams) {
        subscription.urlParams.forEach((name: any) => {
          params[name] = (new URLSearchParams(document.location.search)).get(name) ?? "";
        })
      }
      subscription.dataStore.getData(params)
    });
  }

  disconnectedCallback(){
    const self = this;
    self.#subscribedStores.forEach((store:DataStore)=>{
      store.unsubscribeComponent(self)
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
    if (this.shadowRoot === null) {
      this.attachShadow({ mode: "open" });

      let templateStyle = this.getTemplateStyle();

      const template = document.createElement("template");
      template.innerHTML = templateStyle + `<div></div>`;
      this.shadowRoot!.appendChild(template.content.cloneNode(true));
    }

    const div = this.shadowRoot!.querySelector("div");
    if (div === null) {
      throw new Error(`Did not find div when creating template component`);
    }

    if(this.showLoadingHtml && !this.#globalStateLoaded) {
      div.innerHTML = this.showLoadingHtml();
    }
    else {
      div.innerHTML = this.render(data);
    }
  }

  /*
 - Returns CSS styles specific to the component. The string should be in the format <style> ${CSS styles} </style>
 */
  abstract getTemplateStyle(): string;

  showLoadingHtml?():string

  updateFromGlobalState() {

    let dataLoaded = true;
    this.#globalStateSubscriptions.forEach((item:GlobalStateSubscription)=> {
      if(!item.dataStore.hasStoreData()){
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

        let storeData = item.dataStore.getStoreData();
        if(item.componentReducer){
          storeData = item.componentReducer(storeData);
        }

        if(item.fieldName) {
          dataToUpdate[item.fieldName] = storeData;
        } else {
          dataToUpdate = storeData;
          if(self.#globalStateSubscriptions?.length > 1){
            throw new Error(`Component ${this.constructor.name} is subscribed to multiple data stores. 
              Each one must be associated with a specified field name`)
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
