import {getLocalStorageDataIfPresent} from "../state/storage/LocalStorageUtils";

export function getAccessTokenIfPresent() {
  const authData = getLocalStorageDataIfPresent("access_token");
  return authData ? authData["access_token"] : null;
}