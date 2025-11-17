import {DataStoreSubscription} from "./state/update/types/DataStoreSubscription";
import {freezeState} from "./state/StateUtils";
import {LoadingIndicatorConfig} from "./state/update/types/LoadingIndicatorConfig";
import {DataStore} from "./state/update/DataStore";

export abstract class BaseDynamicComponent extends HTMLElement {

  #attachedEventsToShadowRoot:boolean = false;

  #componentIsRendering:boolean = false;
  #loadingFromStores = new Set();
  #loadingStarted:number = 0;

  componentStore: any = {};

  readonly #loadingIndicatorConfig?: LoadingIndicatorConfig;
  readonly #subscribedStores: DataStoreSubscription[] = [];

  protected constructor(dataStoreSubscriptions: DataStoreSubscription[] = [], loadingIndicatorConfig?:LoadingIndicatorConfig) {
    super();

    const self = this;

    if(loadingIndicatorConfig){
      this.#loadingIndicatorConfig = loadingIndicatorConfig;
    }

    this.#subscribedStores = dataStoreSubscriptions
    dataStoreSubscriptions.forEach((subscription: DataStoreSubscription) => {
      subscription.dataStore.subscribeComponent(self)
    });
    this.updateFromSubscribedStores();
  }

  lockComponent(dataStore:DataStore){
    
    if(!this.#loadingFromStores.has(dataStore)){
      this.#loadingFromStores.add(dataStore);
    } else {
      console.warn(`Attempting to lock component ${this.constructor.name} multiple times`);
    }

    if(this.#loadingStarted === 0){
      this.#loadingStarted = Date.now();
    }

    if(this.#loadingIndicatorConfig){

      if (this.shadowRoot === null) {
        this.attachShadow({ mode: "open" });
        const template = document.createElement("template");
        this.shadowRoot!.appendChild(template.content.cloneNode(true));
      }
      // @ts-ignore
      this.shadowRoot.innerHTML =
        this.getTemplateStyle() + this.#loadingIndicatorConfig.generateLoadingIndicatorHtml();
    }

  }

  unlockComponent(dataStore: DataStore) {
    this.#loadingFromStores.delete(dataStore);
  }

  disconnectedCallback(){
    const self = this;
    self.#subscribedStores.forEach((subscription:DataStoreSubscription)=>{
      subscription.dataStore.unsubscribeComponent(self);
    })
  }

  protected updateData(storeUpdates: any) {

    //TODO: Consider solution to multiple renders being attempted at the same time such as blocking concurrent renders.
    if(this.#componentIsRendering){
      console.warn(`Attempting to trigger multiple renders at the same time on component ${this.constructor.name}`)
    }

    this.#componentIsRendering = true;

    if (!storeUpdates) {
      storeUpdates = this.componentStore;
    }

    this.componentStore = {...this.componentStore,...freezeState(storeUpdates)};
    this.#generateAndSaveHTML(this.componentStore);

    if(this.shadowRoot){
      if(this.attachHandlersToShadowRoot && !this.#attachedEventsToShadowRoot){
        this.attachHandlersToShadowRoot(this.shadowRoot);
        this.#attachedEventsToShadowRoot = true;
      }
    }

    this.#componentIsRendering = false;
  }

  updateFromSubscribedStores() {

    let allSubscribedStoresHaveData = true;
    for(let i=0; i<this.#subscribedStores.length; i++){
      allSubscribedStoresHaveData = allSubscribedStoresHaveData &&
        (this.#subscribedStores[i].dataStore.isWaitingForData())
    }

    const self = this;
    if(allSubscribedStoresHaveData){

      let dataToUpdate: any = {}
      this.#subscribedStores?.forEach((item:DataStoreSubscription)=> {

        let storeData = item.dataStore.getStoreData();
        if(item.componentReducer){
          storeData = item.componentReducer(storeData);
        }

        if(item.fieldName) {
          dataToUpdate[item.fieldName] = storeData;
        } else {
          dataToUpdate = storeData;
          if(self.#subscribedStores?.length > 1){
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
      const template = document.createElement("template");
      this.shadowRoot!.appendChild(template.content.cloneNode(true));
    }

    console.log(this.#loadingStarted);
    if(this.#loadingStarted > 0){
      const current = Date.now();
      const loadTime = current - this.#loadingStarted;

      this.#loadingStarted = 0;
      if(this.#loadingIndicatorConfig?.minTimeMs){
        const remainingTime = this.#loadingIndicatorConfig.minTimeMs - loadTime;


        const self = this;
        if(remainingTime > 0){
          setTimeout(()=>{
            // @ts-ignore
            self.shadowRoot.innerHTML = this.getTemplateStyle() + this.render(data)
          },remainingTime);
        } else {

          // @ts-ignore
          this.shadowRoot.innerHTML = this.getTemplateStyle() + this.render(data)
        }
      } else {
        // @ts-ignore
        this.shadowRoot.innerHTML = this.getTemplateStyle() + this.render(data)
      }

    }
    else {
      // @ts-ignore
      this.shadowRoot.innerHTML = this.getTemplateStyle() + this.render(data)
    }
  }


  /*
    Override this method to attach event handlers to the component shadow root.
   */
  protected attachHandlersToShadowRoot?(shadowRoot:ShadowRoot):any

  protected abstract render(data: any): string;

  /*
  - Returns CSS styles specific to the component. The string should be in the format <style> ${CSS styles} </style>
  */
  protected abstract getTemplateStyle(): string;
}
