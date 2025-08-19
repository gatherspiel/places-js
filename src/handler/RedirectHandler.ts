import type {EventHandlerThunkConfig} from "../state/update/event/types/EventHandlerThunkConfig";
import type {EventHandlerData} from "../state/update/event/types/EventHandlerData";

export const REDIRECT_HANDLER_CONFIG: EventHandlerThunkConfig = {
  eventHandler: (event: EventHandlerData)=>{
    window.location.href = event.params.url;
  }
}
