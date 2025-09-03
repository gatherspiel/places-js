import type {DataStore} from "./state/update/DataStore";
import {DataStoreSubscription} from "./state/update/types/DataStoreSubscriptoin";

export abstract class BaseDynamicComponent extends HTMLElement {

  #dataStoreLoaded: boolean = false;
  #dataStoreSubscriptions: DataStoreSubscription[];

  componentStore: any = {};
  #subscribedStores: DataStore[] = [];

  #attachedEventsToShadowRoot:boolean = false;

  protected constructor(dataStoreSubscriptions: DataStoreSubscription[] = []) {
    super();

    this.#dataStoreSubscriptions = dataStoreSubscriptions;

    const self = this;
    dataStoreSubscriptions.forEach((subscription: DataStoreSubscription) => {
      subscription.dataStore.subscribeComponent(self)
      self.#subscribedStores.push(subscription.dataStore);

      let params: Record<string, string> = subscription.params ?? {}
      if (subscription.urlParams) {
        subscription.urlParams.forEach((name: any) => {
          params[name] = (new URLSearchParams(document.location.search)).get(name) ?? "";
        })
      }
      subscription.dataStore.fetchData(params)
    });
  }

  disconnectedCallback(){
    const self = this;
    self.#subscribedStores.forEach((store:DataStore)=>{
      store.unsubscribeComponent(self)
    });
  }

  protected updateData(data: any) {

    if (!data) {
      data = this.componentStore
    }

    this.componentStore = {...this.componentStore,...this.#freezeComponentState(data)};
    this.#generateAndSaveHTML(this.componentStore);

    if(this.shadowRoot){
      if(this.attachEventHandlersToDom){
        this.attachEventHandlersToDom(this.shadowRoot);
      }
      if(this.attachEventsToShadowRoot && !this.#attachedEventsToShadowRoot){
        this.attachEventsToShadowRoot(this.shadowRoot);
        this.#attachedEventsToShadowRoot = true;
      }
    }
  }

  protected getComponentStore(){
    return this.componentStore;
  }

  updateFromDataStore() {

    let dataLoaded = true;
    this.#dataStoreSubscriptions.forEach((item:DataStoreSubscription)=> {
      if(!item.dataStore.hasStoreData()){
        dataLoaded = false;
      }
    });

    if(dataLoaded){
      this.#dataStoreLoaded = true;
    }

    const self = this;
    if(this.#dataStoreLoaded){

      let dataToUpdate: any = {}
      this.#dataStoreSubscriptions?.forEach((item:DataStoreSubscription)=> {

        let storeData = item.dataStore.getStoreData();
        if(item.componentReducer){
          storeData = item.componentReducer(storeData);
        }

        if(item.fieldName) {
          dataToUpdate[item.fieldName] = storeData;
        } else {
          dataToUpdate = storeData;
          if(self.#dataStoreSubscriptions?.length > 1){
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

  #generateAndSaveHTML(data: any) {
    if (this.shadowRoot === null) {
      this.attachShadow({ mode: "open" });

      let templateStyle = this.getTemplateStyle();

      const template = document.createElement("template");
      this.shadowRoot!.appendChild(template.content.cloneNode(true));
    }

    // @ts-ignore
    this.shadowRoot.innerHTML = this.getTemplateStyle() + this.render(data)
  }

  #freezeComponentState(state:any){
    if(!state || JSON.stringify(state)==='{}'){
      return {};
    }
    for (let [key, value] of Object.entries(state)) {
      if (state.hasOwnProperty(key) && typeof value == "object") {
        this.#freezeComponentState(value);
      }
    }
    return Object.freeze(state);
  }

  protected attachEventHandlersToDom?(shadowRoot?:any):any

  /*
    Override this method to attach events to the component shadow root.
   */
  protected attachEventsToShadowRoot?(shadowRoot:any):any

  protected abstract render(data: any): string;

  /*
  - Returns CSS styles specific to the component. The string should be in the format <style> ${CSS styles} </style>
  */
  protected abstract getTemplateStyle(): string;
}
