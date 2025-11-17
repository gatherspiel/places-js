
/**
 * @param generateLoadingIndicatorHtml: Generate any html necessary for the loading indicator
 * @param minTimeMs: Minimum time that the animation will run for in miliseconds
 * */
export type LoadingIndicatorConfig = {
  generateLoadingIndicatorHtml:()=>string;
  minTimeMs: number;
}
