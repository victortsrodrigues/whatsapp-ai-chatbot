jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue(undefined),
    waitUntilReady: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    waitUntilReady: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('ioredis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    quit: jest.fn(),
    ping: jest.fn(() => 'PONG'),
    isHealthy: jest.fn().mockResolvedValue(true),
    lRange: jest.fn().mockResolvedValue([]),
    rPush: jest.fn().mockResolvedValue(0),
    del: jest.fn().mockResolvedValue(0),
  })),
}));

beforeAll(() => {
  process.env.REDIS_URL = 'mock://redis';
});