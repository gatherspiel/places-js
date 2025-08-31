import { BaseThunkAction } from "../BaseThunkAction";

export class ExternalApiAction extends BaseThunkAction {

  #externalClient: (params: any) => any;
  constructor(
    externalClient: (params: any) => any,
  ) {
    super();
    this.#externalClient = externalClient;
  }

  async retrieveData(params: any): Promise<any> {
    const externalRequest: ExternalApiAction = this;

    return await externalRequest.#externalClient(
      params,
    );
  }

}
