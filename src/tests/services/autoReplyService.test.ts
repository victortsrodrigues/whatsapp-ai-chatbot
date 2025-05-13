import autoReplyService from "../../services/autoReplyService";
import redisClient from "../../utils/redisClient";
import logger from "../../utils/logger";

describe("AutoReplyService", () => {
  // initialize() should set up the cache from Redis and start a refresh interval
  it("should initialize cache from Redis and set refresh interval", async () => {
    // Mock dependencies
    jest.spyOn(redisClient, "lRange").mockResolvedValue(["user1", "user2"]);

    // Spy on setInterval
    jest.spyOn(global, "setInterval");

    // Call initialize
    await autoReplyService.initialize();

    // Verify Redis was called to load initial data
    expect(redisClient.lRange).toHaveBeenCalledWith("enabled_users", 0, -1);

    // Verify setInterval was called with correct refresh time (5 minutes)
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 300000);

    // Verify the service is marked as initialized
    expect(autoReplyService["initialized"]).toBe(true);

    // Verify cache contains the expected users
    expect(autoReplyService["enabledUsersCache"].size).toBe(2);
    expect(autoReplyService["enabledUsersCache"].has("user1")).toBe(true);
    expect(autoReplyService["enabledUsersCache"].has("user2")).toBe(true);
    expect(autoReplyService["enabledUsersCache"].has("user3")).toBe(false);
  });

  it("should add a user ID to enabledUsersCache and Redis when not already present", async () => {
    // Arrange
    const userId = "user123";

    // Mock dependencies
    jest.spyOn(redisClient, "isHealthy").mockResolvedValue(true);
    jest.spyOn(redisClient, "rPush").mockResolvedValue(1);
    jest.spyOn(logger, "info").mockImplementation();

    // Act
    await autoReplyService.enable([userId]);

    // Assert
    expect(autoReplyService["enabledUsersCache"].has(userId)).toBe(true);
    expect(redisClient.rPush).toHaveBeenCalledWith(
      autoReplyService["REDIS_KEY"],
      userId
    );
    expect(logger.info).toHaveBeenCalledWith(
      `Auto-reply enabled for ${userId}`
    );
  });

  it("should not modify cache or call Redis when userIds array is empty", async () => {
    // Arrange
    const initialCacheSize = autoReplyService["enabledUsersCache"].size;

    // Mock dependencies
    jest.spyOn(redisClient, "isHealthy").mockResolvedValue(true);
    jest.spyOn(redisClient, "rPush").mockResolvedValue(1);
    jest.spyOn(logger, "info").mockImplementation();

    // Act
    await autoReplyService.enable([]);

    // Assert
    expect(autoReplyService["enabledUsersCache"].size).toBe(initialCacheSize);
    expect(redisClient.isHealthy).not.toHaveBeenCalled();
    expect(redisClient.rPush).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("should remove user from cache and Redis when disabling auto-reply", async () => {
    // Arrange
    const mockDelete = jest.fn();
    const mockLRem = jest.fn().mockResolvedValue(1);
    const mockGetClient = jest.fn().mockReturnValue({
      lRem: mockLRem,
    });

    jest.spyOn(redisClient, "getClient").mockImplementation(mockGetClient);

    autoReplyService.enabledUsersCache.add("user123");
    autoReplyService.enabledUsersCache.delete = mockDelete;

    // Act
    await autoReplyService.disable(["user123"]);

    // Assert
    expect(mockDelete).toHaveBeenCalledWith("user123");
    expect(mockGetClient).toHaveBeenCalled();
    expect(mockLRem).toHaveBeenCalledWith("enabled_users", 0, "user123");
  });

  it("should remove user from Redis even when not in cache", async () => {
    // Arrange
    const mockDelete = jest.fn();
    const mockLRem = jest.fn().mockResolvedValue(1);
    const mockGetClient = jest.fn().mockReturnValue({
      lRem: mockLRem,
    });

    jest.spyOn(redisClient, "getClient").mockImplementation(mockGetClient);

    autoReplyService.enabledUsersCache.delete = mockDelete;
    
    // Act
    await autoReplyService.disable(["nonExistentUser"]);

    // Assert
    expect(mockDelete).toHaveBeenCalledWith("nonExistentUser");
    expect(mockGetClient).toHaveBeenCalled();
    expect(mockLRem).toHaveBeenCalledWith(
      "enabled_users",
      0,
      "nonExistentUser"
    );
  });
});
