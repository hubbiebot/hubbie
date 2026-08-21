import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const specUrl = new URL('../openapi/openapi.yaml', import.meta.url);

describe('OpenAPI contract', () => {
  it('documents health and reusable Problem Details', async () => {
    const spec = parse(await readFile(fileURLToPath(specUrl), 'utf8'));

    expect(spec.openapi).toBe('3.1.0');
    expect(spec.paths).toHaveProperty('/health/live');
    expect(spec.paths).toHaveProperty('/health/ready');
    expect(spec.components.schemas).toHaveProperty('ProblemDetails');
    expect(spec.components.responses).toHaveProperty('BadRequest');
    expect(spec.components.responses).toHaveProperty('PayloadTooLarge');
    expect(spec.components.responses).toHaveProperty('InternalServerError');
    expect(spec.paths['/health/ready'].get.responses).toHaveProperty('500');
  });
});
