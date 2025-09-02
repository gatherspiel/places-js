import { DataStore } from "../DataStore";
import { CustomLoadAction } from "./CustomLoadAction";
import { ApiLoadAction } from "./ApiLoadAction";
import type { ApiRequestConfig } from "./types/ApiRequestConfig";

export type DataStoreConfig = {
  queryConfig: (a: any) => ApiRequestConfig;
  requestStoreName?: string;
};

let loadCount = 0;

export function generateDataStore(config: DataStoreConfig) {

  const getAction = new ApiLoadAction(
    config.queryConfig,
  );

  const dataStore = new DataStore(getAction);

  const requestStoreId =config.queryConfig.name+"_"+loadCount;
  dataStore.setId(requestStoreId);
  loadCount++;

  return dataStore;
}

export function generateDataStoreWithExternalConfig(
  retrieveData: (a: any) => Promise<any>,
):DataStore {
  const action = new CustomLoadAction(retrieveData);

  const requestStoreId ="api_request_"+loadCount;

  const store = new DataStore(action);
  store.setId(requestStoreId);
  loadCount++;

  return store;
}
