Use npm for package management, not bun or pnpm.
Avoid external dependencies, the goal is a compiled single .js file (`npm run build`) with no dependencies needed. Dependencies complicate that.
TypeScript relies on Node.js's built-in TypeScript support.
When making edits, edit src/, then use `npm run build` to rebuild the compiled .js file.
