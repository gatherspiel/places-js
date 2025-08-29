
export type FormInputConfig = {
  componentLabel: string,
  id: string,
  value?: string, //If the value is undefined, a previous input value will be used if it is present.
  inputType: string,
  className?:string,
  lineBreakAfterLabel?: boolean,
}