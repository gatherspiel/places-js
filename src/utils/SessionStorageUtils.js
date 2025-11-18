export function clearSessionStorage(){
  for(let i = 0; i< sessionStorage.length; i++){
    const key = sessionStorage.key(i);
    sessionStorage.setItem(key, JSON.stringify({}))
  }
}

export function getItemFromSessionStorage(requestStoreName, requestData){

  const dataStr = sessionStorage.getItem(requestStoreName);
  if(!dataStr){
    return null;
  }

  const data = JSON.parse(dataStr);

  if(!(Object.keys(data).length === 0) && requestData in data){
    return data[requestData];
  }
  return null;
}

export function updateSessionStorage(requestStoreName, requestData, response){

  const dataStr = sessionStorage.getItem(requestStoreName);
  if(!dataStr){
    throw new Error(`No cache defined for ${requestStoreName}`)
  }

  const data = JSON.parse(dataStr);
  data[requestData] = response;

  sessionStorage.setItem(requestStoreName, JSON.stringify(data));
}