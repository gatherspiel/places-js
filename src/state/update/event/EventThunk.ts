import {BaseThunk} from "../BaseThunk";
import type { BaseDispatcher } from "../BaseDispatcher";
import { EventHandlerAction } from "./EventHandlerAction";
import type { EventValidationResult } from "./types/EventValidationResult";

export class EventThunk extends BaseThunk {
  constructor(dataFetch: EventHandlerAction, dispatchers: BaseDispatcher[]) {
    super(dataFetch, dispatchers);
  }

  async processEvent(e: Event, validator?: () => EventValidationResult) {
    if (validator) {
      const validationResult: EventValidationResult = validator();

      if (validationResult.errorMessage) {
        return validationResult;
      }
    }
    const response = await this.thunkAction.retrieveData(e);
    this.updateStore(response);
  }
}
