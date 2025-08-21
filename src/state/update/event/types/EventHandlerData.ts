import type {FormSelector} from "../../../../FormSelector";
import {BaseDynamicComponent} from "../../../../components/BaseDynamicComponent";

export interface EventHandlerData {
  event?: Event;
  componentStore?: any;
  targetId: string;
  formSelector: FormSelector;
  params: any;
  component:BaseDynamicComponent
}
