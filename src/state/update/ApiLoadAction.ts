import { DataStoreLoadAction } from "./DataStoreLoadAction";

import type { ApiRequestConfig } from "./types/ApiRequestConfig";
import { ApiActionTypes } from "./types/ApiActionTypes";
import {
  clearSessionStorage,
  getItemFromSessionStorage,
  updateSessionStorage
} from "../../utils/SessionStorageUtils";
import {getLocalStorageDataIfPresent} from "../../utils/LocalStorageUtils";
export class ApiLoadAction extends DataStoreLoadAction {

  readonly #getQueryConfig: (a: any) => ApiRequestConfig;

  constructor(
    getQueryConfig: (a: any) => ApiRequestConfig,
  ) {
    super();
    this.#getQueryConfig = getQueryConfig;
  }

  /**
   * @param params
   */
  async fetch(params: any, cacheKey?: string): Promise<any> {

    const queryConfig: ApiRequestConfig = this.#getQueryConfig(params);

    let requestKey = ''
    if(cacheKey && cacheKey.length > 0){
      requestKey = `${queryConfig.method ?? ''}_${queryConfig.url}_${JSON.stringify(queryConfig.body) ?? ''}`;

      const cachedResponse = getItemFromSessionStorage(cacheKey, requestKey);

      if(cachedResponse){
        return cachedResponse;
      }
    }

    if(!queryConfig.headers){
      queryConfig.headers = {};
    }


    const response = await ApiLoadAction.getResponseData(
      queryConfig,
    );

    if(cacheKey && requestKey){
      if(queryConfig.method && queryConfig.method !== ApiActionTypes.GET){
        clearSessionStorage();
      }
      updateSessionStorage(cacheKey, requestKey, response)
    }

    return response;
  }


  static async #getErrorData(response:any, url:string){

    let message = "";

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      message = await response.json();
    } else {
      if (response.status === 404) {
        message = `Endpoint ${url} not found`;
      } else {
        message = await response.text();
      }
    }

    return {
      status: response.status,
      errorMessage: message,
      endpoint: url,
    };

  }

  /**
   * Directly make an API request and return the data. Use this method if the API request needs
   * to be run as part of an event handler and no other components subscribe to the request.
   *
   * Cache data will not be used or updated.
   */
  static async getResponseData(queryConfig: ApiRequestConfig){

    const url = queryConfig.url;
    const authData = getLocalStorageDataIfPresent("access_token")?.access_token

    if (authData) {
      if(queryConfig.headers){
        queryConfig.headers["authToken"] = authData;
      } else {
        queryConfig.headers = {
          "authToken": authData
        }
      }
    }

    try {
      //The replace call is a workaround for an issue with url strings containing double quotes"
      const response = await fetch(url.replace(/"/g, ""), {
        method: queryConfig.method ?? ApiActionTypes.GET,
        headers: queryConfig.headers,
        body: queryConfig.body,
      });
      if (response.status !== 200) {
        return await this.#getErrorData(response,url)
      }

      const contentType = response.headers.get("content-type");
      if (contentType === "application/json") {
        return await response.json();
      }

      //Clear cache because there was a likely data update.
      if(queryConfig.method !== ApiActionTypes.GET){
        console.log("Clearing session storage because of data update");
        clearSessionStorage();
      }
      return ApiLoadAction.#defaultApiSuccessResponse;

    } catch (e: any) {
      return e.message;
    }
  }

  static #defaultApiSuccessResponse =  () =>{
    return { status: 200 };
  };

}
