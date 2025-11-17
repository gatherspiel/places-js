import { DataStoreLoadAction } from "./DataStoreLoadAction";

import type { ApiRequestConfig } from "./types/ApiRequestConfig";
import { ApiActionType } from "./types/ApiActionType";
import {
  clearSessionStorage,
  getItemFromSessionStorage,
  updateSessionStorage
} from "../../utils/SessionStorageUtils";
import {getLocalStorageDataIfPresent} from "../../utils/LocalStorageUtils";
import {ApiResponseData} from "./types/ApiResponseData";

/**
 * Class to define a data store load action through an API call.
 */
export class ApiLoadAction extends DataStoreLoadAction {

  readonly #getRequestConfig: (a: any) => ApiRequestConfig;

  constructor(
    getRequestConfig: (a: any) => ApiRequestConfig,
  ) {
    super();
    this.#getRequestConfig = getRequestConfig;
  }

  /**
   * @param params API request parameters
   * @param cacheKey
   */
  async fetch(params: ApiRequestConfig, cacheKey?: string): Promise<ApiResponseData> {

    const queryConfig: ApiRequestConfig = this.#getRequestConfig(params);

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
      if(queryConfig.method && queryConfig.method !== ApiActionType.GET){
        clearSessionStorage();
      }
      updateSessionStorage(cacheKey, requestKey, response)
    }
    return response;
  }

  static async #getErrorData(response:any, url:string): Promise<ApiResponseData> {

    let message;

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
   * Cache data will not be used or updated.
   *
   * @param {ApiRequestConfig} queryConfig Configuration of the API request.
   */
  static async getResponseData(queryConfig: ApiRequestConfig): Promise<ApiResponseData>{

    const authData = getLocalStorageDataIfPresent("authToken")?.access_token

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
      const response = await fetch(queryConfig.url.replace(/"/g, ""), {
        method: queryConfig.method ?? ApiActionType.GET,
        headers: queryConfig.headers,
        body: queryConfig.body,
      });

      if (response.status !== 200) {
        return await this.#getErrorData(response,queryConfig.url)
      }

      const contentType = response.headers.get("content-type");
      if (contentType === "application/json") {
        return await response.json();
      }

      //Clear cache because there was a likely data update.
      if(queryConfig.method !== ApiActionType.GET){
        console.log("Clearing response cache and other data in session storage");
        clearSessionStorage();
      }
      return { status: 200 };

    } catch (e: any) {
      return {errorMessage:e.message};
    }
  }

}
