import type { EventHandlerData } from "./EventHandlerData";
import type { EventValidationResult } from "./EventValidationResult";
import type {FormSelector} from "../../../../FormSelector";
import type {BaseThunk} from "../../BaseThunk";

export interface EventHandlerThunkConfig {
  componentReducer?: (a: any) => any; //Reducer function
  eventHandler: (e: EventHandlerData) => any;
  requestStoreToUpdate?: string;
  validator?: (
    formSelector: FormSelector,
    componentData: any) => EventValidationResult;
  apiRequestThunk?: BaseThunk
}
