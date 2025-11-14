import { DataStoreLoadAction } from "./DataStoreLoadAction";
import type {BaseDynamicComponent} from "../../BaseDynamicComponent";

export class DataStore {

  static #storeCount = 0;

  #activeRequest:boolean = false;
  #loadAction: DataStoreLoadAction;
  #storeData:any = null
  #subscribedComponents:BaseDynamicComponent[];

  readonly #requestStoreId?: string;

  constructor(loadAction: DataStoreLoadAction) {
    this.#loadAction = loadAction;
    this.#subscribedComponents = [];

    this.#requestStoreId = `data-store-${DataStore.#storeCount}`;
    sessionStorage.setItem(this.#requestStoreId, JSON.stringify({}))

    DataStore.#storeCount++;
  }

  getStoreData():any {
    return this.#storeData;
  }

  hasStoreData():boolean {
    return this.#storeData !== null && this.#storeData !== undefined;
  }

  updateStoreData(storeData:any){
    this.#storeData = storeData;
    this.#subscribedComponents.forEach((component:BaseDynamicComponent)=>{
      component.updateFromDataStore();
    })
  }

  /**
   * Retrieves data from API.
   * @param params
   * @param dataStore: Optional data store that will be subscribed to updates from this store.
   */
  fetchData(params:any, dataStore?:DataStore){

    const self = this;
    let cacheKey = this.#requestStoreId ?? ''

    // Do not make a data request if there is an active one in progress. It will push data to subscribed components.
    if(!this.#activeRequest) {
      this.#activeRequest = true;
      this.#loadAction.fetch(params, cacheKey).then((response: any) => {

        self.#activeRequest = false;
        self.#storeData = response;

        if(dataStore){
          dataStore.updateStoreData(response);
        }

        self.#subscribedComponents.forEach((component:BaseDynamicComponent)=>{
          component.updateFromDataStore();
        })
      });
    }
  }

  unsubscribeComponent(component:BaseDynamicComponent){
    const idx = this.#subscribedComponents.indexOf(component);
    if(idx === -1){
      console.warn(`Attempt to unsubscribe ${component.constructor.name} from store it is not subscribed to`)
      return;
    }
    this.#subscribedComponents.splice(idx, 1);
  }

  subscribeComponent(component:BaseDynamicComponent){

    let i = 0;
    while(i<this.#subscribedComponents.length){
      if(this.#subscribedComponents[i] === component){
        this.#subscribedComponents = this.#subscribedComponents.splice(i, 1);
        break;
      }
      i++;
    }
    this.#subscribedComponents.push(component);
  }
}