export function freezeState(state:any){
  if(!state || JSON.stringify(state)==='{}'){
    return {};
  }

  for (let [key, value] of Object.entries(state)) {
    if (state.hasOwnProperty(key) && typeof value == "object") {
      freezeState(value);
    }
  }
  Object.freeze(state);
  return state;
}