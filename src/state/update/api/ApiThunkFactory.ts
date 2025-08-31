import { BaseThunk } from "../BaseThunk";
import { ExternalApiAction } from "./ExternalApiAction";
import { InternalApiAction } from "./InternalApiAction";
import type { ApiRequestConfig } from "./types/ApiRequestConfig";

export type ApiThunkConfig = {
  queryConfig: (a: any) => ApiRequestConfig;
  requestStoreName?: string;
};

let thunkCount = 0;

export function generateApiThunk(config: ApiThunkConfig) {

  const getAction = new InternalApiAction(
    config.queryConfig,
  );

  const apiThunk = new BaseThunk(getAction);

  const requestStoreId =config.queryConfig.name+"_"+thunkCount;
  apiThunk.createRequestStore(requestStoreId);
  thunkCount++;

  return apiThunk;
}

export function generateApiThunkWithExternalConfig(
  retrieveData: (a: any) => Promise<any>,
):BaseThunk {
  const action = new ExternalApiAction(retrieveData);

  const requestStoreId ="api_request_"+thunkCount;

  const thunk = new BaseThunk(action);
  thunk.createRequestStore(requestStoreId);
  thunkCount++;

  return thunk;
}
