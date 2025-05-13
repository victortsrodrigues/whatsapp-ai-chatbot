// import { Queue, Worker } from 'bullmq';

// jest.mock('bullmq', () => ({
//   Queue: jest.fn().mockImplementation(() => ({
//     add: jest.fn().mockResolvedValue({}),
//     close: jest.fn().mockResolvedValue(undefined),
//     waitUntilReady: jest.fn().mockResolvedValue(undefined),
//   })),
//   Worker: jest.fn().mockImplementation(() => ({
//     close: jest.fn().mockResolvedValue(undefined),
//     on: jest.fn(),
//     waitUntilReady: jest.fn().mockResolvedValue(undefined),
//   })),
// }));

// jest.mock('ioredis', () => ({
//   createClient: jest.fn(() => ({
//     connect: jest.fn(),
//     quit: jest.fn(),
//     ping: jest.fn(() => 'PONG'),
//     isHealthy: jest.fn().mockResolvedValue(true),
//     lRange: jest.fn().mockResolvedValue([]),
//     rPush: jest.fn().mockResolvedValue(0),
//     del: jest.fn().mockResolvedValue(0),
//   })),
// }));

// beforeAll(() => {
//   process.env.REDIS_URL = 'mock://redis';
// });

// // // Mock Redis client
// // jest.mock('../utils/redisClient', () => ({
// //   __esModule: true,
// //   default: {
// //     initialize: jest.fn().mockResolvedValue(undefined),
// //     isHealthy: jest.fn().mockResolvedValue(true),
// //     get: jest.fn().mockResolvedValue(null),
// //     set: jest.fn().mockResolvedValue(undefined),
// //     del: jest.fn().mockResolvedValue(undefined),
// //     rPush: jest.fn().mockResolvedValue(1),
// //     lRange: jest.fn().mockResolvedValue([]),
// //     lTrim: jest.fn().mockResolvedValue(undefined),
// //     lRem: jest.fn().mockResolvedValue(1),
// //     expire: jest.fn().mockResolvedValue(undefined),
// //     ping: jest.fn().mockResolvedValue(true),
// //     getClient: jest.fn().mockReturnValue({
// //       connect: jest.fn().mockResolvedValue(undefined),
// //     }),
// //   },
// // }));

// // // Mock BullMQ
// // jest.mock('bullmq', () => ({
// //   Queue: jest.fn().mockImplementation(() => ({
// //     add: jest.fn().mockResolvedValue(undefined),
// //   })),
// //   Worker: jest.fn().mockImplementation(() => ({
// //     on: jest.fn(),
// //     waitUntilReady: jest.fn().mockResolvedValue(undefined),
// //   })),
// // }));

// // // Mock axios
// // jest.mock('axios', () => ({
// //   __esModule: true,
// //   default: {
// //     post: jest.fn().mockResolvedValue({ status: 200, data: { response: 'Mock response' } }),
// //     get: jest.fn().mockResolvedValue({ status: 200 }),
// //     isAxiosError: jest.fn().mockReturnValue(false),
// //   },
// // }));

// // // Mock services initialization
// // jest.mock('../utils/servicesInitialization', () => ({
// //   __esModule: true,
// //   default: {
// //     initializeRedis: jest.fn().mockResolvedValue(undefined),
// //     initializeAIService: jest.fn().mockResolvedValue(undefined),
// //     initializeAutoReplyService: jest.fn().mockResolvedValue(undefined),
// //     checkAIServiceHealth: jest.fn().mockResolvedValue(true),
// //   },
// // }));

// // // Mock queues
// // jest.mock('../utils/queues', () => ({
// //   __esModule: true,
// //   webhookProcessingQueue: {
// //     add: jest.fn().mockResolvedValue(undefined),
// //   },
// //   messageProcessingQueue: {
// //     add: jest.fn().mockResolvedValue(undefined),
// //   },
// //   messageReplyQueue: {
// //     add: jest.fn().mockResolvedValue(undefined),
// //   },
// //   webhookProcessingWorker: {
// //     waitUntilReady: jest.fn().mockResolvedValue(undefined),
// //     on: jest.fn(),
// //   },
// //   messageProcessingWorker: {
// //     waitUntilReady: jest.fn().mockResolvedValue(undefined),
// //     on: jest.fn(),
// //   },
// //   messageReplyWorker: {
// //     waitUntilReady: jest.fn().mockResolvedValue(undefined),
// //     on: jest.fn(),
// //   },
// // }));


