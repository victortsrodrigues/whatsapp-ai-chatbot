import messageBuffer from "../../utils/messageBuffer";
import conversationRepository from "../../repositories/conversationRepository";
import autoReplyService from "../../services/autoReplyService";
import { messageProcessingQueue } from "../../utils/queues";

jest.useFakeTimers();
describe("MessageBuffer", () => {
  it("should create a new buffer entry with timeout when adding a message for a new user", () => {
    // Mock dependencies
    jest.spyOn(conversationRepository, "getHistory").mockResolvedValue([]);
    jest.spyOn(autoReplyService, "isEnabled").mockReturnValue(true);
    jest.spyOn(messageProcessingQueue, "add").mockResolvedValue({} as any);

    // Setup
    const userId = "user123";
    const message = "Hello world";
    const timestamp = "2023-01-01T12:00:00Z";

    // Mock setTimeout
    const mockSetTimeout = jest
      .spyOn(global, "setTimeout")
      .mockReturnValue(123 as any);

    // Execute
    messageBuffer.addMessage(userId, message, timestamp);

    // Assert
    const buffers = (messageBuffer as any).buffers;
    expect(buffers.has(userId)).toBe(true);

    const buffer = buffers.get(userId);
    expect(buffer.userId).toBe(userId);
    expect(buffer.messages).toEqual([message]);
    expect(buffer.lastTimestamp).toBe(timestamp);
    expect(buffer.timeoutId).toBe(123);

    expect(mockSetTimeout).toHaveBeenCalledTimes(1);
    expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

    // Cleanup
    mockSetTimeout.mockRestore();
  });

  // Adding message when user already has a buffer clears previous timeout
  it("should clear previous timeout when adding a message for a user with existing buffer", () => {
    // Mock dependencies
    jest.spyOn(conversationRepository, "getHistory").mockResolvedValue([]);
    jest.spyOn(autoReplyService, "isEnabled").mockReturnValue(true);
    jest.spyOn(messageProcessingQueue, "add").mockResolvedValue({} as any);

    // Setup
    const userId = "user123";
    const message1 = "Hello";
    const message2 = "world";
    const combinedMessage = "Hello world";
    const timestamp1 = "2023-01-01T12:00:00Z";
    const timestamp2 = "2023-01-01T12:01:00Z";

    // Mock setTimeout and clearTimeout
    const mockSetTimeout = jest
      .spyOn(global, "setTimeout")
      .mockReturnValueOnce(123 as any)
      .mockReturnValueOnce(456 as any);
    const mockClearTimeout = jest.spyOn(global, "clearTimeout");

    // Add first message
    messageBuffer.addMessage(userId, message1, timestamp1);

    // Add second message
    messageBuffer.addMessage(userId, message2, timestamp2);

    // Assert
    const buffers = (messageBuffer as any).buffers;
    expect(buffers.has(userId)).toBe(true);

    const buffer = buffers.get(userId);
    expect(buffer.messages).toEqual([combinedMessage, message1, message2]);
    expect(buffer.lastTimestamp).toBe(timestamp2);
    expect(buffer.timeoutId).toBe(456);

    expect(mockClearTimeout).toHaveBeenCalledWith(123);
    expect(mockSetTimeout).toHaveBeenCalledTimes(2);

    // Cleanup
    mockSetTimeout.mockRestore();
    mockClearTimeout.mockRestore();
  });

  it("should not process messages if auto-reply is disabled for the user", async () => {
    // Arrange
    jest.spyOn(conversationRepository, "getHistory").mockResolvedValue([]);
    jest.spyOn(autoReplyService, "isEnabled").mockReturnValue(false);
    // Act
    messageBuffer.addMessage("user123", "Hello", "1234567890");
    // Assert
    expect(messageProcessingQueue.add).not.toHaveBeenCalled();
  });

  it("should reset timout when new messages arrive", async () => {
    // Mock dependencies
    jest.useFakeTimers();
    jest.spyOn(conversationRepository, "getHistory").mockResolvedValue([]);
    jest.spyOn(autoReplyService, "isEnabled").mockReturnValue(true);
    jest.spyOn(messageProcessingQueue, "add").mockResolvedValue({} as any);

    // Add first message
    messageBuffer.addMessage("user123", "Hello", "1234567890");

    // Advance time but not enough to trigger timeout
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    // Add second message
    messageBuffer.addMessage("user123", "I need help", "1234567891");

    // Advance time but not enough for the new timeout
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    expect(messageProcessingQueue.add).not.toHaveBeenCalled();

    // Advance time to trigger the timeout
    jest.advanceTimersByTime(3000);
    await Promise.resolve();

    // Now processing should have happened
    expect(messageProcessingQueue.add).toHaveBeenCalledWith(
      "process",
      expect.any(Object),
    );
  });
});
