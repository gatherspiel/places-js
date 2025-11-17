import {DataStoreSubscription} from "./state/update/types/DataStoreSubscription";
import {freezeState} from "./state/StateUtils";
import {LoadingIndicatorConfig} from "./state/update/types/LoadingIndicatorConfig";
import {DataStore} from "./state/update/DataStore";

export abstract class BaseDynamicComponent extends HTMLElement {

  #attachedEventsToShadowRoot:boolean = false;

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
      console.warn("Attempting to lock component multiple times");
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

    /**
     * TODO
     *
     * Show loading animation here.
     * If one exists, set it to show for a minimum of 0.5 seconds.
     * Add a loading store to the component that runs for 0.5 seconds.
     */
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

    if(this.#loadingFromStores.size > 0){
      console.warn("Component is locked because of loading from stores cannot be updated right now");
      return;
    }

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

    if(this.#loadingStarted > 0){
      const current = Date.now();
      const loadTime = current - this.#loadingStarted;

      console.log(`Loading took ${loadTime} milliseconds`);
      if(this.#loadingIndicatorConfig?.minTimeMs){
        const remainingTime = this.#loadingIndicatorConfig.minTimeMs - loadTime;

        const self = this;
        if(remainingTime > 0){
          setTimeout(()=>{
            // @ts-ignore
            self.shadowRoot.innerHTML = this.getTemplateStyle() + this.render(data)
            self.#loadingStarted = 0;
          },remainingTime);
        }
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
