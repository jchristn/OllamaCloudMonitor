# Contributing

Use Node.js 24 and .NET 10. Run `npm ci --prefix dashboard`, `npm run build --prefix dashboard`, and the checks in README.md. Keep public API documentation, OpenAPI and Postman artifacts synchronized. Source belongs in src/, dashboard/, or test/. Use one C# class per file, explicit types, namespace-scoped imports, nullable annotations, cancellation tokens, ConfigureAwait(false), and XML documentation on public APIs. Do not use em dashes or change the version without an explicit request.

Changes must preserve unknown legacy metrics, include model remainders in account totals, and avoid attributing account balances to models. Add behavior-focused tests for accounting and authentication changes. Review responsive screenshots in both themes, and test pseudo-locales when changing layout or text.
