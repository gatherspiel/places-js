export function getUrlParameter(paramName: string): string {
  let params = new URLSearchParams(document.location.search);
  return params.get(paramName) ?? "";
}

export function showExperimental() {
  let params = new URLSearchParams(document.location.search);
  return params.get("experimental") === "true";
}
