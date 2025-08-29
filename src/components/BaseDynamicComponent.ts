import type {DisplayItem} from "./types/DisplayItem";

import {
  type ComponentLoadConfig, type DataFieldConfig, DataThunkItem,
  GLOBAL_FIELD_SUBSCRIPTIONS_KEY,
  GLOBAL_STATE_LOAD_CONFIG_KEY,
  REQUEST_THUNK_REDUCERS_KEY,
  type RequestThunkReducerConfig,
  validComponentLoadConfigFields,
} from "./types/ComponentLoadConfig";
import type {BaseThunk} from "../state/update/BaseThunk";
import {
  getGlobalStateValueIfPresent,
  subscribeToGlobalField,
} from "../state/data/GlobalStore";
import type {FormInputConfig} from "./types/FormInputConfig";
import  {FormSelector} from "../FormSelector";
import {getUrlParameter} from "../utils/UrlParamUtils";
import type {EventHandlerThunkConfig} from "../state/update/event/types/EventHandlerThunkConfig";
import {BaseDispatcher} from "../state/update/BaseDispatcher";
import {EventHandlerAction} from "../state/update/event/EventHandlerAction";
import {EventThunk} from "../state/update/event/EventThunk";
import type {EventValidationResult} from "../state/update/event/types/EventValidationResult";
import {freezeState} from "../utils/Immutable";

type EventConfig = {
  eventType: string;
  eventFunction: (e: Event) => any;
};

export abstract class BaseDynamicComponent extends HTMLElement {


  readonly componentId: string

  #dependenciesLoaded: boolean = true;
  #componentLoadConfig: ComponentLoadConfig;

  #formSelector: FormSelector

  componentState: any = {};
  static instanceCount = 1;

  #eventHandlerConfig:Record<string, EventConfig>;
  #eventTagIdCount = 0;
  #elementIdTag:string;

  #subscribedThunks: BaseThunk[] = [];

  addedShadowDomEventHandlers:boolean = false;

  constructor(loadConfig: ComponentLoadConfig = {}) {
    super();

    this.#eventHandlerConfig = {};
    this.#componentLoadConfig = loadConfig;

    BaseDynamicComponent.instanceCount++;

    this.componentId = `${this.constructor.name}-${BaseDynamicComponent.instanceCount}`;
    this.#formSelector = new FormSelector();

    this.#elementIdTag = `data-${this.componentId}-element-id`;


    if(loadConfig.dataFields){

      const self = this;
      loadConfig.dataFields.forEach((item:DataFieldConfig)=>{

        if(!getGlobalStateValueIfPresent(item.fieldName)){
          self.#dependenciesLoaded = false;
        }

        let dataSource:BaseThunk = item.dataSource;

        let storeReducer = dataSource.globalStateReducer
        if(!storeReducer){
          storeReducer = (a:any)=> {
            return {
              [item.fieldName]:a
            }
          }
        }

        dataSource.addGlobalStateReducer(storeReducer)

        let params:Record<string, string> = {};

        if(item.urlParams){
          item.urlParams.forEach(name=>{
            params[name]=getUrlParameter(name);
          })
        }

        dataSource.retrieveData(params);
      })
    }
    const self = this;

    Object.keys(loadConfig).forEach((configField: any) => {
      if (!validComponentLoadConfigFields.includes(configField)) {
        throw new Error(
          `Invalid component load config field ${configField} for ${self.localName}. Valid fields are
          ${validComponentLoadConfigFields}`,
        );
      }
    });


    const globalStateLoadConfig = loadConfig[GLOBAL_STATE_LOAD_CONFIG_KEY];

    if (globalStateLoadConfig?.[GLOBAL_FIELD_SUBSCRIPTIONS_KEY]) {

      globalStateLoadConfig[GLOBAL_FIELD_SUBSCRIPTIONS_KEY].forEach(
        (fieldName: string) => {
          subscribeToGlobalField(self, fieldName);
        });
    }

    if(globalStateLoadConfig?.dataThunks){

      const self = this;
      globalStateLoadConfig?.dataThunks.forEach((thunkItem:DataThunkItem)=> {
        thunkItem.dataThunk.subscribeComponentToData(self)
        self.#subscribedThunks.push(thunkItem.dataThunk);
      });

      globalStateLoadConfig?.dataThunks.forEach((thunkItem:DataThunkItem)=>{
        let params:Record<string, string> = thunkItem.params ?? {}

        if(thunkItem.urlParams){
          thunkItem.urlParams.forEach((name:any)=>{
            params[name]=getUrlParameter(name);
          })
        }
        thunkItem.dataThunk.getData(params)
      });
    }


    if (loadConfig[REQUEST_THUNK_REDUCERS_KEY]) {

      loadConfig[REQUEST_THUNK_REDUCERS_KEY].forEach((
        config: RequestThunkReducerConfig,
      ) => {
        if (!config.thunk) {
          throw new Error(
            `Missing thunk field in ${self.componentId} reducer configuration`,
          );
        }
        config.thunk.subscribeComponent(
          this,
          config?.componentReducer ?? function(data:any){
            return data
          },
          config.reducerField,
        );
      });
    }

  }

