import type {FormSelector} from "../../../../FormSelector";

export interface EventHandlerData {
  event?: Event;
  componentStore?: any;
  targetId: string;
  formSelector: FormSelector,
  params: any;
}
