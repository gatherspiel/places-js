export abstract class DataStoreLoadAction {
  abstract fetch(params: any, cacheKey?: string):any
}