  disconnectedCallback(){
    const self = this;
    self.#subscribedThunks.forEach((thunk:BaseThunk)=>{
      thunk.unsubscribeComponent(self)
    });
  }

  resetData(){
    this.#eventHandlerConfig = {};
    this.#eventTagIdCount = 0;
  }

  attachEventHandlersToDom(shadowRoot?:any){
    const eventHandlers = this.#eventHandlerConfig;
    const elementIdTag = this.#elementIdTag;

    const addEventHandler = function (item: Element) {
      const id = item.getAttribute(elementIdTag) ?? "";
      const eventConfig = eventHandlers[id];
      // @ts-ignore
      item.addEventListener(eventConfig.eventType, eventConfig.eventFunction);
    };

    if (shadowRoot) {
      shadowRoot?.querySelectorAll(`[${elementIdTag}]`).forEach(
        (item:any) => {
          addEventHandler(item);
        });
    } else {

      document.querySelectorAll(`[${elementIdTag}]`).forEach( (
        item: Element,
      ) => {
        addEventHandler(item);
      });
    }
  }


  retrieveData(data: any,
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

    this.resetData();

    this.generateAndSaveHTML(this.componentState, this.#dependenciesLoaded);

    if(this.shadowRoot){
      this.#formSelector.setShadowRoot(this.shadowRoot);
    }

    if(!this.addedShadowDomEventHandlers && this.shadowRoot){
      this.attachEventHandlersToDom(this.shadowRoot);
      this.addedShadowDomEventHandlers = true;
    }
 }


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

  createEvent(eventConfig: any, eventType:string, params?:any){
    const eventHandler = this.createHandler(
      eventConfig,
      this.#formSelector,
      this,
      params
    );
    let eventId = `${this.#elementIdTag}=${this.#eventTagIdCount}`;

    this.#eventHandlerConfig[this.#eventTagIdCount] = {
      eventType: eventType,
      eventFunction: eventHandler,
    };
    this.#eventTagIdCount++;
    return eventId;
  }

  createHandler(
    eventConfig: EventHandlerThunkConfig,
    formSelector: FormSelector,
    component: BaseDynamicComponent,
    params?: any
  ) {


    const dispatchers: BaseDispatcher[] = [];

    let componentStoreUpdate:BaseDispatcher;
    if(eventConfig.componentReducer){
      componentStoreUpdate = new BaseDispatcher(
        component,
        eventConfig.componentReducer,
      )
      dispatchers.push(componentStoreUpdate);

    }

    const apiRequestThunk = eventConfig.apiRequestThunk;
    if(apiRequestThunk){
      const storeUpdate = new BaseDispatcher(apiRequestThunk, (a: any): any => {
        return a;
      });
      dispatchers.push(storeUpdate);
    }

    const request: EventHandlerAction = new EventHandlerAction(
      eventConfig.eventHandler,
      component,
      formSelector,
      params
    );

    const eventUpdater: EventThunk = new EventThunk(request, dispatchers);

    if(eventConfig.globalStoreReducer){
      eventUpdater.addGlobalStateReducer(eventConfig.globalStoreReducer)
    }

    const handler = function (e: Event) {

      /**
       * TODO for refactoring
       *
       * -Move EventHandlerAction.retrieveData logic here.
       * -Update API thunk and component state directly.
       * -Delete EventHandlerAction
       * -Delete EventThunk logic here and then try and delete EventThunk class.
       * -Delete logic related to dispatchers
       */
      e.preventDefault();

      const validatorFunction = eventConfig.validator;
      if (validatorFunction) {
        const validator = function (): EventValidationResult {
          const componentData = component.getComponentStore();
          return validatorFunction(formSelector, componentData);
        };

        eventUpdater.processEvent(e, validator).then((result: any) => {
          if (result?.errorMessage && componentStoreUpdate) {
            componentStoreUpdate.updateStore(result);
          }
        });
      } else {
        eventUpdater.processEvent(e);
      }
    };
    return handler;
  }

  //This function should eventually replace updateFromGlobalState
  updateFromThunkState() {

    const globalStateLoadConfig =
      this.#componentLoadConfig.globalStateLoadConfig;
    if (!globalStateLoadConfig) {
      throw new Error(`Component global state config is not defined for component ${this.componentId}`);
    }

    const dataThunks = this.#componentLoadConfig?.globalStateLoadConfig?.dataThunks
    let dataLoaded = true;
    dataThunks?.forEach((item:DataThunkItem)=> {
      if(!item.dataThunk.hasThunkData()){
        dataLoaded = false;
      }
    });

    if(dataLoaded){
      this.#dependenciesLoaded = true;
    }


    if(this.#dependenciesLoaded){

      let dataToUpdate: any = {}
      dataThunks?.forEach((item:DataThunkItem)=> {

        let thunkData = item.dataThunk.getThunkData();
        if(item.componentReducer){
          thunkData = item.componentReducer(thunkData);
        }

        if(item.fieldName) {
          dataToUpdate[item.fieldName] = thunkData;
        } else {
          dataToUpdate = thunkData;
          if(dataThunks?.length > 1){
            throw new Error(`Component ${this.constructor.name} has multiple data thunks. 
              Each one must have a specified field name`)
          }
        }
      })

      this.retrieveData(
        dataToUpdate,
      );
    }
  }


  updateFromGlobalState(globalStateData:any) {


    const globalStateLoadConfig =
      this.#componentLoadConfig.globalStateLoadConfig;
    if (!globalStateLoadConfig) {
      throw new Error(`Component global state config is not defined for component ${this.componentId}`);
    }

    let reducer =
      this.#componentLoadConfig.globalStateLoadConfig?.defaultGlobalStateReducer ??
      ((updates: Record<string, string>) => updates)


    let dataLoaded = true;


    this.#componentLoadConfig?.dataFields?.forEach((item:DataFieldConfig)=> {
      if(!(globalStateData[item?.fieldName ?? ''])){
        dataLoaded = false;
      }
    });

    if(dataLoaded){
      this.#dependenciesLoaded = true;
    }

    let dataToUpdate: Record<string, string> = {};

    this.#componentLoadConfig.globalStateLoadConfig?.globalFieldSubscriptions?.forEach(
       (fieldName) => {
        dataToUpdate[fieldName] = globalStateData[fieldName];
      },
    );

    if(this.#dependenciesLoaded){
      this.retrieveData(
        dataToUpdate,
        reducer
      );
    }
  }

  abstract render(data: Record<any, DisplayItem> | any): string;
}
