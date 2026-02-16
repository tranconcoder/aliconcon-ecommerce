---
trigger: always_on
description: Enforce commenting standards for functions, methods, and logic sections
---

# Commenting Standards

## Inline Comments
- Always add inline comments at the beginning of logic sections within a function.

## JSDoc
- Add JSDoc comments for all functions and methods.
- Describe parameters, return values, and throws.

## Class Properties
- **Do not** add comments for individual class properties.

## Function Grouping & Dividers
- Group related functions within a class or file.
- Use a divider style comment at the beginning of each group.
- **Divider length must be exactly 60 characters.**

### Example Divider

```typescript
/* ------------------------------------------------------ */
/*                        Auth                            */
/* ------------------------------------------------------ */
```