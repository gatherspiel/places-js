import { DataStoreLoadAction } from "./DataStoreLoadAction";
import type {BaseDynamicComponent} from "../../BaseDynamicComponent";
import {ApiRequestConfig} from "./types/ApiRequestConfig";
import {freezeState} from "../StateUtils";

export class DataStore {

  static #storeCount = 0;

  #isFetchRequestActive:boolean = false;
  #loadAction: DataStoreLoadAction;
  #storeData:any = null
  #componentSubscriptions:BaseDynamicComponent[];

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
   * @returns {boolean} false if the data in the store is null or undefined, true otherwise.
   */
  hasStoreData():boolean {
    return this.#storeData !== null && this.#storeData !== undefined;
  }

  /**
   * Update data in the store and trigger a render of components subscribed to the store.
   * @param storeUpdates Updated store data. Fields not specified in storeData will not be updated.
   */
  updateStoreData(storeUpdates:any){
    this.#storeData = {...this.#storeData,...freezeState(storeUpdates)};
    this.#componentSubscriptions.forEach((component:BaseDynamicComponent)=>{
      component.updateFromSubscribedStores();
    })
  }

  /**
   * Retrieves data from an external source.
   * @param params Parameters for the request.
   * @param dataStore {DataStore}: Optional data store that will be subscribed to updates from this store.
   */
  fetchData(params:ApiRequestConfig, dataStore?:DataStore){

    const self = this;

    // Do not make a data request if there is an active one in progress. It will push data to subscribed components.
    if(!this.#isFetchRequestActive) {
      this.#isFetchRequestActive = true;
      this.#loadAction.fetch(params, self.#requestStoreId).then((response: any) => {

        self.#isFetchRequestActive = false;
        self.#storeData = response;

        if(dataStore){
          dataStore.updateStoreData(response);
        }

        self.#componentSubscriptions.forEach((component:BaseDynamicComponent)=>{
          component.updateFromSubscribedStores();
        })
      });
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
  }
}