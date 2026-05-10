Use npm for package management, not bun or pnpm.
Avoid external dependencies, the goal is a compiled single .js file (`npm run build`) with no dependencies needed. Dependencies complicate that.
TypeScript relies on Node.js's built-in TypeScript support.
