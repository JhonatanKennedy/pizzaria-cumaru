import { DomainErrorFilter } from './domain-error.filter.js';
import { BadRequestException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

function makeArgumentsHost(statusSpy: ReturnType<typeof vi.fn>): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => ({
        status: vi.fn(() => ({ json: statusSpy })),
      }),
    }),
  } as unknown as ArgumentsHost;
}

describe('DomainErrorFilter', () => {
  it('should map a plain Error to 400 with its message', () => {
    const json = vi.fn();
    const filter = new DomainErrorFilter();

    filter.catch(
      new Error('Cannot cancel an item in preparation'),
      makeArgumentsHost(json),
    );

    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Cannot cancel an item in preparation',
    });
  });

  it('should pass Nest HttpExceptions through untouched', () => {
    const json = vi.fn();
    const filter = new DomainErrorFilter();
    const exception = new BadRequestException('Invalid status');

    filter.catch(exception, makeArgumentsHost(json));

    expect(json).toHaveBeenCalledWith(exception.getResponse());
  });
});
