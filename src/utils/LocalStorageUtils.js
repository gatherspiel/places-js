export function getLocalStorageDataIfPresent(key) {
  const data = window.localStorage.getItem(key);
  return data ? JSON.parse(data): null;
}

export function addLocalStorageData(key, data){
  window.localStorage.setItem(key, data);
}

export function deleteLocalStoreData(key){
  if(window.localStorage.getItem(key)){
    window.localStorage.removeItem(key);
  }
}
