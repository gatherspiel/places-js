/*
 Updates store after an API response is returned
 */

export class BaseDispatcher {
  storeField: any;
  reducerUpdate: (a: any) => any;
  responseField?: string;

  constructor(
    storeName: any,
    storeUpdate?: (a: any) => any,
    responseField?: string,
  ) {
    this.storeField = storeName;
    this.responseField = responseField;

    if(storeUpdate){
      this.reducerUpdate = storeUpdate;
    } else {
      this.reducerUpdate = (data:any)=>{
        return data;
      }
    }
  }

  getComponent(){
    return this.storeField;
  }

  updateStore(response: any) {
    const baseDispatcher: BaseDispatcher = this;
    const responseData = this.responseField
      ? response[this.responseField]
      : response;

    this.storeField.retrieveData(responseData,baseDispatcher.reducerUpdate)


  }
}
