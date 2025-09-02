import {DataStoreLoadAction} from "../DataStoreLoadAction";

export class PreloadLoadAction extends DataStoreLoadAction{

  async fetch(): Promise<any>{

    let promise = new Promise(resolve=>{
      const id = setInterval(()=>{

        // @ts-ignore
        if(window.preloadData) {
          clearInterval(id);
          // @ts-ignore
          resolve(window.preloadData)
        }
      },10)
    });
    return promise;
  }

}



