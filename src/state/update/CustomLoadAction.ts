import { DataStoreLoadAction } from "./DataStoreLoadAction";

/**
 * Class to define a custom data store load action with direct control over any async calls that are made.
 * It is intended for use when additional processing needs to be done after an async call, or if a store needs
 * to combine data from multiple sources.
 */
export class CustomLoadAction extends DataStoreLoadAction {

  readonly #loadFunction: (params: any) => any;

  constructor(
    loadFunction: (params: any) => any,
  ) {
    super();
    this.#loadFunction = loadFunction;
  }

  async fetch(params: any): Promise<any> {
    const externalRequest: CustomLoadAction = this;

    return await externalRequest.#loadFunction(
      params,
    );
  }

}