// // // // Mock Redis client
// // // jest.mock('redis', () => ({
// // //   createClient: jest.fn().mockImplementation(() => ({
// // //     connect: jest.fn().mockResolvedValue(undefined), // Simula conexão
// // //     on: jest.fn(), // Para eventos como 'error', 'connect', etc.
// // //     ping: jest.fn().mockResolvedValue('PONG'), // Para health checks
// // //     quit: jest.fn().mockResolvedValue(undefined), // Para fechar conexão
// // //     get: jest.fn().mockResolvedValue(null),
// // //     set: jest.fn().mockResolvedValue(undefined),
// // //     initialize: jest.fn().mockResolvedValue(undefined),
// // //     isHealthy: jest.fn().mockResolvedValue(true),
// // //     del: jest.fn().mockResolvedValue(undefined),
// // //     rPush: jest.fn().mockResolvedValue(1),
// // //     lRange: jest.fn().mockResolvedValue([]),
// // //     lTrim: jest.fn().mockResolvedValue(undefined),
// // //     lRem: jest.fn().mockResolvedValue(1),
// // //     expire: jest.fn().mockResolvedValue(undefined),
// // //     isOpen: true, // Simula cliente conectado
// // //   })),
// // // }));
// // // jest.mock('../utils/redisClient', () => {
// // //   return {
// // //     __esModule: true,
// // //     default: {
// // //       initialize: jest.fn().mockResolvedValue(undefined),
// // //       isHealthy: jest.fn().mockResolvedValue(true),
// // //       get: jest.fn().mockResolvedValue(null),
// // //       set: jest.fn().mockResolvedValue(undefined),
// // //       del: jest.fn().mockResolvedValue(undefined),
// // //       rPush: jest.fn().mockResolvedValue(1),
// // //       lRange: jest.fn().mockResolvedValue([]),
// // //       lTrim: jest.fn().mockResolvedValue(undefined),
// // //       lRem: jest.fn().mockResolvedValue(1),
// // //       expire: jest.fn().mockResolvedValue(undefined),
// // //       ping: jest.fn().mockResolvedValue(true),
// // //       getClient: jest.fn().mockReturnValue({
// // //         connect: jest.fn().mockResolvedValue(undefined),
// // //       }),
// // //       close: jest.fn().mockResolvedValue(undefined), // Add this line
// // //     }
// // //   };
// // // });

// // // // Mock BullMQ
// // // jest.mock('bullmq', () => {
// // //   return {
// // //     Queue: jest.fn().mockImplementation(() => ({
// // //       add: jest.fn().mockResolvedValue(undefined),
// // //     })),
// // //     Worker: jest.fn().mockImplementation(() => ({
// // //       on: jest.fn(),
// // //       waitUntilReady: jest.fn().mockResolvedValue(undefined),
// // //     })),
// // //   };
// // // });

// // // // Mock axios
// // // jest.mock('axios', () => {
// // //   return {
// // //     __esModule: true,
// // //     default: {
// // //       post: jest.fn().mockResolvedValue({ status: 200, data: { response: 'Mock response' } }),
// // //       get: jest.fn().mockResolvedValue({ status: 200 }),
// // //       isAxiosError: jest.fn().mockReturnValue(false),
// // //     }
// // //   };
// // // });

// // // // Mock services initialization
// // // jest.mock('../utils/servicesInitialization', () => {
// // //   return {
// // //     __esModule: true,
// // //     default: {
// // //       initializeRedis: jest.fn().mockResolvedValue(undefined),
// // //       initializeAIService: jest.fn().mockResolvedValue(undefined),
// // //       initializeAutoReplyService: jest.fn().mockResolvedValue(undefined),
// // //       checkAIServiceHealth: jest.fn().mockResolvedValue(true),
// // //     }
// // //   };
// // // });

// // // // Mock queues
// // // jest.mock('../utils/queues', () => {
// // //   const mockAdd = jest.fn().mockResolvedValue(undefined);
// // //   return {
// // //     __esModule: true,
// // //     webhookProcessingQueue: {
// // //       add: mockAdd,
// // //     },
// // //     messageProcessingQueue: {
// // //       add: jest.fn().mockResolvedValue(undefined),
// // //     },
// // //     messageReplyQueue: {
// // //       add: jest.fn().mockResolvedValue(undefined),
// // //     },
// // //     webhookProcessingWorker: {
// // //       waitUntilReady: jest.fn().mockResolvedValue(undefined),
// // //       on: jest.fn(),
// // //     },
// // //     messageProcessingWorker: {
// // //       waitUntilReady: jest.fn().mockResolvedValue(undefined),
// // //       on: jest.fn(),
// // //     },
// // //     messageReplyWorker: {
// // //       waitUntilReady: jest.fn().mockResolvedValue(undefined),
// // //       on: jest.fn(),
// // //     },
// // //   };
// // // });
