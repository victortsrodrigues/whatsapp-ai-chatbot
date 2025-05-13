import conversationRepository from "../../../repositories/conversationRepository";
import redisClient from "../../../utils/redisClient";
import logger from "../../../utils/logger";

describe("ConversationRepository", () => {
  it("should return parsed conversation history for a valid user", async () => {
    // Arrange
    const userId = "user123";
    const mockHistoryItems = [
      JSON.stringify({ role: "user", content: "Hello" }),
      JSON.stringify({ role: "assistant", content: "Hi there" }),
    ];

    jest.spyOn(redisClient, "isHealthy").mockResolvedValue(true);
    jest.spyOn(redisClient, "lRange").mockResolvedValue(mockHistoryItems);

    // Act
    const result = await conversationRepository.getHistory(userId);

    // Assert
    expect(redisClient.isHealthy).toHaveBeenCalled();
    expect(redisClient.lRange).toHaveBeenCalledWith("history:user123", 0, -1);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ role: "user", content: "Hello" });
    expect(result[1]).toEqual({ role: "assistant", content: "Hi there" });
  });

  it("should return empty array when Redis is unavailable", async () => {
    // Arrange
    const userId = "user123";

    jest.spyOn(redisClient, "isHealthy").mockResolvedValue(false);
    jest.spyOn(redisClient, "lRange").mockResolvedValue([]);
    jest.spyOn(logger, "warn").mockImplementation();

    // Act
    const result = await conversationRepository.getHistory(userId);

    // Assert
    expect(redisClient.isHealthy).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      `Redis unavailable, using empty history for user ${userId}`
    );
    expect(result).toEqual([]);
    expect(redisClient.lRange).not.toHaveBeenCalled();
  });

  it("should add user message and response to history", async () => {
    // Arrange
    const userId = "user123";
    const query = "Hello";
    const response = "Hi there";

    jest.spyOn(redisClient, "rPush").mockResolvedValue(1);
    jest.spyOn(redisClient, "isHealthy").mockResolvedValue(true);
    jest.spyOn(redisClient, "lRange").mockResolvedValue([]);
    jest.spyOn(redisClient, "lTrim").mockResolvedValue(undefined);
    jest.spyOn(redisClient, "expire").mockResolvedValue(undefined);

    // Act
    await conversationRepository.addConversation(userId, query, response);

    // Assert
    expect(redisClient.rPush).toHaveBeenCalledTimes(2);
    expect(redisClient.rPush).toHaveBeenCalledWith(
      "history:user123",
      JSON.stringify({ role: "user", content: query })
    );
    expect(redisClient.rPush).toHaveBeenCalledWith(
      "history:user123",
      JSON.stringify({ role: "assistant", content: response })
    );
  });

  it("should clear conversation history for a user", async () => {
    // Arrange
    const userId = "user123";

    jest.spyOn(redisClient, "del").mockResolvedValue(undefined);
    jest.spyOn(redisClient, "isHealthy").mockResolvedValue(true);

    // Act
    await conversationRepository.clearHistory(userId);

    // Assert
    expect(redisClient.del).toHaveBeenCalledWith("history:user123");
  });
});
