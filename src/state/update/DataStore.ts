import { DataStoreLoadAction } from "./DataStoreLoadAction";
import type {BaseDynamicComponent} from "../../BaseDynamicComponent";
import {freezeState} from "../StateUtils";

export class DataStore {

  static #storeCount = 0;

  #isLoading:boolean = false;
  #storeData:any = null
  #componentSubscriptions:BaseDynamicComponent[];

  readonly #loadAction: DataStoreLoadAction;
  readonly #requestStoreId?: string;

  constructor(loadAction: DataStoreLoadAction) {
    this.#loadAction = loadAction;
    this.#componentSubscriptions = [];

    this.#requestStoreId = `data-store-${DataStore.#storeCount}`;
    sessionStorage.setItem(this.#requestStoreId, JSON.stringify({}))

    DataStore.#storeCount++;
  }

  /**
   * Returns data from the store.
   * @returns A JSON object representing an immutable copy of store data.
   */
  getStoreData():any {
    return this.#storeData;
  }

  /**
   * @returns {boolean} false if the data in the store is null or undefined and is not in a loading state true otherwise.
   */
  isWaitingForData():boolean {
    return this.#storeData !== null && this.#storeData !== undefined  && !this.#isLoading;
  }

  /**
   * Update data in the store and trigger a render of components subscribed to the store.
   * @param storeUpdates Updated store data. Fields not specified in storeData will not be updated.
   */
  updateStoreData(storeUpdates:any){
    this.#storeData = {...this.#storeData,...freezeState(storeUpdates)};
    for(let i=0; i< this.#componentSubscriptions.length; i++){
      this.#componentSubscriptions[i].updateFromSubscribedStores();
    }
  }

  protected getSubscribedComponents(){
    return this.#componentSubscriptions;
  }

  /**
   * Retrieves data from an external source.
   * @param params Parameters for the request.
   * @param dataStore {DataStore}: Optional data store that will be subscribed to updates from this store.
   */
  async fetchData(params:any = {}, dataStore?:DataStore){

    const self = this;

    // Do not make a data request if there is an active one in progress. It will push data to subscribed components.
    if(!this.#isLoading) {
      this.#isLoading = true;

      //Disable rendering of component while data is being retrieved
      for(let i =0;i < self.#componentSubscriptions.length; i++){
        self.#componentSubscriptions[i].lockComponent(self);
      }

      if(dataStore){
        const dataStoreSubscribedComponents = dataStore.getSubscribedComponents();
        for(let i =0;i < dataStoreSubscribedComponents.length; i++){
          dataStoreSubscribedComponents[i].lockComponent(dataStore);
        }
      }

     const response = await this.#loadAction.fetch(params, self.#requestStoreId)

      self.#isLoading = false;
      self.#storeData = response;

      for(let i=0; i< self.#componentSubscriptions.length;i++){
        self.#componentSubscriptions[i].unlockComponent(self);
        self.#componentSubscriptions[i].updateFromSubscribedStores();
      }

      if(dataStore){
        dataStore.updateStoreData(response);
      }

      return response;
    }
  }

  unsubscribeComponent(component:BaseDynamicComponent){
    const idx = this.#componentSubscriptions.indexOf(component);
    if(idx === -1){
      console.warn(`Attempt to unsubscribe ${component.constructor.name} from store it is not subscribed to`)
      return;
    }
    this.#componentSubscriptions.splice(idx, 1);
  }

  subscribeComponent(component:BaseDynamicComponent){

    let i = 0;
    while(i<this.#componentSubscriptions.length){
      if(this.#componentSubscriptions[i] === component){
        this.#componentSubscriptions = this.#componentSubscriptions.splice(i, 1);
        break;
      }
      i++;
    }
    this.#componentSubscriptions.push(component);

    if(!this.isWaitingForData()){
      this.fetchData();
    }
  }
}