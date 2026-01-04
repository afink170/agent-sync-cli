import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface ProvidedContext {
    // any useful context here
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setup(project: TestProject) {
  // project.provide('wsPort', 3000);
}

export function teardown() {}
