import { DataStoreLoadAction } from "./DataStoreLoadAction";

export class CustomLoadAction extends DataStoreLoadAction {

  readonly #externalClient: (params: any) => any;

  constructor(
    externalClient: (params: any) => any,
  ) {
    super();
    this.#externalClient = externalClient;
  }

  async fetch(params: any): Promise<any> {
    const externalRequest: CustomLoadAction = this;

    return await externalRequest.#externalClient(
      params,
    );
  }

}
