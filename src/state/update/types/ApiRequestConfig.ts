
/**
 * @param {string} url. The endpoint URL. Example: http://localhost:7070/searchEvents
 * @param {string} method. The API action type. GET will be used if an action type isn't specified.
 */
export type ApiRequestConfig = {
  url: string;
  method?:string;
  headers?: Record<string, string>;
  body?: any;
};
