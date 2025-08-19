import {BaseThunk} from "./BaseThunk";
import {PreloadApiAction} from "./api/PreloadApiAction";

export class PreloadThunk extends BaseThunk {

  async processEvent(){
    const response = await this.thunkAction.retrieveData({});
    this.updateStore(response);
  }
}

export function generatePreloadThunk(thunkId: string){
  const action = new PreloadApiAction();
  const thunk = new PreloadThunk(action);
  thunk.createRequestStore(thunkId)
  return thunk
}