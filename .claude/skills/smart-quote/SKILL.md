```markdown
# smart-quote Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `smart-quote` repository, a TypeScript React codebase. It covers file naming, import/export styles, commit message habits, and testing patterns, providing practical examples and recommended commands for common workflows.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `smartQuoteComponent.tsx`, `quoteUtils.ts`

### Import Style
- Use **alias imports** to reference modules.
  - Example:
    ```typescript
    import { SmartQuote } from 'components/SmartQuote';
    ```

### Export Style
- **Mixed exports** are used (both default and named).
  - Example:
    ```typescript
    // Named export
    export function formatQuote(text: string): string { ... }

    // Default export
    export default SmartQuote;
    ```

### Commit Patterns
- Commit messages are **freeform**, sometimes with prefixes.
- Average commit message length: **124 characters**.
  - Example:
    ```
    Add support for multiline quotes and update styling for better readability in the quote display component
    ```

## Workflows

### Adding a New Component
**Trigger:** When you need to introduce a new UI element or feature.
**Command:** `/add-component`

1. Create a new file using camelCase in the appropriate directory.
2. Implement the component using TypeScript and React.
3. Use alias imports for dependencies.
4. Export the component (default or named as appropriate).
5. Add or update corresponding test files (`*.test.tsx`).
6. Commit your changes with a clear, descriptive message.

### Refactoring Existing Code
**Trigger:** When improving code structure or readability.
**Command:** `/refactor-code`

1. Identify the files to refactor.
2. Update code, maintaining camelCase file names and alias imports.
3. Ensure exports follow the mixed style as needed.
4. Update or add tests if behavior changes.
5. Commit with a descriptive message explaining the refactor.

### Writing and Running Tests
**Trigger:** When adding new features or fixing bugs.
**Command:** `/run-tests`

1. Create or update test files using the `*.test.*` pattern.
2. Write tests in TypeScript (testing framework is currently unknown).
3. Run the test suite using the project's test runner.
4. Review and fix any failing tests.
5. Commit with a message summarizing the test changes.

## Testing Patterns

- Test files follow the `*.test.*` naming convention (e.g., `smartQuote.test.tsx`).
- The testing framework is not specified; check project documentation or `package.json` for details.
- Place test files alongside the components they test or in a dedicated `__tests__` directory.
- Example test file:
  ```typescript
  import { render } from '@testing-library/react';
  import SmartQuote from './smartQuoteComponent';

  test('renders quote text', () => {
    const { getByText } = render(<SmartQuote text="Hello" />);
    expect(getByText('Hello')).toBeInTheDocument();
  });
  ```

## Commands
| Command         | Purpose                                      |
|-----------------|----------------------------------------------|
| /add-component  | Guide for adding a new component             |
| /refactor-code  | Steps for refactoring existing code          |
| /run-tests      | Instructions for writing and running tests   |
```