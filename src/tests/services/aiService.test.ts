import axios from "axios";
import servicesInitialization from "../../utils/servicesInitialization";
import aiService from "../../services/aiService";
import { ConversationHistory } from "../../interfaces/index";
import logger from "../../utils/logger";

jest.mock("axios");
describe("AIService", () => {
  it("should successfully query AI service and return response", async () => {
    // Arrange
    jest.mock("axios");
    jest.spyOn(logger, "info").mockImplementation();
    jest
      .spyOn(servicesInitialization, "checkAIServiceHealth")
      .mockResolvedValue(true);

    const mockResponse = {
      status: 200,
      data: {
        response: "This is a valid AI response",
      },
    };

    (axios.post as jest.Mock).mockResolvedValueOnce(mockResponse);

    const query = "What is the weather today?";
    const userId = "user123";
    const history: ConversationHistory[] = [];

    // Act
    const result = await aiService.queryAI(query, userId, history);

    // Assert
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        query,
        user_id: userId,
        history,
        system_message: expect.any(String),
      },
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      })
    );

    expect(result).toEqual(mockResponse.data);
  });

  it("should throw ApiError when AI service returns non-200 status code", async () => {
    // Arrange
    jest.mock("axios");
    jest.spyOn(logger, "info").mockImplementation();
    jest
      .spyOn(servicesInitialization, "checkAIServiceHealth")
      .mockResolvedValue(true);

    const mockResponse = {
      status: 400,
      data: {
        message: "Bad request",
      },
    };

    (axios.post as jest.Mock).mockResolvedValueOnce(mockResponse);

    const query = "Invalid query";
    const userId = "user123";
    const history: ConversationHistory[] = [];

    // Act & Assert
    await expect(aiService.queryAI(query, userId, history)).rejects.toThrow(
      "AI service returned 400"
    );

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        query,
        user_id: userId,
        history,
        system_message: expect.any(String),
      },
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      })
    );
  });

  it("should throw error when AI service is not healthy", async () => {
    // Arrange
    jest
      .spyOn(servicesInitialization, "checkAIServiceHealth")
      .mockResolvedValue(false);

    const query = "What is the weather today?";
    const userId = "user123";
    const history: ConversationHistory[] = [];

    // Act & Assert
    await expect(aiService.queryAI(query, userId, history)).rejects.toThrow(
      "AI service is currently unavailable"
    );

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should handle empty response from AI service", async () => {
    // Arrange
    jest.mock("axios");

    jest
      .spyOn(servicesInitialization, "checkAIServiceHealth")
      .mockResolvedValue(true);

    const mockResponse = {
      status: 200,
      data: "",
    };

    (axios.post as jest.Mock).mockResolvedValueOnce(mockResponse);

    const query = "What is the weather today?";
    const userId = "user123";
    const history: ConversationHistory[] = [];

    // Act & Assert
    await expect(aiService.queryAI(query, userId, history)).rejects.toThrow(
      "Empty response from AI service"
    );

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        query,
        user_id: userId,
        history,
        system_message: expect.any(String),
      },
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      })
    );
  });

  it("should handle invalid response format from AI service", async () => {
    // Arrange
    jest.mock("axios");

    jest
      .spyOn(servicesInitialization, "checkAIServiceHealth")
      .mockResolvedValue(true);

    const mockResponse = {
      status: 200,
      data: {},
    };

    (axios.post as jest.Mock).mockResolvedValueOnce(mockResponse);

    const query = "What is the weather today?";
    const userId = "user123";
    const history: ConversationHistory[] = [];

    // Act & Assert
    await expect(aiService.queryAI(query, userId, history)).rejects.toThrow(
      "Invalid response format from AI service"
    );

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        query,
        user_id: userId,
        history,
        system_message: expect.any(String),
      },
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      })
    );
  });

  it('should return false when AI service is healthy', async () => {
    // Arrange
    jest.spyOn(axios, 'get').mockResolvedValueOnce({ status: 200 });
    jest.spyOn(servicesInitialization, "checkAIServiceHealth").mockResolvedValue(true);

    // Act
    const result = await aiService.checkHealth();

    // Assert
    expect(result).toBe(true);
  });

  it('should return false when AI service is unhealthy', async () => {
    // Arrange
    jest.spyOn(axios, 'get').mockResolvedValueOnce({ status: 503 });
    jest.spyOn(servicesInitialization, "checkAIServiceHealth").mockResolvedValue(false);

    // Act
    const result = await aiService.checkHealth();

    // Assert
    expect(result).toBe(false);
  });
});
