import {getLocalStorageDataIfPresent} from "./LocalStorageUtils";

export function getAccessTokenIfPresent() {
  const authData = getLocalStorageDataIfPresent("access_token");
  return authData ? authData["access_token"] : null;
}