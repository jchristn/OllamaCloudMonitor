import bundledSpec from "../../../postman/specs/monitor.openapi.json";

/** Extract the allowlisted GET operations and their query contracts. */
export function explorerOperations(spec = bundledSpec) {
  return ["usage", "balance", "health"].flatMap((resource) => {
    const path = `/v1.0/api/${resource}`;
    const operation = spec.paths?.[path]?.get;
    return operation
      ? [
          {
            resource,
            path,
            parameters: (operation.parameters ?? []).filter(
              (parameter) => parameter.in === "query",
            ),
          },
        ]
      : [];
  });
}

/** Seed request-local values from the contract and the current dashboard selection. */
export function explorerDefaults(operation, selection = {}) {
  return Object.fromEntries(
    (operation?.parameters ?? []).map((parameter) => [
      parameter.name,
      String(selection[parameter.name] ?? parameter.schema?.default ?? ""),
    ]),
  );
}

/** Include only the selected operation's query parameters, omitting empty optional values. */
export function explorerQuery(operation, values) {
  return Object.fromEntries(
    (operation?.parameters ?? [])
      .filter(
        (parameter) =>
          values[parameter.name] !== "" && values[parameter.name] != null,
      )
      .map((parameter) => [parameter.name, values[parameter.name]]),
  );
}

/** Format the exact encoded path used by the shared API client. */
export function explorerPath(operation, query) {
  const suffix = new URLSearchParams(query).toString();
  return operation ? operation.path + (suffix ? "?" + suffix : "") : "";
}
