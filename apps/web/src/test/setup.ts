import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Without `globals: true`, RTL can't register its own afterEach — unmount
// between tests here so queries don't see the previous test's DOM.
afterEach(() => cleanup());
